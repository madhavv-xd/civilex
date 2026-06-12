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
        # Last world-bearing payload per sim, replayed to late subscribers so
        # a page refresh mid-sim shows the map immediately instead of waiting
        # for the next turn.
        self._last_snapshot: dict[str, dict] = {}

    def create_channel(self, sim_id: str) -> None:
        """Create a new channel for a simulation."""
        if sim_id not in self._queues:
            self._queues[sim_id] = []

    async def publish(self, sim_id: str, payload: dict) -> None:
        """Push a payload to all listeners for a simulation."""
        if payload.get("type") in ("sim_start", "turn_complete"):
            self._last_snapshot[sim_id] = payload
        for queue in self._queues.get(sim_id, []):
            await queue.put(payload)

    async def subscribe(self, sim_id: str) -> AsyncIterator[dict]:
        """Subscribe to a simulation's event stream."""
        queue: asyncio.Queue = asyncio.Queue()
        self._queues.setdefault(sim_id, []).append(queue)

        try:
            last = self._last_snapshot.get(sim_id)
            if last is not None:
                yield last
            while True:
                payload = await queue.get()
                yield payload
                # Stop streaming when simulation ends
                if payload.get("type") in ("sim_end", "sim_error"):
                    break
        finally:
            listeners = self._queues.get(sim_id)
            if listeners is not None:
                if queue in listeners:
                    listeners.remove(queue)
                if not listeners:
                    self._queues.pop(sim_id, None)

    def close_channel(self, sim_id: str) -> None:
        """Close all listeners for a finished simulation."""
        self._queues.pop(sim_id, None)
        self._last_snapshot.pop(sim_id, None)


# Global singleton
sse_manager = SseManager()


@router.get("/sim/{sim_id}/stream")
async def stream_simulation(sim_id: str):
    """
    SSE endpoint — streams turn events for a running simulation.
    Connect once and receive JSON events as each turn completes.
    """
    from db.repositories import get_simulation
    from models.simulation import SimStatus

    sim = await get_simulation(sim_id)

    # A finished sim has no live channel — emit its terminal event right away
    # instead of leaving the client hanging on an empty stream.
    if sim and sim.status in (SimStatus.completed, SimStatus.failed):
        async def finished_generator():
            if sim.status == SimStatus.failed:
                payload = {"type": "sim_error", "message": "Simulation failed"}
            else:
                payload = {
                    "type":            "sim_end",
                    "turn":            sim.turn,
                    "winner":          sim.winner,
                    "winner_reason":   sim.winner_reason,
                    "final_narrative": sim.final_narrative,
                }
            yield {"event": payload["type"], "data": json.dumps(payload)}

        return EventSourceResponse(finished_generator())

    async def event_generator():
        async for payload in sse_manager.subscribe(sim_id):
            yield {
                "event": payload.get("type", "message"),
                "data": json.dumps(payload),
            }

    return EventSourceResponse(event_generator())
