# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Civilization Simulator** — Four LLM-driven civilizations compete on a 15×15 hex grid. Each turn is a LangGraph state machine: resource tick → civ agent decisions (via OpenRouter) → world engine resolution → event roll → narrator → memory refresh → persist to MongoDB → win check.

## Repository Layout

```
civilex/
├── backend/          FastAPI + MongoDB (Beanie ODM) — Python 3.12, managed by uv
├── frontend/         Next.js 16 + React 19 + Tailwind 4 + Zustand + D3
└── configs/          world_params.json, default_civs.json
```

## Development Commands

### Backend (run from `backend/`)

```bash
uv sync                                          # Install / update dependencies
uv run uvicorn api.server:app --reload           # Start API server at :8000
```

**Smoke tests (no pytest, standalone scripts):**
```bash
uv run python scripts/smoke_test.py             # Models & DB connectivity
uv run python scripts/test_worldgen.py          # World generation
uv run python scripts/test_openrouter.py        # LLM API connectivity
uv run python scripts/test_single_turn.py       # Full end-to-end single turn (no DB needed)
```

Run pytest (integration tests require a live MongoDB):
```bash
uv run pytest
```

### Frontend (run from `frontend/`)

```bash
npm install
npm run dev      # Dev server at :3000
npm run build
npm run lint
```

### Required `.env` (backend)

```
OPENROUTER_API_KEY=sk-or-...
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=civilex
FRONTEND_URL=http://localhost:3000
```

Frontend secrets go in `frontend/.env.local`.

## Architecture

### Backend

The simulation runs as a FastAPI background task. The entry point is `POST /api/sim/start`, which calls `run_simulation_loop(sim_id)` from `simulation/loop.py`. That function builds a LangGraph `StateGraph` with 8 nodes and runs it to completion.

**Key call path:**
```
POST /api/sim/start
  → simulation/loop.py:run_simulation_loop()
      → LangGraph: increment_turn → run_civ_agents → run_world_engine
                 → run_event_agent → run_narrator → refresh_memory
                 → persist_turn → check_winner → (loop or END)
```

**Agent layer** (`agents/`): Each agent calls OpenRouter via `utils/llm.py`. Prompts are `.txt` templates in `prompts/` loaded by `utils/prompt_builder.py` using `{placeholder}` substitution. The world engine (`agents/world_engine.py`) is pure Python — no LLM.

**Hex grid**: Axial coordinates (q, r), pointy-top. `simulation/hex_grid.py` handles geometry; `utils/hex_math.py` handles border detection and territory math.

**Live streaming**: Each simulation gets an `asyncio.Queue` in `api/sse.py:SseManager`. The frontend connects to `GET /api/sim/{id}/stream` to receive turn events as SSE.

**Database** (`db/`): Beanie ODM over Motor (async MongoDB). Four document types: `Simulation`, `CivState`, `Event`, `Turn`. Repositories live in `db/repositories/`.

**Config** (`config.py`): Pydantic `BaseSettings` — reads from `backend/.env`. LLM model and MongoDB URL are configurable without code changes.

### Frontend

Next.js App Router. Three pages:
- `/` — dashboard: start simulation, list recent runs
- `/history` — past simulations
- `/simulation/[id]` — live view: D3 hex map + event feed + civ panels

State is split across three Zustand stores in `src/store/`:
- `simStore` — simulation metadata (id, status, turn, winner)
- `worldStore` — current world snapshot (tiles, ownership)
- `eventStore` — event log

`src/hooks/useEventStream.ts` subscribes to the SSE endpoint and dispatches into the stores. `src/hooks/useReplay.ts` drives the replay scrubber (fetches per-turn snapshots via `GET /api/sim/{id}/turn/{n}`).

> **Note:** This project uses Next.js 16 with React 19 and Tailwind CSS 4. These versions have breaking API changes from earlier releases. Before editing frontend code, check `frontend/node_modules/next/dist/docs/` for current conventions.

## Configurations

- `configs/world_params.json` — tile yields, weights, event chance, win thresholds, grid size
- `configs/default_civs.json` — 4 civs with traits, personalities, starting resources, spawn corners

Changing civ behaviour: edit the personality in `configs/default_civs.json` and the system prompt in `prompts/civ_system.txt`. No code change needed.

## LLM / OpenRouter

Model is set via `OPENROUTER_MODEL` env var (default: `openai/gpt-oss-120b:free`). The wrapper in `utils/llm.py` uses `langchain-openai` pointed at the OpenRouter base URL. Civ agents expect a JSON response with an `action` key matching one of: `declare_war`, `propose_trade`, `form_alliance`, `capture_tile`, `build_infrastructure`, `idle`.
