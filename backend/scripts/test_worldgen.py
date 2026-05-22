"""
Phase 2 smoke test — world generation.
Run: uv run python scripts/test_world_gen.py
"""
import asyncio
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db.client import connect_db, close_db
from simulation.world_state import generate_world
from simulation.civilizations import build_initial_civ_states, load_civs_config
from simulation.hex_grid import hex_distance, Hex


def print_section(title: str):
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


async def main():
    print("\n🌍 Phase 2 — World Generation Test\n")
    print("🔌 Connecting to MongoDB (required for Beanie models)...")
    await connect_db()

    # ── Generate world ────────────────────────────────────────────────
    print_section("1. Generating 15×15 world (seed=42)")
    snapshot, civ_tiles = generate_world(grid_size=15, seed=42)

    total_tiles = len(snapshot.tiles)
    print(f"  ✅ Total tiles generated: {total_tiles}")
    assert total_tiles == 225, f"Expected 225 tiles, got {total_tiles}"

    # ── Tile type distribution ────────────────────────────────────────
    print_section("2. Tile type distribution")
    dist: dict[str, int] = {}
    for tile in snapshot.tiles:
        dist[tile.tile_type] = dist.get(tile.tile_type, 0) + 1
    for tile_type, count in sorted(dist.items()):
        bar = "█" * (count // 3)
        print(f"  {tile_type:<12} {count:>3}  {bar}")

    # ── Civ starting positions ────────────────────────────────────────
    print_section("3. Civilization starting positions")
    civs_cfg = {c["id"]: c["name"] for c in load_civs_config()}

    all_owned: list[Hex] = []
    for civ_id, tiles in civ_tiles.items():
        print(f"\n  {civs_cfg[civ_id]} ({civ_id})")
        for h in tiles:
            print(f"    tile: q={h.q:>3}, r={h.r:>3}")
        all_owned.extend(tiles)

    # No tile overlap
    assert len(all_owned) == len(set(all_owned)), "❌ Tile overlap detected!"
    print(f"\n  ✅ No tile overlap — all {len(all_owned)} starting tiles are unique")

    # ── Civ resources ─────────────────────────────────────────────────
    print_section("4. Starting resources")
    for civ_id, res in snapshot.civ_resources.items():
        print(f"  {civ_id:<12} gold={res.gold:>5.0f}  food={res.food:>5.0f}  "
              f"stone={res.stone:>5.0f}  military={res.military:>3}  "
              f"tiles={res.tile_count}")

    # ── Build initial CivState documents ─────────────────────────────
    print_section("5. Building initial CivState documents")
    civ_states = build_initial_civ_states(sim_id="test_sim_id", civ_tiles=civ_tiles)
    assert len(civ_states) == 4
    for state in civ_states:
        print(f"  ✅ {state.civ_id:<12}  relationships: {state.relationships}")

    # ── Distance check between corners ───────────────────────────────
    print_section("6. Corner distance sanity check")
    civ_list = list(civ_tiles.items())
    if len(civ_list) >= 2:
        (id_a, tiles_a), (id_b, tiles_b) = civ_list[0], civ_list[1]
        d = hex_distance(tiles_a[0], tiles_b[0])
        print(f"  Distance between {id_a} and {id_b} starting tiles: {d} steps")
        assert d > 5, f"Civs are too close! Distance = {d}"
        print(f"  ✅ Civs are well-separated (>{5} steps apart)")

    await close_db()
    print("\n🔌 MongoDB connection closed.")

    print(f"\n{'═' * 50}")
    print(f"  ✅ Phase 2 world generation test passed!")
    print(f"{'═' * 50}\n")


if __name__ == "__main__":
    asyncio.run(main())