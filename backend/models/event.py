from datetime import datetime
from enum import Enum
from typing import Optional, Any
from beanie import Document
from pydantic import Field


class EventType(str, Enum):
    # Civ actions
    war_declaration = "war_declaration"
    peace_treaty = "peace_treaty"
    trade_offer = "trade_offer"
    trade_accepted = "trade_accepted"
    trade_rejected = "trade_rejected"
    alliance_formed = "alliance_formed"
    alliance_broken = "alliance_broken"
    territory_captured = "territory_captured"
    build_infrastructure = "build_infrastructure"
    civ_idle = "civ_idle"

    # World events
    drought = "drought"
    plague = "plague"
    gold_discovery = "gold_discovery"
    natural_disaster = "natural_disaster"
    ancient_ruins_found = "ancient_ruins_found"
    rebellion = "rebellion"

    # System
    narrator = "narrator"
    turn_start = "turn_start"
    sim_start = "sim_start"
    sim_end = "sim_end"
    civ_eliminated = "civ_eliminated"


class Event(Document):
    sim_id: str
    turn: int
    type: EventType
    actor: Optional[str] = None
    target: Optional[str] = None
    narrative: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "events"