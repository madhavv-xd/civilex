"""
World state generator.
Builds a fresh 15×15 hex grid with tile types, resources, and civ starting positions.
"""
import json
import random
from pathlib import Path

from simulation.hex_grid import (
    Hex,
    generate_grid_coords,
    get_corner_hexes,
    hex_neighbors,
    hex_spiral,
)
from models.turn import TileSnapshot, WorldSnapshot, CivResourceSnapshot

# ── Config paths ──────────────────────────────────────────────────────────────
_BASE = Path(__file__).resolve().parent.parent.parent
WORLD_PARAMS_PATH = _BASE / "configs" / "world_params.json"
CIVS_CONFIG_PATH  = _BASE / "configs" / "default_civs.json"


def _load_world_params() -> dict:
    with open(WORLD_PARAMS_PATH) as f:
        return json.load(f)


def _load_civs_config() -> list[dict]:
    with open(CIVS_CONFIG_PATH) as f:
        return json.load(f)


# ── Tile type selection ───────────────────────────────────────────────────────

def _pick_tile_type(params: dict, rng: random.Random) -> str:
    """Weighted random tile type selection."""
    tile_types = params["tile_types"]
    types  = list(tile_types.keys())
    weights = [tile_types[t]["weight"] for t in types]
    return rng.choices(types, weights=weights, k=1)[0]


def _get_resource_yield(tile_type: str, params: dict) -> tuple[float, float, float]:
    """Return (food, gold, stone) yield for a tile type."""
    t = params["tile_types"][tile_type]
    return float(t["food"]), float(t["gold"]), float(t["stone"])


# ── Starting tile assignment ──────────────────────────────────────────────────

def _assign_starting_tiles(
    civ_id: str,
    corner: Hex,
    all_hex_set: set[Hex],
    already_owned: set[Hex],
    n: int = 3,
) -> list[Hex]:
    """
    Give a civ `n` contiguous starting tiles centred on its corner.
    Uses spiral expansion so tiles are always adjacent.
    """
    candidates = hex_spiral(corner, 2)
    assigned = []
    for h in candidates:
        if h in all_hex_set and h not in already_owned:
            assigned.append(h)
            if len(assigned) == n:
                break

    # Fallback: expand further if needed
    if len(assigned) < n:
        for h in hex_spiral(corner, 4):
            if h in all_hex_set and h not in already_owned and h not in assigned:
                assigned.append(h)
                if len(assigned) == n:
                    break

    return assigned


# ── Main world generator ──────────────────────────────────────────────────────

def generate_world(
    grid_size: int | None = None,
    seed: int | None = None,
) -> tuple[WorldSnapshot, dict[str, list[Hex]]]:
    """
    Generate a fresh world.

    Returns:
        world_snapshot: WorldSnapshot — ready to store in MongoDB
        civ_tiles: dict mapping civ_id → list of their starting Hex positions
    """
    params   = _load_world_params()
    civs_cfg = _load_civs_config()
    rng      = random.Random(seed)

    size = grid_size or params["grid_size"]
    all_coords   = generate_grid_coords(size)
    all_hex_set  = set(all_coords)
    corner_hexes = get_corner_hexes(size)

    # ── Assign starting tiles to each civ ────────────────────────────
    civ_tiles:  dict[str, list[Hex]] = {}
    already_owned: set[Hex] = set()

    for civ in civs_cfg:
        corner   = corner_hexes[civ["spawn_corner"]]
        tiles    = _assign_starting_tiles(
            civ["id"], corner, all_hex_set, already_owned,
            n=params["starting_tiles_per_civ"],
        )
        civ_tiles[civ["id"]] = tiles
        already_owned.update(tiles)

    # Build reverse lookup: Hex → civ_id
    hex_owner: dict[Hex, str] = {h: cid for cid, hs in civ_tiles.items() for h in hs}

    # ── Build tile snapshots ──────────────────────────────────────────
    tile_snapshots: list[TileSnapshot] = []

    for h in all_coords:
        tile_type = _pick_tile_type(params, rng)
        food, gold, stone = _get_resource_yield(tile_type, params)
        owner = hex_owner.get(h)

        tile_snapshots.append(TileSnapshot(
            q=h.q,
            r=h.r,
            tile_type=tile_type,
            owner=owner,
            food=food,
            gold=gold,
            stone=stone,
            has_unit=False,
        ))

    # ── Build per-civ resource snapshots ─────────────────────────────
    civ_resources: dict[str, CivResourceSnapshot] = {}

    for civ in civs_cfg:
        sr = civ["starting_resources"]
        civ_resources[civ["id"]] = CivResourceSnapshot(
            gold=float(sr["gold"]),
            food=float(sr["food"]),
            stone=float(sr["stone"]),
            military=int(sr["military"]),
            tile_count=len(civ_tiles[civ["id"]]),
        )

    world_snapshot = WorldSnapshot(
        tiles=tile_snapshots,
        civ_resources=civ_resources,
    )

    return world_snapshot, civ_tiles


def world_snapshot_to_dict(snapshot: WorldSnapshot) -> dict:
    """Serialize WorldSnapshot to a plain dict for API responses."""
    return {
        "tiles": [
            {
                "q":         t.q,
                "r":         t.r,
                "tile_type": t.tile_type,
                "owner":     t.owner,
                "food":      t.food,
                "gold":      t.gold,
                "stone":     t.stone,
                "has_unit":  t.has_unit,
            }
            for t in snapshot.tiles
        ],
        "civ_resources": {
            civ_id: {
                "gold":       r.gold,
                "food":       r.food,
                "stone":      r.stone,
                "military":   r.military,
                "tile_count": r.tile_count,
            }
            for civ_id, r in snapshot.civ_resources.items()
        },
    }