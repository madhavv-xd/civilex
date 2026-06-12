"""
FastAPI routes — all API endpoints.
"""
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from db.client import ping_db
from db.repositories import (
    create_simulation, get_simulation, update_sim_status,
    mark_sim_stopped, get_all_simulations, get_events_for_sim,
    get_all_turns, delete_simulation,
)
from models.simulation import SimConfig, SimStatus
from simulation.world_state import generate_world, world_snapshot_to_dict
from simulation.loop import run_simulation_loop
from api.sse import sse_manager, router as sse_router

router = APIRouter()
router.include_router(sse_router)


@router.get("/health")
async def health():
    db_ok = await ping_db()
    return {"status": "ok", "db": "connected" if db_ok else "unreachable"}


@router.get("/world/preview")
async def world_preview(grid_size: int = 15, seed: int | None = None):
    try:
        snapshot, civ_tiles = generate_world(grid_size=grid_size, seed=seed)
        world_dict = world_snapshot_to_dict(snapshot)
        civ_positions = {
            civ_id: [{"q": h.q, "r": h.r} for h in tiles]
            for civ_id, tiles in civ_tiles.items()
        }
        return {
            "grid_size": grid_size,
            "total_tiles": len(world_dict["tiles"]),
            "civ_starting_positions": civ_positions,
            "tile_type_distribution": _tile_distribution(world_dict["tiles"]),
            "world": world_dict,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StartSimRequest(BaseModel):
    grid_size: int = 15
    max_turns: int = 50
    civ_ids: list[str] = ["ironhold", "verdant", "merchants", "conclave"]


@router.post("/sim/start")
async def start_simulation(req: StartSimRequest, background_tasks: BackgroundTasks):
    try:
        config = SimConfig(
            max_turns=req.max_turns,
            grid_size=req.grid_size,
            civ_ids=req.civ_ids,
        )
        sim = await create_simulation(civ_ids=req.civ_ids, config=config)
        sim_id = str(sim.id)
        sse_manager.create_channel(sim_id)
        background_tasks.add_task(run_simulation_loop, sim_id)
        return {
            "sim_id": sim_id,
            "status": "running",
            "message": f"Simulation started. Connect to /api/sim/{sim_id}/stream to watch live.",
            "stream": f"/api/sim/{sim_id}/stream",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sim/{sim_id}/pause")
async def pause_simulation(sim_id: str):
    """Pause a running simulation — the loop holds after the current turn."""
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status != SimStatus.running:
        raise HTTPException(status_code=400, detail=f"Cannot pause a {sim.status.value} simulation")
    await update_sim_status(sim_id, SimStatus.paused)
    await sse_manager.publish(sim_id, {"type": "sim_paused", "turn": sim.turn})
    return {"sim_id": sim_id, "status": "paused"}


@router.post("/sim/{sim_id}/resume")
async def resume_simulation(sim_id: str):
    """Resume a paused simulation — the loop picks up on its next poll."""
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status != SimStatus.paused:
        raise HTTPException(status_code=400, detail=f"Cannot resume a {sim.status.value} simulation")
    await update_sim_status(sim_id, SimStatus.running)
    await sse_manager.publish(sim_id, {"type": "sim_resumed", "turn": sim.turn})
    return {"sim_id": sim_id, "status": "running"}


@router.post("/sim/{sim_id}/stop")
async def stop_simulation(sim_id: str):
    """Permanently stop a simulation — the loop exits after the current turn."""
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status in (SimStatus.completed, SimStatus.failed):
        raise HTTPException(status_code=400, detail="Simulation already finished")
    await mark_sim_stopped(sim_id)
    await sse_manager.publish(sim_id, {
        "type":            "sim_end",
        "turn":            sim.turn,
        "winner":          None,
        "winner_reason":   "stopped",
        "final_narrative": "The simulation was halted by the observer.",
    })
    return {"sim_id": sim_id, "status": "completed", "stopped": True}


@router.delete("/sim/{sim_id}")
async def delete_sim(sim_id: str):
    """Permanently delete a simulation and all its turns/events."""
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status == SimStatus.running:
        raise HTTPException(status_code=409, detail="Cannot delete a running simulation — stop it first")
    deleted = await delete_simulation(sim_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Delete failed")
    return {"sim_id": sim_id, "deleted": True}


@router.get("/sim/{sim_id}")
async def get_sim(sim_id: str):
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return {
        "sim_id": str(sim.id),
        "status": sim.status,
        "turn": sim.turn,
        "winner": sim.winner,
        "winner_reason": sim.winner_reason,
        "civ_ids": sim.civ_ids,
        "config": sim.config.model_dump(),
        "final_narrative": sim.final_narrative,
        "created_at": sim.created_at.isoformat(),
        "updated_at": sim.updated_at.isoformat(),
        "completed_at": sim.completed_at.isoformat() if sim.completed_at else None,
    }


@router.get("/sim/{sim_id}/events")
async def get_sim_events(sim_id: str, turn: int | None = None):
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if turn is not None:
        from db.repositories import get_events_for_turn
        events = await get_events_for_turn(sim_id, turn)
    else:
        events = await get_events_for_sim(sim_id)
    return {
        "sim_id": sim_id,
        "count": len(events),
        "events": [
            {"turn": e.turn, "type": e.type.value, "actor": e.actor,
             "target": e.target, "narrative": e.narrative}
            for e in events
        ],
    }


@router.get("/sim/{sim_id}/turns")
async def get_sim_turns(sim_id: str):
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    turns = await get_all_turns(sim_id)
    return {
        "sim_id": sim_id,
        "total_turns": len(turns),
        "turns": [{"turn": t.turn, "timestamp": t.timestamp.isoformat()} for t in turns],
    }


@router.get("/sims")
async def list_simulations():
    sims = await get_all_simulations(limit=20)
    return {
        "simulations": [
            {
                "sim_id": str(s.id),
                "status": s.status,
                "turn": s.turn,
                "winner": s.winner,
                "winner_reason": s.winner_reason,
                "civ_ids": s.civ_ids,
                "created_at": s.created_at.isoformat(),
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in sims
        ]
    }


def _tile_distribution(tiles: list[dict]) -> dict[str, int]:
    dist: dict[str, int] = {}
    for tile in tiles:
        t = tile["tile_type"]
        dist[t] = dist.get(t, 0) + 1
    return dict(sorted(dist.items()))


# ── Phase 6 endpoints ─────────────────────────────────────────────────────────

@router.get("/sim/{sim_id}/summary")
async def get_sim_summary(sim_id: str):
    """Get aggregated simulation stats."""
    from db.repositories.summary_repo import get_simulation_summary
    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    summary = await get_simulation_summary(sim_id)
    return {
        "sim_id":  sim_id,
        "winner":  sim.winner,
        "turn":    sim.turn,
        "status":  sim.status,
        **summary,
    }


@router.get("/sim/{sim_id}/export")
async def export_simulation(sim_id: str):
    """Export full simulation as JSON — all turns, events, civ states."""
    from fastapi.responses import JSONResponse
    from db.repositories.turn_repo import get_all_turns
    from db.repositories.event_repo import get_events_as_dicts

    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    turns  = await get_all_turns(sim_id)
    events = await get_events_as_dicts(sim_id)

    export_data = {
        "sim_id":           sim_id,
        "winner":           sim.winner,
        "winner_reason":    sim.winner_reason,
        "final_narrative":  sim.final_narrative,
        "total_turns":      sim.turn,
        "civ_ids":          sim.civ_ids,
        "created_at":       sim.created_at.isoformat(),
        "completed_at":     sim.completed_at.isoformat() if sim.completed_at else None,
        "turns": [
            {
                "turn":       t.turn,
                "timestamp":  t.timestamp.isoformat(),
                "tiles":      [tile.model_dump() for tile in t.world_snapshot.tiles],
                "civ_resources": {
                    k: v.model_dump()
                    for k, v in t.world_snapshot.civ_resources.items()
                },
            }
            for t in turns
        ],
        "events": events,
    }

    filename = f"civ-sim-{sim_id[:8]}-{sim.winner or 'draw'}.json"
    return JSONResponse(
        content=export_data,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/sim/{sim_id}/turn/{turn_num}")
async def get_sim_turn(sim_id: str, turn_num: int):
    """Get a specific turn's world snapshot — used by the replay scrubber."""
    from db.repositories.turn_repo import get_turn
    from db.repositories.event_repo import get_events_for_turn

    sim = await get_simulation(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    turn_doc = await get_turn(sim_id, turn_num)
    if not turn_doc:
        raise HTTPException(status_code=404, detail=f"Turn {turn_num} not found")

    events = await get_events_for_turn(sim_id, turn_num)

    return {
        "sim_id":  sim_id,
        "turn":    turn_num,
        "world_snapshot": {
            "tiles": [t.model_dump() for t in turn_doc.world_snapshot.tiles],
            "civ_resources": {
                k: v.model_dump()
                for k, v in turn_doc.world_snapshot.civ_resources.items()
            },
        },
        "events": [
            {
                "turn":      e.turn,
                "type":      e.type.value,
                "actor":     e.actor,
                "target":    e.target,
                "narrative": e.narrative,
                "data":      e.data,
            }
            for e in events
        ],
    }