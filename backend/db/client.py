from pymongo import AsyncMongoClient
from beanie import init_beanie

from config import settings
from models.simulation import Simulation
from models.turn import Turn
from models.event import Event
from models.civ_state import CivState

_client: AsyncMongoClient | None = None


async def connect_db() -> None:
    global _client
    _client = AsyncMongoClient(settings.mongodb_url)
    await init_beanie(
        database=_client[settings.mongodb_db],
        document_models=[Simulation, Turn, Event, CivState],
    )


async def close_db() -> None:
    if _client:
        await _client.close()


async def ping_db() -> bool:
    try:
        if _client is None:
            return False
        await _client.admin.command("ping")
        return True
    except Exception:
        return False