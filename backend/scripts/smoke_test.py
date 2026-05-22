"""
Smoke test for Phase 1.
Run: uv run python scripts/smoke_test.py
"""
import asyncio
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db.client import connect_db, close_db, ping_db
from models import Simulation, SimConfig, CivState, Resources, Event, EventType, Turn


async def main():
    print("🔌 Connecting to MongoDB...")
    await connect_db()

    print("📡 Pinging DB...")
    ok = await ping_db()
    assert ok, "❌ DB ping failed — is MongoDB running?"
    print("✅ DB ping ok\n")

    # ── Insert a test simulation ──────────────────────────────────────
    print("📝 Inserting test Simulation...")
    sim = Simulation(
        civ_ids=["ironhold", "verdant", "merchants", "conclave"],
        config=SimConfig(civ_ids=["ironhold", "verdant", "merchants", "conclave"]),
    )
    await sim.insert()
    print(f"   id: {sim.id}  status: {sim.status.value}\n")

    # ── Insert a test CivState ────────────────────────────────────────
    print("🏰 Inserting test CivState...")
    civ = CivState(
        sim_id=str(sim.id),
        turn=0,
        civ_id="ironhold",
        name="The Ironhold Confederacy",
        traits=["militaristic", "proud"],
        resources=Resources(gold=100, food=60, stone=80, military=85),
        tile_count=3,
    )
    await civ.insert()
    print(f"   civ_id: {civ.civ_id}  resources: {civ.resources}\n")

    # ── Insert a test Event ───────────────────────────────────────────
    print("📣 Inserting test Event...")
    event = Event(
        sim_id=str(sim.id),
        turn=0,
        type=EventType.sim_start,
        narrative="The age of civilizations begins.",
    )
    await event.insert()
    print(f"   type: {event.type.value}  narrative: {event.narrative}\n")

    # ── Query back ────────────────────────────────────────────────────
    print("🔍 Querying back...")
    fetched = await Simulation.get(sim.id)
    assert fetched is not None
    print(f"   fetched sim: {fetched.id}  civ_ids: {fetched.civ_ids}\n")

    # ── Cleanup ───────────────────────────────────────────────────────
    await sim.delete()
    await civ.delete()
    await event.delete()
    print("🧹 Test documents cleaned up\n")

    await close_db()
    print("✅ Phase 1 smoke test passed — all models working correctly.")


if __name__ == "__main__":
    asyncio.run(main())