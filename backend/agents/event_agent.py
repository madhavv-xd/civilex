"""
Event agent — rolls each turn for a random world event.
20% chance per turn. Uses an LLM to pick the most dramatically interesting event.
"""
import json
import random
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import settings
from utils.prompt_builder import (
    load_template,
    build_event_agent_user_message,
)

_llm = ChatOpenAI(
    model=settings.openrouter_model,
    openai_api_key=settings.openrouter_api_key,
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=256,
)

EVENT_CHANCE = 0.20

VALID_EVENT_TYPES = {
    "drought", "plague", "gold_discovery",
    "natural_disaster", "ancient_ruins_found", "rebellion",
}


async def roll_world_event(
    turn: int,
    world_snapshot: dict,
    civ_states: dict,
    force: bool = False,
) -> dict | None:
    """
    Roll for a world event this turn.

    Args:
        turn: current turn number
        world_snapshot: current world state
        civ_states: current civ states
        force: if True, always fire an event (for testing)

    Returns:
        event dict if an event fired, None otherwise
    """
    if not force and random.random() > EVENT_CHANCE:
        return None

    system_prompt = load_template("event_agent.txt")
    user_message  = build_event_agent_user_message(turn, world_snapshot, civ_states)

    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]
        response = await _llm.ainvoke(messages)
        raw  = response.content.strip()
        data = _parse_event(raw)

        if data:
            return _apply_event(data, civ_states, world_snapshot, turn)

    except Exception as e:
        print(f"  [event_agent] Error: {e}")

    return None


def _parse_event(raw: str) -> dict | None:
    try:
        text = raw
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        data = json.loads(text)

        if data.get("event_type") not in VALID_EVENT_TYPES:
            print(f"  [event_agent] Invalid event type: {data.get('event_type')}")
            return None

        return data

    except (json.JSONDecodeError, KeyError) as e:
        print(f"  [event_agent] Parse error: {e} | raw: {raw[:120]}")
        return None


def _apply_event(
    data: dict,
    civ_states: dict,
    world_snapshot: dict,
    turn: int,
) -> dict:
    """Apply the event effects to world/civ state and return an event record."""
    event_type  = data["event_type"]
    target_civ  = data.get("target_civ")
    magnitude   = data.get("magnitude", 1)
    description = data.get("description", "A world event occurred.")

    applied_effects = {}

    if event_type == "drought":
        affected = 0
        for tile in world_snapshot["tiles"]:
            if tile.get("food", 0) > 0 and random.random() < 0.25:
                reduction = tile["food"] * 0.4 * magnitude
                tile["food"] = max(0, tile["food"] - reduction)
                affected += 1
        applied_effects["tiles_affected"] = affected

    elif event_type == "plague":
        if target_civ and target_civ in civ_states:
            mil = civ_states[target_civ]["resources"].get("military", 0)
            loss = int(mil * (0.15 + 0.05 * magnitude))
            civ_states[target_civ]["resources"]["military"] = max(0, mil - loss)
            applied_effects["military_lost"] = loss

    elif event_type == "gold_discovery":
        target_tile = data.get("target_tile", {})
        q = target_tile.get("q", 0) if target_tile else 0
        r = target_tile.get("r", 0) if target_tile else 0
        tile = next(
            (t for t in world_snapshot["tiles"] if t["q"] == q and t["r"] == r),
            None
        )
        if tile:
            tile["gold"] = tile.get("gold", 0) * (1 + magnitude)
            applied_effects["tile"] = f"{q},{r}"

    elif event_type == "natural_disaster":
        # Remove ownership of 1-2 border tiles from target civ
        removed = 0
        limit = magnitude
        for tile in world_snapshot["tiles"]:
            if removed >= limit:
                break
            if tile.get("owner") == target_civ:
                tile["owner"] = None
                removed += 1
        applied_effects["tiles_lost"] = removed

    elif event_type == "ancient_ruins_found":
        if target_civ and target_civ in civ_states:
            bonus = 50 * magnitude
            civ_states[target_civ]["resources"]["gold"] = (
                civ_states[target_civ]["resources"].get("gold", 0) + bonus
            )
            applied_effects["gold_gained"] = bonus

    elif event_type == "rebellion":
        if target_civ and target_civ in civ_states:
            for tile in world_snapshot["tiles"]:
                if tile.get("owner") == target_civ:
                    tile["owner"] = None
                    applied_effects["tile_lost"] = f"{tile['q']},{tile['r']}"
                    break

    return {
        "turn":             turn,
        "type":             event_type,
        "actor":            None,
        "target":           target_civ,
        "narrative":        description,
        "data":             {**data, "applied_effects": applied_effects},
        "is_world_event":   True,
    }