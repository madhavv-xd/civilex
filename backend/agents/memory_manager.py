"""
Memory manager — compresses each civ's event history into a short
memory summary injected into their agent prompt each turn.
"""
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import settings
from utils.prompt_builder import load_template, build_memory_user_message
from simulation.civilizations import load_civs_config

_llm = ChatOpenAI(
    model=settings.openrouter_model,
    openai_api_key=settings.openrouter_api_key,
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=200,
)

# Compress memory every N turns
COMPRESS_EVERY = 5


async def get_memory_summary(
    civ_id: str,
    event_log: list[dict],
    current_state: dict,
) -> str:
    """
    Compress a civ's event history into a 3-sentence memory summary.

    Args:
        civ_id: the civilization ID
        event_log: full event log filtered/unfiltered
        current_state: current CivState dict

    Returns:
        memory summary string
    """
    civs_cfg  = load_civs_config()
    civ_cfg   = next((c for c in civs_cfg if c["id"] == civ_id), None)
    civ_name  = civ_cfg["name"] if civ_cfg else civ_id

    if not event_log:
        return ""

    system_prompt = load_template("memory_system.txt")
    user_message  = build_memory_user_message(
        civ_id=civ_id,
        civ_name=civ_name,
        event_log=event_log,
        current_state=current_state,
    )

    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]
        response = await _llm.ainvoke(messages)
        return response.content.strip()

    except Exception as e:
        print(f"  [memory_manager] Error for {civ_id}: {e}")
        return ""


async def refresh_all_memories(
    turn: int,
    civ_states: dict,
    event_log: list[dict],
    existing_summaries: dict[str, str],
) -> dict[str, str]:
    """
    Refresh memory summaries for all alive civs.
    Only runs every COMPRESS_EVERY turns to save API calls.

    Args:
        turn: current turn number
        civ_states: current civ states
        event_log: full simulation event log so far
        existing_summaries: previous memory summaries

    Returns:
        updated memory summaries dict
    """
    if turn % COMPRESS_EVERY != 0:
        return existing_summaries

    alive_civs = [
        civ_id for civ_id, state in civ_states.items()
        if state.get("is_alive", True)
    ]

    tasks = [
        get_memory_summary(
            civ_id=civ_id,
            event_log=event_log,
            current_state=civ_states[civ_id],
        )
        for civ_id in alive_civs
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    summaries = dict(existing_summaries)
    for civ_id, result in zip(alive_civs, results):
        if isinstance(result, str):
            summaries[civ_id] = result
        else:
            print(f"  [memory_manager] Failed for {civ_id}: {result}")

    return summaries


def should_refresh(turn: int) -> bool:
    return turn % COMPRESS_EVERY == 0