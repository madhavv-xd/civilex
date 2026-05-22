from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import BaseModel, Field


class TileSnapshot(BaseModel):
    q: int
    r: int
    tile_type: str
    owner: Optional[str] = None
    food: float = 0
    gold: float = 0
    stone: float = 0
    has_unit: bool = False


class CivResourceSnapshot(BaseModel):
    gold: float = 0
    food: float = 0
    stone: float = 0
    military: int = 0
    tile_count: int = 0


class WorldSnapshot(BaseModel):
    tiles: list[TileSnapshot] = Field(default_factory=list)
    civ_resources: dict[str, CivResourceSnapshot] = Field(default_factory=dict)


class Turn(Document):
    sim_id: str
    turn: int
    world_snapshot: WorldSnapshot = Field(default_factory=WorldSnapshot)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "turns"