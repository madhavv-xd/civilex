from datetime import datetime
from enum import Enum
from typing import Optional
from beanie import Document
from pydantic import BaseModel, Field


class SimStatus(str, Enum):
    pending = "pending"
    running = "running"
    paused = "paused"
    completed = "completed"
    failed = "failed"


class SimConfig(BaseModel):
    max_turns: int = 50
    grid_size: int = 15
    turn_delay_ms: int = 0
    civ_ids: list[str] = Field(default_factory=list)


class Simulation(Document):
    status: SimStatus = SimStatus.pending
    turn: int = 0
    winner: Optional[str] = None
    winner_reason: Optional[str] = None
    civ_ids: list[str] = Field(default_factory=list)
    config: SimConfig = Field(default_factory=SimConfig)
    final_narrative: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    class Settings:
        name = "simulations"