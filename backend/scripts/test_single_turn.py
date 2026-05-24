"""
Phase 3 smoke test — single turn end-to-end.
Run: uv run python scripts/test_single_turn.py

This runs ONE complete turn:
  1. Generate world
  2. Build initial civ states
  3. All 4 civ agents decide in parallel
  4. World engine resolves
  5. Event agent rolls
  6. Narrator writes lore
  7. Print everything
"""
import asyncio
import sys
import os
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db.client import connect_db, close_db
from simulation.world_state import generate_world, world_snapshot_to_dict
from simulation.civilizations import build_initial_civ_states
from agents.civ_agent import get_all_civ_decisions
from agents.world_engine import resolve_turn
from agents.event_agent import roll_world_event
from agents.narrator_agent import narrate_turn


def _civ_state_to_dict(state) -> dict:
    return {
        "civ_id":        state.civ_id,
        "name":          state.name,
        "traits":        state.traits,
        "resources":     state.resources.model_dump(),
        "tile_count":    state.tile_count,
        "is_alive":      state.is_alive,
        "relationships": state.relationships,
        "memory_summary": state.memory_summary,
    }


def print_divider(title: str = ""):
    line = "─" * 56
    if title:
        print(f"\n{line}")
        print(f"  {title}")
        print(f"{line}")
    else:
        print(f"\n{line}")


async def main():
    print("\n🌍 Phase 3 — Single Turn Test\n")

    print("🔌 Connecting to MongoDB (required for Beanie models)...")
    await connect_db()

    # ── 1. Generate world ──────────────────────────────────────────
    print_divider("1. Generating world (seed=42)")
    snapshot, civ_tiles = generate_world(grid_size=15, seed=42)
    world_dict = world_snapshot_to_dict(snapshot)
    print(f"  ✅ {len(world_dict['tiles'])} tiles generated")

    # ── 2. Build initial civ states ───────────────────────────────
    print_divider("2. Building initial civ states")
    civ_state_docs = build_initial_civ_states("test_sim", civ_tiles)
    civ_states = {s.civ_id: _civ_state_to_dict(s) for s in civ_state_docs}

    for civ_id, state in civ_states.items():
        res = state["resources"]
        print(f"  {civ_id:<12} gold={res['gold']:.0f}  food={res['food']:.0f}  "
              f"military={res['military']}  tiles={state['tile_count']}")

    # ── 3. Get all civ decisions in parallel ──────────────────────
    print_divider("3. Asking all civs for decisions (parallel API calls)")
    print("  Calling Claude API for each civilization...")

    decisions = await get_all_civ_decisions(
        turn=1,
        civ_states=civ_states,
        world_snapshot=world_dict,
        memory_summaries={},
    )

    print()
    for civ_id, decision in decisions.items():
        action  = decision.get("action", "?")
        target  = decision.get("target", "none")
        tone    = decision.get("tone", "?")
        reason  = decision.get("reasoning", "")[:80]
        print(f"  [{civ_id}]")
        print(f"    action:    {action}")
        print(f"    target:    {target}")
        print(f"    tone:      {tone}")
        print(f"    reasoning: {reason}...")
        print()

    # ── 4. World engine resolves ──────────────────────────────────
    print_divider("4. World engine resolving decisions")

    import json
    with open(os.path.join(os.path.dirname(__file__), "../../configs/world_params.json")) as f:
        world_params = json.load(f)

    updated_states, updated_world, events = resolve_turn(
        turn=1,
        decisions=decisions,
        civ_states=civ_states,
        world_snapshot=world_dict,
        world_params=world_params,
    )

    print(f"  ✅ {len(events)} events resolved\n")
    for event in events:
        actor  = event.get("actor", "world")
        etype  = event.get("type", "?")
        result = event.get("result", "")
        print(f"  [{actor}] {etype} → {result}")

    # ── 5. Updated civ states ─────────────────────────────────────
    print_divider("5. Updated civ states after resolution")
    for civ_id, state in updated_states.items():
        res = state["resources"]
        rel_str = ", ".join(
            f"{k}:{v}" for k, v in state.get("relationships", {}).items()
        )
        print(f"  {civ_id:<12} gold={res['gold']:.0f}  food={res['food']:.0f}  "
              f"military={res['military']}  tiles={state['tile_count']}")
        print(f"               relationships: {rel_str}")

    # ── 6. Event agent ────────────────────────────────────────────
    print_divider("6. Rolling for world event")
    world_event = await roll_world_event(
        turn=1,
        world_snapshot=updated_world,
        civ_states=updated_states,
        force=True,  # Force event for testing
    )

    if world_event:
        print(f"  🌪  Event fired: {world_event.get('type')}")
        print(f"      Target: {world_event.get('target', 'world')}")
        print(f"      Description: {world_event.get('narrative', '')}")
    else:
        print("  No world event this turn.")

    # ── 7. Narrator ───────────────────────────────────────────────
    print_divider("7. Narrator writing history")
    narrative = await narrate_turn(
        turn=1,
        events=events,
        world_event=world_event,
    )

    print(f"\n  📜 \"{narrative}\"\n")

    # ── Done ──────────────────────────────────────────────────────
    await close_db()
    print("🔌 MongoDB connection closed.")

    print("═" * 56)
    print("  ✅ Phase 3 single turn test passed!")
    print("  The agents are alive. History has begun.")
    print("═" * 56)
    print()


if __name__ == "__main__":
    asyncio.run(main())