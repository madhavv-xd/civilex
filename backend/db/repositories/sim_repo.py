"""
Simulation repository — clean data access for Simulation documents.
"""
from datetime import datetime
from bson import ObjectId

from models.simulation import Simulation, SimStatus, SimConfig


async def create_simulation(
    civ_ids: list[str],
    config: SimConfig | None = None,
) -> Simulation:
    """Create and insert a new simulation document."""
    sim = Simulation(
        civ_ids=civ_ids,
        config=config or SimConfig(civ_ids=civ_ids),
        status=SimStatus.pending,
    )
    await sim.insert()
    return sim


async def get_simulation(sim_id: str) -> Simulation | None:
    """Fetch a simulation by ID."""
    try:
        return await Simulation.get(sim_id)
    except Exception:
        return None


def _oid(sim_id: str) -> ObjectId | None:
    try:
        return ObjectId(sim_id)
    except Exception:
        return None


async def _set_fields(sim_id: str, fields: dict) -> None:
    """Atomic $set on a simulation — never clobbers fields written concurrently
    (e.g. a pause/stop issued from the API while the loop updates the turn)."""
    oid = _oid(sim_id)
    if oid is None:
        return
    fields["updated_at"] = datetime.utcnow()
    await Simulation.find_one(Simulation.id == oid).update({"$set": fields})


async def update_sim_turn(sim_id: str, turn: int) -> None:
    """Update the current turn counter."""
    await _set_fields(sim_id, {"turn": turn})


async def update_sim_status(sim_id: str, status: SimStatus) -> None:
    """Update simulation status."""
    await _set_fields(sim_id, {"status": status})


async def mark_sim_stopped(sim_id: str) -> None:
    """Terminal stop requested by the user — completed with no winner."""
    await _set_fields(sim_id, {
        "status": SimStatus.completed,
        "winner_reason": "stopped",
        "completed_at": datetime.utcnow(),
    })


async def set_sim_winner(
    sim_id: str,
    winner_id: str,
    win_type: str,
    final_narrative: str,
) -> None:
    """Mark a simulation as complete with a winner."""
    await _set_fields(sim_id, {
        "winner": winner_id,
        "winner_reason": win_type,
        "final_narrative": final_narrative,
        "status": SimStatus.completed,
        "completed_at": datetime.utcnow(),
    })


async def get_all_simulations(limit: int = 20) -> list[Simulation]:
    """Fetch recent simulations for the history page."""
    return await Simulation.find_all().sort("-created_at").limit(limit).to_list()


async def is_sim_paused(sim_id: str) -> bool:
    """Check if a simulation has been paused/stopped."""
    sim = await get_simulation(sim_id)
    if not sim:
        return True
    return sim.status in (SimStatus.paused, SimStatus.completed, SimStatus.failed)


async def delete_simulation(sim_id: str) -> bool:
    """Delete a simulation and all its associated data. Returns True if deleted."""
    sim = await get_simulation(sim_id)
    if not sim:
        return False

    # Access the underlying motor database via Beanie's collection
    db = Simulation.get_pymongo_collection().database
    await db["turns"].delete_many({"sim_id": sim_id})
    await db["events"].delete_many({"sim_id": sim_id})
    await db["civ_states"].delete_many({"sim_id": sim_id})

    # Delete the simulation document itself via Beanie
    await sim.delete()
    return True