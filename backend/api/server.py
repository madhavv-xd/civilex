import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Windows consoles often default to cp1252 — the simulation loop's unicode
# log output would raise UnicodeEncodeError and kill the background task.
for _stream in (sys.stdout, sys.stderr):
    if _stream and hasattr(_stream, "reconfigure"):
        _stream.reconfigure(errors="replace")

from config import settings
from db.client import connect_db, close_db
from db.indexes import create_indexes
from api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    await create_indexes()
    print("[SUCCESS] MongoDB connected")
    yield
    # Shutdown
    await close_db()
    print("[INFO] MongoDB disconnected")


app = FastAPI(
    title="AI Civilization Simulator",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.server:app", host="0.0.0.0", port=8000, reload=True)