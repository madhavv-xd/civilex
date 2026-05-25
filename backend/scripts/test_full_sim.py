"""
Phase 4 full simulation test.
Starts a sim via the API and watches the SSE stream in the terminal.

Run:
  # Terminal 1 — start the backend first
  uv run uvicorn api.server:app --reload

  # Terminal 2 — run this script
  uv run python scripts/test_full_sim.py
"""
import asyncio
import json
import httpx
import sys

BASE_URL = "http://localhost:8000/api"

CIV_COLORS = {
    "ironhold":  "\033[91m",   # red
    "verdant":   "\033[92m",   # green
    "merchants": "\033[93m",   # yellow
    "conclave":  "\033[95m",   # purple
}
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
CYAN   = "\033[96m"
YELLOW = "\033[93m"
GREEN  = "\033[92m"


def civ_color(civ_id: str, text: str) -> str:
    color = CIV_COLORS.get(civ_id, "")
    return f"{color}{text}{RESET}"


def print_divider(title: str = ""):
    line = "─" * 56
    if title:
        print(f"\n{DIM}{line}{RESET}")
        print(f"  {BOLD}{title}{RESET}")
        print(f"{DIM}{line}{RESET}")
    else:
        print(f"{DIM}{line}{RESET}")


def print_turn_complete(payload: dict):
    turn      = payload.get("turn", "?")
    narrative = payload.get("narrative", "")
    events    = payload.get("events", [])
    civ_states = payload.get("civ_states", {})

    print_divider(f"Turn {turn}")

    # Narrative
    print(f"\n  📜 {CYAN}\"{narrative}\"{RESET}\n")

    # Events (skip narrator type — already shown above)
    meaningful = [
        e for e in events
        if e.get("type") not in ("narrator", "civ_idle", "turn_start")
    ]
    if meaningful:
        print(f"  {DIM}Events:{RESET}")
        for e in meaningful:
            actor  = e.get("actor") or "world"
            etype  = e.get("type", "?")
            target = e.get("target", "")
            result = e.get("result", "")
            actor_str = civ_color(actor, actor) if actor in CIV_COLORS else actor
            print(f"    {actor_str} → {etype} {f'→ {target}' if target else ''} {f'({result})' if result else ''}")

    # Civ resource bars
    print(f"\n  {DIM}Civ states:{RESET}")
    for civ_id, state in civ_states.items():
        if not state.get("is_alive", True):
            print(f"    {civ_color(civ_id, civ_id):<20} {DIM}[ELIMINATED]{RESET}")
            continue
        res    = state.get("resources", {})
        tiles  = state.get("tile_count", 0)
        gold   = res.get("gold", 0)
        food   = res.get("food", 0)
        mil    = res.get("military", 0)
        action = state.get("last_action", "—") or "—"
        name   = civ_color(civ_id, f"{civ_id:<12}")
        print(
            f"    {name}  "
            f"tiles={tiles:<3} "
            f"💰{gold:<6.0f} "
            f"🌾{food:<6.0f} "
            f"⚔️ {mil:<4} "
            f"{DIM}[{action}]{RESET}"
        )


def print_sim_end(payload: dict):
    winner        = payload.get("winner", "unknown")
    win_type      = payload.get("winner_reason", "unknown")
    turn          = payload.get("turn", "?")
    final_narr    = payload.get("final_narrative", "")

    print(f"\n{'═'*56}")
    print(f"  🏆 {BOLD}SIMULATION COMPLETE{RESET}")
    print(f"{'═'*56}")
    print(f"  Winner:   {civ_color(winner, winner.upper())}")
    print(f"  Victory:  {win_type}")
    print(f"  Turn:     {turn}")
    print(f"\n  📜 {CYAN}\"{final_narr}\"{RESET}")
    print(f"{'═'*56}\n")


async def main():
    print(f"\n{BOLD}🌍 AI Civilization Simulator — Full Simulation Test{RESET}")
    print(f"{DIM}Connecting to {BASE_URL}...{RESET}\n")

    async with httpx.AsyncClient(timeout=30) as client:

        # ── Health check ──────────────────────────────────────────────
        try:
            resp = await client.get(f"{BASE_URL}/health")
            data = resp.json()
            if data.get("db") != "connected":
                print("❌ MongoDB not connected. Start the backend first.")
                sys.exit(1)
            print(f"✅ Backend healthy — MongoDB connected\n")
        except httpx.ConnectError:
            print("❌ Cannot connect to backend.")
            print("   Run: uv run uvicorn api.server:app --reload")
            sys.exit(1)

        # ── Start simulation ──────────────────────────────────────────
        print(f"🚀 Starting simulation...")
        resp = await client.post(
            f"{BASE_URL}/sim/start",
            json={"grid_size": 15, "max_turns": 50},
        )
        if resp.status_code != 200:
            print(f"❌ Failed to start: {resp.text}")
            sys.exit(1)

        data   = resp.json()
        sim_id = data["sim_id"]
        print(f"   sim_id: {BOLD}{sim_id}{RESET}")
        print(f"   stream: {data['stream']}")
        print(f"\n{DIM}Watching SSE stream... (Ctrl+C to stop){RESET}")

        # ── Connect to SSE stream ─────────────────────────────────────
        async with client.stream(
            "GET",
            f"{BASE_URL}/sim/{sim_id}/stream",
            timeout=None,
        ) as stream:
            async for line in stream.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data:"):
                    continue

                raw = line[5:].strip()
                if not raw:
                    continue

                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                event_type = payload.get("type")

                if event_type == "sim_start":
                    print(f"\n{GREEN}✅ Simulation started — world generated{RESET}")
                    civ_states = payload.get("civ_states", {})
                    print(f"   Civilizations: {', '.join(civ_states.keys())}")

                elif event_type == "turn_complete":
                    print_turn_complete(payload)

                elif event_type == "sim_end":
                    print_sim_end(payload)
                    break

                elif event_type == "sim_error":
                    print(f"\n❌ Simulation error: {payload.get('message')}")
                    break

    print(f"\n✅ Test complete. Check MongoDB Atlas to see all saved turns and events.\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{DIM}Stream interrupted by user.{RESET}\n")