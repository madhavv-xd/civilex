"""
Summary repository — aggregates simulation stats from events collection.
"""
from models.event import EventType
from db.repositories.event_repo import get_events_for_sim


async def get_simulation_summary(sim_id: str) -> dict:
    """
    Aggregate full simulation stats from the event log.
    Returns a summary dict for the frontend summary card.
    """
    events = await get_events_for_sim(sim_id)

    wars            = 0
    alliances       = 0
    alliances_broken= 0
    trades_accepted = 0
    trades_rejected = 0
    captures        = 0
    world_events    = 0
    eliminations    = 0
    infrastructure  = 0

    for e in events:
        t = e.type
        if t == EventType.war_declaration:       wars += 1
        elif t == EventType.alliance_formed:     alliances += 1
        elif t == EventType.alliance_broken:     alliances_broken += 1
        elif t == EventType.trade_accepted:      trades_accepted += 1
        elif t == EventType.trade_rejected:      trades_rejected += 1
        elif t == EventType.territory_captured:  captures += 1
        elif t == EventType.civ_eliminated:      eliminations += 1
        elif t == EventType.build_infrastructure:infrastructure += 1
        elif t in (
            EventType.drought, EventType.plague,
            EventType.gold_discovery, EventType.natural_disaster,
            EventType.ancient_ruins_found, EventType.rebellion,
        ):
            world_events += 1

    return {
        "total_events":       len(events),
        "wars_declared":      wars,
        "alliances_formed":   alliances,
        "alliances_broken":   alliances_broken,
        "trades_accepted":    trades_accepted,
        "trades_rejected":    trades_rejected,
        "territory_captures": captures,
        "world_events":       world_events,
        "civilizations_eliminated": eliminations,
        "infrastructure_built": infrastructure,
    }