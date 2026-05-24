"""
Narrator agent — writes 2-3 sentences of historical lore each turn.
"""
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import settings
from utils.prompt_builder import load_template, build_narrator_user_message

_llm = ChatOpenAI(
    model=settings.openrouter_model,
    openai_api_key=settings.openrouter_api_key,
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=256,
)


async def narrate_turn(
    turn: int,
    events: list[dict],
    world_event: dict | None = None,
) -> str:
    """
    Write a historical narrative for the turn.

    Args:
        turn: current turn number
        events: list of resolved event dicts from world engine
        world_event: optional world event dict from event agent

    Returns:
        narrative string (2-3 sentences of lore)
    """
    turn_diff = {
        "events":      events,
        "world_event": world_event,
    }

    system_prompt = load_template("narrator_system.txt")
    user_message  = build_narrator_user_message(turn, turn_diff)

    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]
        response = await _llm.ainvoke(messages)
        return response.content.strip()

    except Exception as e:
        print(f"  [narrator] Error: {e}")
        return f"In the {_ordinal(turn)} year, the world turned and history moved forward."


def _ordinal(n: int) -> str:
    suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10 if n % 100 not in (11,12,13) else 0, "th")
    return f"{n}{suffix}"