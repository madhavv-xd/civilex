"""
Loads civilization configs and builds initial CivState documents
for a new simulation run.
"""
import json
from pathlib import Path

from models.civ_state import CivState, Resources

_BASE = Path(__file__).resolve().parent.parent.parent
CIVS_CONFIG_PATH = _BASE / "configs" / "default_civs.json"


def load_civs_config() -> list[dict]:
    """Load raw civ config from JSON."""
    with open(CIVS_CONFIG_PATH) as f:
        return json.load(f)


def build_initial_civ_states(
    sim_id: str,
    civ_tiles: dict[str, list],  # civ_id → list of starting Hex
) -> list[CivState]:
    """
    Build turn-0 CivState documents for all 4 civs.
    Called once when a simulation starts.

    Args:
        sim_id: The MongoDB ID of the simulation run
        civ_tiles: Mapping from civ_id to their starting tile hexes

    Returns:
        List of CivState documents (not yet inserted to DB)
    """
    civs_cfg = load_civs_config()
    civ_ids  = [c["id"] for c in civs_cfg]
    states   = []

    for civ in civs_cfg:
        cid = civ["id"]
        sr  = civ["starting_resources"]

        # All relationships start neutral (0)
        relationships = {other: 0 for other in civ_ids if other != cid}

        state = CivState(
            sim_id=sim_id,
            turn=0,
            civ_id=cid,
            name=civ["name"],
            traits=civ["traits"],
            resources=Resources(
                gold=float(sr["gold"]),
                food=float(sr["food"]),
                stone=float(sr["stone"]),
                military=int(sr["military"]),
            ),
            tile_count=len(civ_tiles.get(cid, [])),
            is_alive=True,
            relationships=relationships,
            memory_summary="",
            last_action=None,
            last_reasoning=None,
        )
        states.append(state)

    return states


def get_civ_config(civ_id: str) -> dict | None:
    """Look up a single civ's config by ID."""
    for civ in load_civs_config():
        if civ["id"] == civ_id:
            return civ
    return None


def get_civ_personality(civ_id: str) -> str:
    """
    Return the personality string for use in agent system prompts.
    Returns empty string if civ not found.
    """
    civ = get_civ_config(civ_id)
    return civ["personality"] if civ else ""


def get_all_civ_ids() -> list[str]:
    return [c["id"] for c in load_civs_config()]