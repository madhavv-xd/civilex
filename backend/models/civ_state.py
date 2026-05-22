from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import BaseModel, Field


class Resources(BaseModel):
    gold: float = 0
    food: float = 0
    stone: float = 0
    military: int = 0

    def __str__(self) -> str:
        g = int(self.gold) if self.gold.is_integer() else self.gold
        f = int(self.food) if self.food.is_integer() else self.food
        s = int(self.stone) if self.stone.is_integer() else self.stone
        return f"Resources(gold={g}, food={f}, stone={s}, military={self.military})"

    def __repr__(self) -> str:
        return self.__str__()



class CivState(Document):
    sim_id: str
    turn: int
    civ_id: str
    name: str
    traits: list[str] = Field(default_factory=list)
    resources: Resources = Field(default_factory=Resources)
    tile_count: int = 0
    is_alive: bool = True
    relationships: dict[str, int] = Field(default_factory=dict)
    memory_summary: str = ""
    last_action: Optional[str] = None
    last_reasoning: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "civ_states"