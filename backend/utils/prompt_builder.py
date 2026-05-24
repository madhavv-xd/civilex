"""
Builds prompt strings from .txt templates and world state data.
"""
from pathlib import Path
import json

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def load_template(filename: str) -> str:
    """Load a prompt template from the prompts/ directory."""
    path = _PROMPTS_DIR / filename
    with open(path) as f:
        return f.read()


def build_civ_system_prompt(
    civ_id: str,
    civ_name: str,
    traits: list[str],
    personality: str,
    all_civ_configs: list[dict],
) -> str:
    """Build the system prompt for a civilization agent."""
    template = load_template("civ_system.txt")

    # Build other civs description
    other_civs_lines = []
    for civ in all_civ_configs:
        if civ["id"] == civ_id:
            continue
        other_civs_lines.append(
            f"- {civ['name']} ({civ['id']}): {', '.join(civ['traits'])}"
        )
    other_civs = "\n".join(other_civs_lines)

    return template.format(
        civ_name=civ_name,
        traits=", ".join(traits),
        personality=personality,
        other_civs=other_civs,
    )


def build_civ_user_message(
    turn: int,
    civ_state: dict,
    world_summary: str,
    memory_summary: str,
) -> str:
    """Build the user message for a civilization agent each turn."""
    resources = civ_state.get("resources", {})
    relationships = civ_state.get("relationships", {})

    rel_lines = []
    for other_id, score in relationships.items():
        mood = (
            "allied" if score >= 60
            else "friendly" if score >= 20
            else "neutral" if score >= -20
            else "hostile" if score >= -60
            else "at war"
        )
        rel_lines.append(f"  - {other_id}: {score} ({mood})")

    return f"""TURN {turn}

YOUR STATE
----------
Gold:     {resources.get('gold', 0):.0f}
Food:     {resources.get('food', 0):.0f}
Stone:    {resources.get('stone', 0):.0f}
Military: {resources.get('military', 0)}
Tiles:    {civ_state.get('tile_count', 0)}
Alive:    {civ_state.get('is_alive', True)}

YOUR RELATIONSHIPS
------------------
{chr(10).join(rel_lines) if rel_lines else "  No relationships yet."}

YOUR MEMORY
-----------
{memory_summary if memory_summary else "No significant history yet. This is the beginning."}

WORLD STATE
-----------
{world_summary}

Decide your action for turn {turn}. Return valid JSON only."""


def build_world_summary(
    world_snapshot: dict,
    civ_states: dict,
    exclude_civ_id: str,
) -> str:
    """
    Build a compact world state summary string for injection into civ prompts.
    Excludes the civ's own state (already shown separately).
    """
    lines = ["Other civilizations:"]

    for civ_id, state in civ_states.items():
        if civ_id == exclude_civ_id:
            continue
        if not state.get("is_alive", True):
            lines.append(f"  - {civ_id}: ELIMINATED")
            continue
        res = state.get("resources", {})
        lines.append(
            f"  - {civ_id}: "
            f"{state.get('tile_count', 0)} tiles | "
            f"gold={res.get('gold', 0):.0f} "
            f"food={res.get('food', 0):.0f} "
            f"military={res.get('military', 0)}"
        )

    # Tile ownership summary
    tiles = world_snapshot.get("tiles", [])
    ownership: dict[str, int] = {}
    neutral = 0
    for tile in tiles:
        owner = tile.get("owner")
        if owner:
            ownership[owner] = ownership.get(owner, 0) + 1
        else:
            neutral += 1

    lines.append(f"\nTile ownership: {neutral} neutral tiles remaining")
    for cid, count in sorted(ownership.items(), key=lambda x: -x[1]):
        lines.append(f"  - {cid}: {count} tiles")

    return "\n".join(lines)


def build_narrator_user_message(
    turn: int,
    turn_diff: dict,
) -> str:
    """Build the user message for the narrator agent."""
    events = turn_diff.get("events", [])
    world_event = turn_diff.get("world_event")

    event_lines = []
    for e in events:
        actor  = e.get("actor", "unknown")
        action = e.get("action", "unknown")
        target = e.get("target", "")
        result = e.get("result", "")
        event_lines.append(f"- {actor} {action} {target}: {result}")

    world_event_text = ""
    if world_event:
        world_event_text = f"\nWorld event: {world_event.get('description', '')}"

    return f"""Turn {turn} events:
{chr(10).join(event_lines) if event_lines else "- No major actions this turn."}
{world_event_text}

Write the historical chronicle entry for turn {turn}."""


def build_event_agent_user_message(
    turn: int,
    world_snapshot: dict,
    civ_states: dict,
) -> str:
    """Build the user message for the event agent."""
    lines = [f"Turn {turn} world state:"]
    for civ_id, state in civ_states.items():
        if not state.get("is_alive", True):
            continue
        res = state.get("resources", {})
        lines.append(
            f"  {civ_id}: tiles={state.get('tile_count',0)} "
            f"gold={res.get('gold',0):.0f} "
            f"food={res.get('food',0):.0f} "
            f"military={res.get('military',0)}"
        )

    tiles = world_snapshot.get("tiles", [])
    neutral_count = sum(1 for t in tiles if not t.get("owner"))
    lines.append(f"  neutral tiles: {neutral_count}")

    lines.append("\nDecide whether to fire a world event. Choose the most dramatically interesting option.")
    return "\n".join(lines)


def build_memory_user_message(
    civ_id: str,
    civ_name: str,
    event_log: list[dict],
    current_state: dict,
) -> str:
    """Build the user message for the memory manager."""
    recent_events = event_log[-20:] if len(event_log) > 20 else event_log

    event_lines = []
    for e in recent_events:
        turn   = e.get("turn", "?")
        etype  = e.get("type", "unknown")
        actor  = e.get("actor", "")
        target = e.get("target", "")
        narr   = e.get("narrative", "")
        if actor == civ_id or target == civ_id:
            event_lines.append(f"  Turn {turn}: {etype} | {actor} → {target} | {narr}")

    res = current_state.get("resources", {})
    current = (
        f"Current state: {current_state.get('tile_count',0)} tiles | "
        f"gold={res.get('gold',0):.0f} food={res.get('food',0):.0f} "
        f"military={res.get('military',0)}"
    )

    return f"""Civilization: {civ_name} ({civ_id})

Relevant event history:
{chr(10).join(event_lines) if event_lines else "  No significant events yet."}

{current}

Write a 3-sentence memory summary for {civ_name}."""