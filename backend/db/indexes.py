from pymongo import ASCENDING


async def create_indexes() -> None:
    from models.simulation import Simulation
    from models.turn import Turn
    from models.event import Event
    from models.civ_state import CivState

    await Simulation.get_pymongo_collection().create_index(
        [("status", ASCENDING), ("created_at", ASCENDING)]
    )
    await Turn.get_pymongo_collection().create_index(
        [("sim_id", ASCENDING), ("turn", ASCENDING)], unique=True
    )
    await Event.get_pymongo_collection().create_index(
        [("sim_id", ASCENDING), ("turn", ASCENDING)]
    )
    await CivState.get_pymongo_collection().create_index(
        [("sim_id", ASCENDING), ("turn", ASCENDING), ("civ_id", ASCENDING)],
        unique=True,
    )