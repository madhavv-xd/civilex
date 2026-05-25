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


async def update_sim_turn(sim_id: str, turn: int) -> None:
    """Update the current turn counter."""
    sim = await get_simulation(sim_id)
    if sim:
        sim.turn = turn
        sim.updated_at = datetime.utcnow()
        await sim.save()


async def update_sim_status(sim_id: str, status: SimStatus) -> None:
    """Update simulation status."""
    sim = await get_simulation(sim_id)
    if sim:
        sim.status = status
        sim.updated_at = datetime.utcnow()
        await sim.save()


async def set_sim_winner(
    sim_id: str,
    winner_id: str,
    win_type: str,
    final_narrative: str,
) -> None:
    """Mark a simulation as complete with a winner."""
    sim = await get_simulation(sim_id)
    if sim:
        sim.winner = winner_id
        sim.winner_reason = win_type
        sim.final_narrative = final_narrative
        sim.status = SimStatus.completed
        sim.completed_at = datetime.utcnow()
        sim.updated_at = datetime.utcnow()
        await sim.save()


async def get_all_simulations(limit: int = 20) -> list[Simulation]:
    """Fetch recent simulations for the history page."""
    return await Simulation.find_all().sort("-created_at").limit(limit).to_list()


async def is_sim_paused(sim_id: str) -> bool:
    """Check if a simulation has been paused/stopped."""
    sim = await get_simulation(sim_id)
    if not sim:
        return True
    return sim.status in (SimStatus.paused, SimStatus.completed, SimStatus.failed)