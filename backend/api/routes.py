from fastapi import APIRouter
from db.client import ping_db

router = APIRouter()


@router.get("/health")
async def health():
    db_ok = await ping_db()
    return {
        "status": "ok",
        "db": "connected" if db_ok else "unreachable",
    }