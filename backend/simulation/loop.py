"""
LangGraph simulation loop.
Defines SimState and the full turn-cycle graph:
  increment_turn → run_civ_agents → run_world_engine → run_event_agent
  → run_narrator → refresh_memory → persist_turn → check_winner
  → (winner? END : back to increment_turn)
"""
import asyncio
import json
from functools import lru_cache
from pathlib import Path
from typing import TypedDict

from langgraph.graph import StateGraph, END

from config import settings
from agents.civ_agent import get_all_civ_decisions
from agents.world_engine import resolve_turn
from agents.event_agent import roll_world_event
from agents.narrator_agent import narrate_turn
from agents.memory_manager import refresh_all_memories, should_refresh
from simulation.judge import check_win
from simulation.world_state import generate_world, world_snapshot_to_dict
from simulation.civilizations import build_initial_civ_states
from db.repositories import (
    create_simulation, get_simulation, update_sim_turn,
    update_sim_status, set_sim_winner, mark_sim_stopped,
    save_turn, save_events, get_events_as_dicts,
)
from models.simulation import SimStatus, SimConfig
from models.civ_state import CivState, Resources


# How often the loop re-checks DB status while paused, and how long a sim may
# stay paused before it is auto-stopped (prevents zombie background tasks).
PAUSE_POLL_SECONDS = 1.0
PAUSE_TIMEOUT_SECONDS = 30 * 60

# Cap on events fed into memory compression so prompts stay bounded late-game
MEMORY_EVENT_WINDOW = 150

_CONFIGS_DIR = Path(__file__).resolve().parents[2] / "configs"


@lru_cache(maxsize=1)
def _load_world_params() -> dict:
    with open(_CONFIGS_DIR / "world_params.json") as f:
        return json.load(f)


# ── State definition ──────────────────────────────────────────────────────────

class SimState(TypedDict):
    sim_id:           str
    turn:             int
    max_turns:        int
    world_snapshot:   dict
    civ_states:       dict
    decisions:        dict
    events:           list
    world_event:      dict | None
    narrative:        str
    memory_summaries: dict
    winner:           str | None
    winner_reason:    str | None
    status:           str


# ── Helper: serialize CivState doc to dict ────────────────────────────────────

def _civ_doc_to_dict(state: CivState) -> dict:
    return {
        "civ_id":         state.civ_id,
        "name":           state.name,
        "traits":         state.traits,
        "resources":      state.resources.model_dump(),
        "tile_count":     state.tile_count,
        "is_alive":       state.is_alive,
        "relationships":  state.relationships,
        "memory_summary": state.memory_summary,
        "last_action":    state.last_action,
        "last_reasoning": state.last_reasoning,
    }


# ── Graph nodes ───────────────────────────────────────────────────────────────

async def increment_turn(state: SimState) -> SimState:
    sim_id = state["sim_id"]

    # Wait here while paused; exit the loop if stopped/failed externally.
    waited = 0.0
    announced_pause = False
    while True:
        sim = await get_simulation(sim_id)
        if not sim or sim.status in (SimStatus.completed, SimStatus.failed):
            return {**state, "status": "stopped"}
        if sim.status != SimStatus.paused:
            break
        if waited >= PAUSE_TIMEOUT_SECONDS:
            print(f"  ⏹ Pause timed out — stopping simulation {sim_id}")
            await mark_sim_stopped(sim_id)
            return {**state, "status": "stopped"}
        if not announced_pause:
            print(f"  ⏸ Simulation {sim_id} paused — waiting for resume...")
            announced_pause = True
        await asyncio.sleep(PAUSE_POLL_SECONDS)
        waited += PAUSE_POLL_SECONDS

    new_turn = state["turn"] + 1
    print(f"\n{'═'*50}")
    print(f"  Turn {new_turn} starting...")
    print(f"{'═'*50}")

    await update_sim_turn(sim_id, new_turn)

    return {**state, "turn": new_turn, "status": "running"}


async def run_civ_agents(state: SimState) -> SimState:
    if state.get("status") == "stopped":
        return state

    print(f"  🤖 Agents deciding (parallel)...")

    decisions = await get_all_civ_decisions(
        turn=state["turn"],
        civ_states=state["civ_states"],
        world_snapshot=state["world_snapshot"],
        memory_summaries=state.get("memory_summaries", {}),
    )

    for civ_id, d in decisions.items():
        action = d.get("action", "idle")
        target = d.get("target", "—")
        print(f"    [{civ_id}] {action} → {target}")

    return {**state, "decisions": decisions}


async def run_world_engine(state: SimState) -> SimState:
    if state.get("status") == "stopped":
        return state

    print(f"  ⚙️  World engine resolving...")

    world_params = _load_world_params()

    updated_states, updated_world, events = resolve_turn(
        turn=state["turn"],
        decisions=state["decisions"],
        civ_states=state["civ_states"],
        world_snapshot=state["world_snapshot"],
        world_params=world_params,
    )

    print(f"    {len(events)} events resolved")

    return {
        **state,
        "civ_states":     updated_states,
        "world_snapshot": updated_world,
        "events":         events,
    }


async def run_event_agent(state: SimState) -> SimState:
    if state.get("status") == "stopped":
        return state

    print(f"  🌪  Rolling for world event...")

    world_event = await roll_world_event(
        turn=state["turn"],
        world_snapshot=state["world_snapshot"],
        civ_states=state["civ_states"],
    )

    if world_event:
        event_type = world_event.get("type", "unknown")
        target     = world_event.get("target", "world")
        print(f"    Event fired: {event_type} → {target}")
    else:
        print(f"    No event this turn")

    return {**state, "world_event": world_event}


async def run_narrator(state: SimState) -> SimState:
    if state.get("status") == "stopped":
        return state

    print(f"  📜 Narrator writing...")

    narrative = await narrate_turn(
        turn=state["turn"],
        events=state["events"],
        world_event=state.get("world_event"),
    )

    print(f"    \"{narrative[:80]}...\"")

    return {**state, "narrative": narrative}


async def refresh_memory(state: SimState) -> SimState:
    if state.get("status") == "stopped":
        return state

    # Memory only compresses every COMPRESS_EVERY turns — skip the full
    # event-log fetch on all other turns.
    if not should_refresh(state["turn"]):
        return state

    event_log = await get_events_as_dicts(state["sim_id"])
    event_log = event_log[-MEMORY_EVENT_WINDOW:]

    summaries = await refresh_all_memories(
        turn=state["turn"],
        civ_states=state["civ_states"],
        event_log=event_log,
        existing_summaries=state.get("memory_summaries", {}),
    )

    return {**state, "memory_summaries": summaries}


async def persist_turn(state: SimState) -> SimState:
    if state.get("status") == "stopped":
        return state

    sim_id = state["sim_id"]
    turn   = state["turn"]

    # Combine regular events + world event
    all_events = list(state.get("events", []))
    if state.get("world_event"):
        all_events.append(state["world_event"])

    # Add narrator event
    if state.get("narrative"):
        all_events.append({
            "type":      "narrator",
            "actor":     None,
            "target":    None,
            "narrative": state["narrative"],
            "data":      {},
        })

    # Save to MongoDB
    await save_turn(sim_id, turn, state["world_snapshot"])
    await save_events(sim_id, turn, all_events)

    # Save updated civ states
    civ_docs = []
    for civ_id, civ_dict in state["civ_states"].items():
        decision = state.get("decisions", {}).get(civ_id, {})
        res = civ_dict.get("resources", {})
        civ_docs.append(CivState(
            sim_id=sim_id,
            turn=turn,
            civ_id=civ_id,
            name=civ_dict.get("name", civ_id),
            traits=civ_dict.get("traits", []),
            resources=Resources(
                gold=res.get("gold", 0),
                food=res.get("food", 0),
                stone=res.get("stone", 0),
                military=res.get("military", 0),
            ),
            tile_count=civ_dict.get("tile_count", 0),
            is_alive=civ_dict.get("is_alive", True),
            relationships=civ_dict.get("relationships", {}),
            memory_summary=state.get("memory_summaries", {}).get(civ_id, ""),
            last_action=decision.get("action"),
            last_reasoning=decision.get("reasoning"),
        ))
    if civ_docs:
        await CivState.insert_many(civ_docs)

    # Emit SSE event
    from api.sse import sse_manager
    await sse_manager.publish(sim_id, {
        "type":         "turn_complete",
        "turn":         turn,
        "narrative":    state.get("narrative", ""),
        "events":       all_events,
        "world_state":  state["world_snapshot"],
        "civ_states":   state["civ_states"],
        "winner":       state.get("winner"),
    })

    print(f"  💾 Turn {turn} saved to MongoDB + SSE emitted")

    return state


async def check_winner(state: SimState) -> SimState:
    if state.get("status") == "stopped":
        return state

    result = check_win(
        turn=state["turn"],
        civ_states=state["civ_states"],
        world_snapshot=state["world_snapshot"],
        max_turns=state.get("max_turns", 50),
    )

    if result:
        print(f"\n🏆 WINNER: {result.winner_id} ({result.win_type}) on turn {result.turn}")

        await set_sim_winner(
            sim_id=state["sim_id"],
            winner_id=result.winner_id,
            win_type=result.win_type,
            final_narrative=result.description,
        )

        from api.sse import sse_manager
        await sse_manager.publish(state["sim_id"], {
            "type":             "sim_end",
            "turn":             result.turn,
            "winner":           result.winner_id,
            "winner_reason":    result.win_type,
            "final_narrative":  result.description,
        })

        return {
            **state,
            "winner":        result.winner_id,
            "winner_reason": result.win_type,
        }

    return state


# ── Conditional edge ──────────────────────────────────────────────────────────

def should_continue(state: SimState) -> str:
    if state.get("winner"):
        return "end"
    if state.get("status") == "stopped":
        return "end"
    return "continue"


# ── Build the graph ───────────────────────────────────────────────────────────

def build_simulation_graph() -> StateGraph:
    graph = StateGraph(SimState)

    graph.add_node("increment_turn",  increment_turn)
    graph.add_node("run_civ_agents",  run_civ_agents)
    graph.add_node("run_world_engine",run_world_engine)
    graph.add_node("run_event_agent", run_event_agent)
    graph.add_node("run_narrator",    run_narrator)
    graph.add_node("refresh_memory",  refresh_memory)
    graph.add_node("persist_turn",    persist_turn)
    graph.add_node("check_winner",    check_winner)

    graph.set_entry_point("increment_turn")
    graph.add_edge("increment_turn",   "run_civ_agents")
    graph.add_edge("run_civ_agents",   "run_world_engine")
    graph.add_edge("run_world_engine", "run_event_agent")
    graph.add_edge("run_event_agent",  "run_narrator")
    graph.add_edge("run_narrator",     "refresh_memory")
    graph.add_edge("refresh_memory",   "persist_turn")
    graph.add_edge("persist_turn",     "check_winner")

    graph.add_conditional_edges(
        "check_winner",
        should_continue,
        {"continue": "increment_turn", "end": END},
    )

    return graph.compile()


# ── Entry point ───────────────────────────────────────────────────────────────

async def run_simulation_loop(sim_id: str) -> None:
    """
    Main entry point. Called as a background task from POST /api/sim/start.
    Builds initial state from MongoDB, runs the LangGraph loop until done.
    """
    print(f"\n🌍 Starting simulation {sim_id}")

    try:
        # Load simulation config
        sim = await get_simulation(sim_id)
        if not sim:
            print(f"  ❌ Simulation {sim_id} not found")
            return

        # Generate world
        snapshot, civ_tiles = generate_world(
            grid_size=sim.config.grid_size,
        )
        world_dict = world_snapshot_to_dict(snapshot)

        # Build initial civ states
        civ_docs = build_initial_civ_states(sim_id, civ_tiles)
        civ_states = {doc.civ_id: _civ_doc_to_dict(doc) for doc in civ_docs}

        # Save turn 0
        await save_turn(sim_id, 0, world_dict)

        # Build initial SimState
        initial_state: SimState = {
            "sim_id":           sim_id,
            "turn":             0,
            "max_turns":        sim.config.max_turns,
            "world_snapshot":   world_dict,
            "civ_states":       civ_states,
            "decisions":        {},
            "events":           [],
            "world_event":      None,
            "narrative":        "",
            "memory_summaries": {},
            "winner":           None,
            "winner_reason":    None,
            "status":           "running",
        }

        # Mark running once, here — turn updates never touch status again,
        # so a pause/stop from the API can't be overwritten by the loop.
        await update_sim_status(sim_id, SimStatus.running)

        # Emit sim_start event
        from api.sse import sse_manager
        await sse_manager.publish(sim_id, {
            "type":           "sim_start",
            "sim_id":         sim_id,
            "world_snapshot": world_dict,
            "civ_states":     civ_states,
        })

        # Compile and run the graph. Each turn is ~8 graph supersteps, so the
        # default recursion limit (25) would kill the sim after ~3 turns.
        graph = build_simulation_graph()
        await graph.ainvoke(
            initial_state,
            config={"recursion_limit": sim.config.max_turns * 10 + 50},
        )

        print(f"\n✅ Simulation {sim_id} complete")

    except Exception as e:
        print(f"  ❌ Simulation error: {e}")
        await update_sim_status(sim_id, SimStatus.failed)
        from api.sse import sse_manager
        await sse_manager.publish(sim_id, {
            "type":    "sim_error",
            "message": str(e),
        })
        raise
    finally:
        from api.sse import sse_manager
        sse_manager.close_channel(sim_id)