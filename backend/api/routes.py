from fastapi import APIRouter, HTTPException
from db.client import ping_db
from simulation.world_state import generate_world, world_snapshot_to_dict

router = APIRouter()


@router.get("/health")
async def health():
    db_ok = await ping_db()
    return {
        "status": "ok",
        "db": "connected" if db_ok else "unreachable",
    }


@router.get("/world/preview")
async def world_preview(grid_size: int = 15, seed: int | None = None):
    """
    Generate and return a fresh world without saving to DB.
    Useful for verifying world generation before wiring up the frontend map.
    """
    try:
        snapshot, civ_tiles = generate_world(grid_size=grid_size, seed=seed)
        world_dict = world_snapshot_to_dict(snapshot)

        # Add civ tile positions for debugging
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


def _tile_distribution(tiles: list[dict]) -> dict[str, int]:
    dist: dict[str, int] = {}
    for tile in tiles:
        t = tile["tile_type"]
        dist[t] = dist.get(t, 0) + 1
    return dict(sorted(dist.items()))