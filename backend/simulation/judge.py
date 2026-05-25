"""
Judge — checks win conditions after every turn.
Returns a WinResult if someone won, None if game continues.
"""
from dataclasses import dataclass
from utils.hex_math import domination_percentage


@dataclass
class WinResult:
    winner_id: str
    win_type: str   # "domination" | "elimination" | "stalemate"
    turn: int
    description: str


def check_win(
    turn: int,
    civ_states: dict,
    world_snapshot: dict,
    max_turns: int = 50,
    domination_threshold: float = 0.60,
) -> WinResult | None:
    """
    Check all win conditions for the current turn.

    Returns WinResult if someone won, None if game continues.
    """
    alive = {
        cid: state for cid, state in civ_states.items()
        if state.get("is_alive", True)
    }

    # ── Elimination — only one civ left ──────────────────────────────
    if len(alive) == 1:
        winner_id = next(iter(alive))
        return WinResult(
            winner_id=winner_id,
            win_type="elimination",
            turn=turn,
            description=f"{winner_id} eliminated all rivals and stands alone.",
        )

    if len(alive) == 0:
        return WinResult(
            winner_id="none",
            win_type="mutual_destruction",
            turn=turn,
            description="All civilizations collapsed. The world lies empty.",
        )

    # ── Domination — civ controls >= threshold of all tiles ──────────
    tiles = world_snapshot.get("tiles", [])
    tile_owners = {(t["q"], t["r"]): t.get("owner") for t in tiles}

    for civ_id in alive:
        pct = domination_percentage(civ_id, tile_owners)
        if pct >= domination_threshold:
            return WinResult(
                winner_id=civ_id,
                win_type="domination",
                turn=turn,
                description=(
                    f"{civ_id} controls {pct:.0%} of the known world — "
                    f"domination achieved."
                ),
            )

    # ── Stalemate — max turns reached ────────────────────────────────
    if turn >= max_turns:
        # Winner by tile count
        tile_counts = {
            cid: state.get("tile_count", 0)
            for cid, state in alive.items()
        }
        winner_id = max(tile_counts, key=lambda k: tile_counts[k])
        top_count = tile_counts[winner_id]

        # Check for a true tie
        tied = [cid for cid, cnt in tile_counts.items() if cnt == top_count]
        if len(tied) > 1:
            return WinResult(
                winner_id="draw",
                win_type="stalemate",
                turn=turn,
                description=f"The age ended with no clear victor. History will remember no empire.",
            )

        return WinResult(
            winner_id=winner_id,
            win_type="stalemate",
            turn=turn,
            description=(
                f"The age ended. {winner_id} held the most territory "
                f"({top_count} tiles) and is declared the victor by history."
            ),
        )

    return None