"""
Turn repository — save and query turn snapshots.
"""
from models.turn import Turn, WorldSnapshot, TileSnapshot, CivResourceSnapshot


def _dict_to_world_snapshot(world_dict: dict) -> WorldSnapshot:
    """Convert raw world dict to WorldSnapshot model."""
    tiles = [
        TileSnapshot(
            q=t["q"], r=t["r"],
            tile_type=t["tile_type"],
            owner=t.get("owner"),
            food=t.get("food", 0),
            gold=t.get("gold", 0),
            stone=t.get("stone", 0),
            has_unit=t.get("has_unit", False),
        )
        for t in world_dict.get("tiles", [])
    ]
    civ_resources = {
        civ_id: CivResourceSnapshot(
            gold=r.get("gold", 0),
            food=r.get("food", 0),
            stone=r.get("stone", 0),
            military=r.get("military", 0),
            tile_count=r.get("tile_count", 0),
        )
        for civ_id, r in world_dict.get("civ_resources", {}).items()
    }
    return WorldSnapshot(tiles=tiles, civ_resources=civ_resources)


async def save_turn(
    sim_id: str,
    turn: int,
    world_snapshot_dict: dict,
) -> Turn:
    """Save a turn snapshot to MongoDB."""
    snapshot = _dict_to_world_snapshot(world_snapshot_dict)
    turn_doc = Turn(
        sim_id=sim_id,
        turn=turn,
        world_snapshot=snapshot,
    )
    await turn_doc.insert()
    return turn_doc


async def get_turn(sim_id: str, turn: int) -> Turn | None:
    """Fetch a specific turn snapshot."""
    return await Turn.find_one(
        Turn.sim_id == sim_id,
        Turn.turn == turn,
    )


async def get_all_turns(sim_id: str) -> list[Turn]:
    """Fetch all turns for a simulation (for replay)."""
    return await Turn.find(Turn.sim_id == sim_id).sort("+turn").to_list()