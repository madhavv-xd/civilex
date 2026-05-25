"""
SSE manager — in-memory pub/sub for streaming simulation turn events.
Each simulation gets its own asyncio.Queue.
Clients connect to GET /api/sim/{id}/stream and receive events as they fire.
"""
import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()


class SseManager:
    def __init__(self):
        self._queues: dict[str, list[asyncio.Queue]] = {}

    def create_channel(self, sim_id: str) -> None:
        """Create a new channel for a simulation."""
        if sim_id not in self._queues:
            self._queues[sim_id] = []

    async def publish(self, sim_id: str, payload: dict) -> None:
        """Push a payload to all listeners for a simulation."""
        if sim_id not in self._queues:
            return
        for queue in self._queues[sim_id]:
            await queue.put(payload)

    async def subscribe(self, sim_id: str) -> AsyncIterator[dict]:
        """Subscribe to a simulation's event stream."""
        queue: asyncio.Queue = asyncio.Queue()

        if sim_id not in self._queues:
            self._queues[sim_id] = []
        self._queues[sim_id].append(queue)

        try:
            while True:
                payload = await queue.get()
                yield payload
                # Stop streaming when simulation ends
                if payload.get("type") in ("sim_end", "sim_error"):
                    break
        finally:
            self._queues[sim_id].remove(queue)
            if not self._queues[sim_id]:
                del self._queues[sim_id]

    def close_channel(self, sim_id: str) -> None:
        """Close all listeners for a finished simulation."""
        self._queues.pop(sim_id, None)


# Global singleton
sse_manager = SseManager()


@router.get("/sim/{sim_id}/stream")
async def stream_simulation(sim_id: str):
    """
    SSE endpoint — streams turn events for a running simulation.
    Connect once and receive JSON events as each turn completes.
    """
    async def event_generator():
        async for payload in sse_manager.subscribe(sim_id):
            yield {
                "event": payload.get("type", "message"),
                "data": json.dumps(payload),
            }

    return EventSourceResponse(event_generator())