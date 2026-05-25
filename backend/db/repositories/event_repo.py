"""
Event repository — save and query simulation events.
"""
from models.event import Event, EventType


def _safe_event_type(type_str: str) -> EventType:
    """Safely convert string to EventType, falling back to civ_idle."""
    try:
        return EventType(type_str)
    except ValueError:
        return EventType.civ_idle


async def save_events(
    sim_id: str,
    turn: int,
    events: list[dict],
) -> list[Event]:
    """Bulk insert events for a turn."""
    docs = []
    for e in events:
        doc = Event(
            sim_id=sim_id,
            turn=turn,
            type=_safe_event_type(e.get("type", "civ_idle")),
            actor=e.get("actor"),
            target=e.get("target"),
            narrative=e.get("narrative"),
            data=e.get("data", {}),
        )
        docs.append(doc)

    if docs:
        await Event.insert_many(docs)
    return docs


async def get_events_for_turn(sim_id: str, turn: int) -> list[Event]:
    """Fetch all events for a specific turn."""
    return await Event.find(
        Event.sim_id == sim_id,
        Event.turn == turn,
    ).sort("+timestamp").to_list()


async def get_events_for_sim(sim_id: str) -> list[Event]:
    """Fetch full event log for a simulation."""
    return await Event.find(
        Event.sim_id == sim_id,
    ).sort("+turn").to_list()


async def get_events_as_dicts(sim_id: str) -> list[dict]:
    """Fetch full event log as plain dicts for agent memory."""
    events = await get_events_for_sim(sim_id)
    return [
        {
            "turn":      e.turn,
            "type":      e.type.value,
            "actor":     e.actor,
            "target":    e.target,
            "narrative": e.narrative,
            "data":      e.data,
        }
        for e in events
    ]