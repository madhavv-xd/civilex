"""
World engine — pure Python logic that adjudicates all civ decisions
and produces an updated world state + turn diff.
No LLM calls here. This is the referee.
"""
import random
from copy import deepcopy


def resolve_turn(
    turn: int,
    decisions: dict[str, dict],
    civ_states: dict[str, dict],
    world_snapshot: dict,
    world_params: dict,
) -> tuple[dict, dict, list[dict]]:
    """
    Adjudicate all decisions for a turn.

    Returns:
        updated_civ_states: dict — new civ states after resolution
        updated_world:      dict — updated world snapshot
        events:             list — list of resolved event dicts for narrator/DB
    """
    civ_states  = deepcopy(civ_states)
    world       = deepcopy(world_snapshot)
    events      = []
    tile_owners = _build_tile_owner_map(world)

    # ── 1. Resource tick — every owned tile yields resources ──────────
    _apply_resource_tick(civ_states, world, world_params)

    # ── 2. Resolve each decision ──────────────────────────────────────
    # Sort by action priority: wars first, then captures, then diplomacy
    priority = {
        "declare_war": 0, "capture_tile": 1,
        "build_infrastructure": 2, "propose_trade": 3,
        "form_alliance": 4, "idle": 5,
    }
    sorted_decisions = sorted(
        decisions.items(),
        key=lambda x: priority.get(x[1].get("action", "idle"), 5)
    )

    for civ_id, decision in sorted_decisions:
        if not civ_states.get(civ_id, {}).get("is_alive", True):
            continue

        action = decision.get("action", "idle")
        target = decision.get("target")

        if action == "declare_war":
            event = _resolve_war(civ_id, target, civ_states, world, tile_owners, turn)
            if event:
                events.append(event)

        elif action == "capture_tile":
            event = _resolve_capture(civ_id, target, civ_states, world, tile_owners, turn)
            if event:
                events.append(event)

        elif action == "propose_trade":
            event = _resolve_trade(civ_id, target, civ_states, turn)
            if event:
                events.append(event)

        elif action == "form_alliance":
            event = _resolve_alliance(civ_id, target, civ_states, turn)
            if event:
                events.append(event)

        elif action == "build_infrastructure":
            event = _resolve_infrastructure(civ_id, civ_states, world, turn)
            if event:
                events.append(event)

        else:
            events.append({
                "turn":      turn,
                "type":      "civ_idle",
                "actor":     civ_id,
                "target":    None,
                "result":    "observed and waited",
                "narrative": f"{civ_id} made no move this turn.",
            })

    # ── 3. Check for eliminations ─────────────────────────────────────
    for civ_id, state in civ_states.items():
        if state.get("is_alive", True) and state.get("tile_count", 0) <= 0:
            state["is_alive"] = False
            events.append({
                "turn":      turn,
                "type":      "civ_eliminated",
                "actor":     civ_id,
                "target":    None,
                "result":    "eliminated",
                "narrative": f"{civ_id} has been eliminated.",
            })

    # ── 4. Sync tile counts ───────────────────────────────────────────
    _sync_tile_counts(civ_states, world)

    return civ_states, world, events


# ── Resolution helpers ────────────────────────────────────────────────────────

def _resolve_war(
    attacker_id: str,
    target_id: str | None,
    civ_states: dict,
    world: dict,
    tile_owners: dict,
    turn: int,
) -> dict | None:
    if not target_id or target_id not in civ_states:
        return None
    if not civ_states[target_id].get("is_alive", True):
        return None

    attacker = civ_states[attacker_id]
    defender = civ_states[target_id]

    att_mil = attacker["resources"].get("military", 0)
    def_mil = defender["resources"].get("military", 0)

    # Battle math: attacker wins if military > 60% of defender + random factor
    roll       = random.uniform(0.8, 1.2)
    att_power  = att_mil * roll
    def_power  = def_mil * random.uniform(0.9, 1.1)

    attacker_wins = att_power > def_power * 0.6

    # Casualties both sides
    att_loss = int(att_mil * random.uniform(0.05, 0.15))
    def_loss = int(def_mil * random.uniform(0.10, 0.25))
    attacker["resources"]["military"] = max(0, att_mil - att_loss)
    defender["resources"]["military"] = max(0, def_mil - def_loss)

    # Relationship impact
    _adjust_relationship(civ_states, attacker_id, target_id, -40)

    result = "victory" if attacker_wins else "repelled"

    # If attacker wins, seize one border tile
    seized_tile = None
    if attacker_wins:
        seized_tile = _seize_border_tile(attacker_id, target_id, world, tile_owners)

    return {
        "turn":      turn,
        "type":      "war_declaration",
        "actor":     attacker_id,
        "target":    target_id,
        "result":    result,
        "data": {
            "attacker_military_lost": att_loss,
            "defender_military_lost": def_loss,
            "seized_tile":            seized_tile,
        },
        "narrative": (
            f"{attacker_id} declared war on {target_id} and {'seized territory' if attacker_wins else 'was repelled'}."
        ),
    }


def _resolve_capture(
    civ_id: str,
    target: str | None,
    civ_states: dict,
    world: dict,
    tile_owners: dict,
    turn: int,
) -> dict | None:
    if not target:
        return None

    try:
        parts = str(target).replace("(","").replace(")","").split(",")
        q, r = int(parts[0].strip()), int(parts[1].strip())
    except (ValueError, IndexError):
        return None

    # Find the tile
    tile = next((t for t in world["tiles"] if t["q"] == q and t["r"] == r), None)
    if not tile:
        return None

    current_owner = tile.get("owner")

    # Can only capture neutral or enemy tiles
    if current_owner == civ_id:
        return None

    civ_mil = civ_states[civ_id]["resources"].get("military", 0)

    if current_owner and current_owner in civ_states:
        # Contested capture — needs military advantage
        other_mil = civ_states[current_owner]["resources"].get("military", 0)
        if civ_mil < other_mil * 0.5:
            return {
                "turn": turn, "type": "territory_captured",
                "actor": civ_id, "target": f"{q},{r}",
                "result": "failed — insufficient military",
                "narrative": f"{civ_id} attempted to capture a tile but was driven back.",
            }
        # Contested — small military loss
        loss = int(civ_mil * 0.08)
        civ_states[civ_id]["resources"]["military"] = max(0, civ_mil - loss)
        _adjust_relationship(civ_states, civ_id, current_owner, -20)

    # Capture succeeds
    tile["owner"] = civ_id
    tile_owners[(q, r)] = civ_id

    return {
        "turn": turn, "type": "territory_captured",
        "actor": civ_id, "target": f"{q},{r}",
        "result": f"captured from {current_owner or 'neutral'}",
        "narrative": f"{civ_id} captured tile ({q},{r}).",
    }


def _resolve_trade(
    proposer_id: str,
    target_id: str | None,
    civ_states: dict,
    turn: int,
) -> dict | None:
    if not target_id or target_id not in civ_states:
        return None
    if not civ_states[target_id].get("is_alive", True):
        return None

    rel = _get_relationship(civ_states, proposer_id, target_id)

    # Auto-accept if friendly, auto-reject if hostile, coin flip if neutral
    if rel >= 20:
        accepted = True
    elif rel <= -20:
        accepted = False
    else:
        accepted = random.random() > 0.4

    if accepted:
        # Both gain a small gold boost
        civ_states[proposer_id]["resources"]["gold"] = (
            civ_states[proposer_id]["resources"].get("gold", 0) + 30
        )
        civ_states[target_id]["resources"]["gold"] = (
            civ_states[target_id]["resources"].get("gold", 0) + 30
        )
        _adjust_relationship(civ_states, proposer_id, target_id, +15)
        result = "accepted"
    else:
        result = "rejected"
        _adjust_relationship(civ_states, proposer_id, target_id, -5)

    return {
        "turn": turn,
        "type": "trade_accepted" if accepted else "trade_rejected",
        "actor": proposer_id,
        "target": target_id,
        "result": result,
        "narrative": (
            f"{proposer_id} proposed a trade to {target_id}, which was {result}."
        ),
    }


def _resolve_alliance(
    proposer_id: str,
    target_id: str | None,
    civ_states: dict,
    turn: int,
) -> dict | None:
    if not target_id or target_id not in civ_states:
        return None
    if not civ_states[target_id].get("is_alive", True):
        return None

    rel = _get_relationship(civ_states, proposer_id, target_id)

    if rel < 0:
        return {
            "turn": turn, "type": "peace_treaty",
            "actor": proposer_id, "target": target_id,
            "result": "rejected — relations too hostile",
            "narrative": f"{target_id} rejected {proposer_id}'s alliance proposal.",
        }

    _adjust_relationship(civ_states, proposer_id, target_id, +40)
    return {
        "turn": turn, "type": "alliance_formed",
        "actor": proposer_id, "target": target_id,
        "result": "alliance formed",
        "narrative": f"{proposer_id} and {target_id} forged an alliance.",
    }


def _resolve_infrastructure(
    civ_id: str,
    civ_states: dict,
    world: dict,
    turn: int,
) -> dict | None:
    stone = civ_states[civ_id]["resources"].get("stone", 0)
    if stone < 50:
        return {
            "turn": turn, "type": "build_infrastructure",
            "actor": civ_id, "target": None,
            "result": "failed — insufficient stone",
            "narrative": f"{civ_id} lacked stone to build infrastructure.",
        }

    civ_states[civ_id]["resources"]["stone"] = stone - 50

    # Boost food on owned tiles by 10%
    for tile in world["tiles"]:
        if tile.get("owner") == civ_id:
            tile["food"] = round(tile["food"] * 1.10, 2)

    return {
        "turn": turn, "type": "build_infrastructure",
        "actor": civ_id, "target": None,
        "result": "built — food yield +10%",
        "narrative": f"{civ_id} invested in infrastructure, improving food yields across their territory.",
    }


# ── Utility helpers ───────────────────────────────────────────────────────────

def _build_tile_owner_map(world: dict) -> dict[tuple, str | None]:
    return {(t["q"], t["r"]): t.get("owner") for t in world["tiles"]}


def _seize_border_tile(
    attacker_id: str,
    defender_id: str,
    world: dict,
    tile_owners: dict,
) -> str | None:
    """Seize one border tile from defender. Returns tile coords string or None."""
    for tile in world["tiles"]:
        if tile.get("owner") == defender_id:
            tile["owner"] = attacker_id
            tile_owners[(tile["q"], tile["r"])] = attacker_id
            return f"{tile['q']},{tile['r']}"
    return None


def _adjust_relationship(
    civ_states: dict,
    civ_a: str,
    civ_b: str,
    delta: int,
) -> None:
    """Adjust relationship score between two civs symmetrically, clamped to [-100, 100]."""
    for actor, other in [(civ_a, civ_b), (civ_b, civ_a)]:
        rels = civ_states[actor].get("relationships", {})
        current = rels.get(other, 0)
        rels[other] = max(-100, min(100, current + delta))
        civ_states[actor]["relationships"] = rels


def _get_relationship(civ_states: dict, civ_a: str, civ_b: str) -> int:
    return civ_states[civ_a].get("relationships", {}).get(civ_b, 0)


def _apply_resource_tick(
    civ_states: dict,
    world: dict,
    world_params: dict,
) -> None:
    """Each owned tile yields its resources to the owning civ."""
    for tile in world["tiles"]:
        owner = tile.get("owner")
        if not owner or owner not in civ_states:
            continue
        res = civ_states[owner]["resources"]
        res["food"]  = res.get("food",  0) + tile.get("food",  0)
        res["gold"]  = res.get("gold",  0) + tile.get("gold",  0)
        res["stone"] = res.get("stone", 0) + tile.get("stone", 0)

    # Food consumption: military units consume food
    for civ_id, state in civ_states.items():
        if not state.get("is_alive", True):
            continue
        res = state["resources"]
        mil = res.get("military", 0)
        food_cost = mil * 0.5
        res["food"] = max(0, res.get("food", 0) - food_cost)

        # Starvation: lose military if food hits 0
        if res["food"] <= 0 and mil > 0:
            loss = max(1, int(mil * 0.10))
            res["military"] = max(0, mil - loss)


def _sync_tile_counts(civ_states: dict, world: dict) -> None:
    """Recalculate tile_count for all civs from the world state."""
    counts: dict[str, int] = {}
    for tile in world["tiles"]:
        owner = tile.get("owner")
        if owner:
            counts[owner] = counts.get(owner, 0) + 1
    for civ_id, state in civ_states.items():
        state["tile_count"] = counts.get(civ_id, 0)