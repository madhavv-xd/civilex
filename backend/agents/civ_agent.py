"""
Civilization agent — each civ observes the world and returns a structured decision.
"""
import json
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import settings
from simulation.civilizations import load_civs_config, get_civ_personality
from utils.prompt_builder import (
    build_civ_system_prompt,
    build_civ_user_message,
    build_world_summary,
)

_llm = ChatOpenAI(
    model=settings.openrouter_model,
    openai_api_key=settings.openrouter_api_key,
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=512,
)

VALID_ACTIONS = {
    "declare_war",
    "propose_trade",
    "form_alliance",
    "capture_tile",
    "build_infrastructure",
    "idle",
}


async def get_civ_decision(
    civ_id: str,
    turn: int,
    civ_state: dict,
    all_civ_states: dict,
    world_snapshot: dict,
    memory_summary: str = "",
    max_retries: int = 2,
) -> dict:
    """
    Ask a civilization agent what it wants to do this turn.

    Returns a validated decision dict:
    {
        "civ_id": str,
        "action": str,
        "target": str | None,
        "reasoning": str,
        "tone": str,
    }
    """
    civs_config = load_civs_config()
    civ_config  = next((c for c in civs_config if c["id"] == civ_id), None)

    if not civ_config:
        return _fallback_decision(civ_id, "idle", "Civilization config not found.")

    system_prompt = build_civ_system_prompt(
        civ_id=civ_id,
        civ_name=civ_config["name"],
        traits=civ_config["traits"],
        personality=civ_config["personality"],
        all_civ_configs=civs_config,
    )

    world_summary = build_world_summary(
        world_snapshot=world_snapshot,
        civ_states=all_civ_states,
        exclude_civ_id=civ_id,
    )

    user_message = build_civ_user_message(
        turn=turn,
        civ_state=civ_state,
        world_summary=world_summary,
        memory_summary=memory_summary,
    )

    for attempt in range(max_retries + 1):
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message),
            ]
            response = await _llm.ainvoke(messages)
            raw = response.content.strip()
            decision = _parse_and_validate(raw, civ_id)

            if decision:
                return decision

        except Exception as e:
            print(f"  [{civ_id}] Agent error (attempt {attempt+1}): {e}")

        if attempt < max_retries:
            await asyncio.sleep(1)

    # All retries exhausted — fall back to idle
    print(f"  [{civ_id}] All retries exhausted — falling back to idle")
    return _fallback_decision(civ_id, "idle", "Could not reach a decision this turn.")


async def get_all_civ_decisions(
    turn: int,
    civ_states: dict,
    world_snapshot: dict,
    memory_summaries: dict[str, str] | None = None,
) -> dict[str, dict]:
    """
    Ask all alive civs for their decisions in parallel.
    Returns dict mapping civ_id → decision.
    """
    if memory_summaries is None:
        memory_summaries = {}

    alive_civs = [
        civ_id for civ_id, state in civ_states.items()
        if state.get("is_alive", True)
    ]

    tasks = [
        get_civ_decision(
            civ_id=civ_id,
            turn=turn,
            civ_state=civ_states[civ_id],
            all_civ_states=civ_states,
            world_snapshot=world_snapshot,
            memory_summary=memory_summaries.get(civ_id, ""),
        )
        for civ_id in alive_civs
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    decisions = {}
    for civ_id, result in zip(alive_civs, results):
        if isinstance(result, Exception):
            print(f"  [{civ_id}] Exception: {result}")
            decisions[civ_id] = _fallback_decision(civ_id, "idle", str(result))
        else:
            decisions[civ_id] = result

    return decisions


def _parse_and_validate(raw: str, civ_id: str) -> dict | None:
    """Parse JSON response and validate it has the required fields."""
    try:
        # Strip markdown fences if present
        text = raw
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        data = json.loads(text)

        action = data.get("action", "")
        if action not in VALID_ACTIONS:
            print(f"  [{civ_id}] Invalid action: {action}")
            return None

        return {
            "civ_id":    civ_id,
            "action":    action,
            "target":    data.get("target"),
            "reasoning": data.get("reasoning", ""),
            "tone":      data.get("tone", "neutral"),
        }

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"  [{civ_id}] JSON parse error: {e} | raw: {raw[:120]}")
        return None


def _fallback_decision(civ_id: str, action: str, reasoning: str) -> dict:
    return {
        "civ_id":    civ_id,
        "action":    action,
        "target":    None,
        "reasoning": reasoning,
        "tone":      "cautious",
    }