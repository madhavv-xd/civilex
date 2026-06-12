# CivilEx — AI Civilization Simulator

> **Four factions. Fifty turns. One history.**
> Watch AI civilizations forge alliances, declare war, and reshape the world — all driven by large language models.

![Dashboard](./images/Screenshot%202026-06-12%20092822.png)

---

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [The Four Civilizations](#the-four-civilizations)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Frontend Pages & Components](#frontend-pages--components)
- [World Engine Resolution Order](#world-engine-resolution-order)
- [Win Conditions](#win-conditions)
- [Configuration](#configuration)
- [Testing](#testing)
- [Project Status](#project-status)

---

## Overview

**CivilEx** is a fully autonomous AI civilization simulator. Four distinct factions — each with a unique personality, starting resources, and strategic posture — compete across a procedurally generated hex-tile world. Every decision (war declaration, trade proposal, alliance formation, tile capture, infrastructure investment, or idle) is made by an LLM agent powered by [OpenRouter](https://openrouter.ai). A deterministic world engine adjudicates the outcomes, a narrator agent writes historical chronicles, and everything streams live to a Next.js frontend via Server-Sent Events.

**Key capabilities:**
- 🤖 **LLM-driven agents** — Each civilization thinks and acts independently each turn
- 🗺️ **Procedural hex world** — 15×15 axial-coordinate grid with 6 terrain types
- ⚔️ **Full simulation loop** — War, trade, alliances, disasters, memory, narration
- 📡 **Real-time streaming** — SSE-based live frontend updates
- 🏛️ **Persistent history** — MongoDB stores every turn, event, and state snapshot
- ⏪ **Replay controls** — Scrub through completed simulations turn by turn

---

## Screenshots

### Dashboard — Configure and launch simulations
![Dashboard](./images/Screenshot%202026-06-12%20092822.png)

### Configure panel — Select civilizations, grid size and max turns
![Configure Panel](./images/Screenshot%202026-06-12%20092835.png)

### Live simulation view — Hex map, event chronicle, and civ resource panels
![Live Simulation](./images/Screenshot%202026-06-12%20092901.png)

### In-progress simulation on the dashboard — "Watch Live" link
![In Progress](./images/Screenshot%202026-06-12%20092918.png)

### Simulation history — All recorded ages of civilization
![History Page](./images/Screenshot%202026-06-12%20092923.png)

---

## Project Structure

```
civilex/
├── backend/                  Python FastAPI + MongoDB (Beanie ODM)
│   ├── agents/               LLM agents: civ, event, narrator, memory, world engine
│   ├── api/                  FastAPI routes, SSE pub/sub server
│   ├── db/                   MongoDB client + Beanie repositories (sim, turn, event)
│   ├── models/               Beanie ODM documents: Simulation, CivState, Event, Turn
│   ├── prompts/              .txt prompt templates for all LLM agents
│   ├── scripts/              Smoke tests and standalone test runners
│   ├── simulation/           Hex grid, world generator, civilizations loader, LangGraph loop, judge
│   ├── utils/                Hex math, prompt builder, OpenRouter LLM wrapper
│   ├── config.py             Pydantic Settings (reads from .env)
│   ├── main.py               Entry point
│   └── pyproject.toml        uv / Python dependencies
│
├── frontend/                 Next.js 16 + React 19 + Tailwind CSS 4
│   ├── src/
│   │   ├── app/              Next.js App Router pages
│   │   ├── components/       React components (HexGrid, CivPanel, EventFeed, …)
│   │   ├── lib/              Utility helpers (civ colors, etc.)
│   │   └── store/            Zustand global state stores
│   └── package.json
│
├── configs/                  World parameters & civilization configuration
│   ├── world_params.json     Grid size, tile weights, event chance, win thresholds
│   └── default_civs.json     4 civilizations — traits, resources, spawn corners, colors
│
└── images/                   Application screenshots
```

---

## Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.11+ |
| [uv](https://docs.astral.sh/uv/) | latest |
| Node.js | 20+ |
| MongoDB | local or [Atlas](https://www.mongodb.com/atlas) |
| OpenRouter API key | [openrouter.ai/keys](https://openrouter.ai/keys) |

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/civilex.git
cd civilex
```

### 2. Backend setup

```bash
cd backend

# Install Python dependencies
uv sync

# Create the environment file
cp .env.example .env   # then fill in your values
```

**`backend/.env`:**
```env
OPENROUTER_API_KEY=sk-or-...
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=civilex
FRONTEND_URL=http://localhost:3000
```

```bash
# Start the API server (http://localhost:8000)
uv run uvicorn api.server:app --reload
```

### 3. Frontend setup

```bash
cd frontend

npm install

# Create the environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start the dev server (http://localhost:3000)
npm run dev
```

### 4. Open the app

Navigate to **http://localhost:3000**, click **Start Simulation**, and watch history unfold.

---

## How It Works

Each simulation turn runs a **LangGraph state machine** with 8 nodes in sequence:

| # | Node | What happens |
|---|------|--------------|
| 1 | **Resource Tick** | Owned tiles yield food, gold, stone; military consumes food |
| 2 | **Civ Agents** | Each civ's LLM decides: `declare_war`, `propose_trade`, `form_alliance`, `capture_tile`, `build_infrastructure`, or `idle` |
| 3 | **World Engine** | Deterministic referee resolves all decisions — battle math, captures, trade deals |
| 4 | **Event Agent** | 20% chance of a random world event (drought, plague, gold rush, etc.) |
| 5 | **Narrator** | Generates 2–3 sentences of historical prose for the chronicle |
| 6 | **Memory Refresh** | Every 5 turns, compresses full event history into a per-civ memory summary |
| 7 | **Persist** | Saves turn snapshot + events to MongoDB, emits SSE event to connected clients |
| 8 | **Judge** | Checks domination (≥60% tiles), elimination, or stalemate (turn 50) |

No winner → loop back to step 1. Winner found → simulation ends and the win screen renders.

---

## The Four Civilizations

| Civilization | Play Style | Traits | Starting Resources (G / F / S / M) |
|---|---|---|---|
| **The Ironhold Confederacy** | Militaristic conquest | proud, distrustful, expansionist | 100 / 60 / 80 / 85 |
| **The Verdant Pact** | Diplomatic alliance-building | pacifist, nature-focused, generous | 80 / 140 / 60 / 30 |
| **The Ashborne Merchant Guild** | Economic accumulation | shrewd, transactional, opportunistic | 200 / 80 / 60 / 20 |
| **The Silent Conclave** | Isolationist fortification | mysterious, unpredictable, patient | 120 / 90 / 100 / 50 |

> G = Gold · F = Food · S = Stone · M = Military

### World parameters

| Parameter | Default |
|-----------|---------|
| Grid size | 15×15 (225 tiles) |
| Max turns | 50 |
| Starting tiles per civ | 3 (corner spawn) |
| Event chance per turn | 20% |
| Tile types | plains 30%, forest 20%, mountain 15%, river 15%, coast 10%, ruins 10% |
| Domination threshold | 60% of all tiles |
| Win conditions | Domination · Elimination · Stalemate (most tiles at turn 50) |

---

## Architecture

### Backend stack

| Layer | Technology | Key files |
|-------|-----------|-----------|
| API server | FastAPI + Uvicorn | `api/server.py`, `api/routes.py` |
| Realtime streaming | SSE (sse-starlette) | `api/sse.py` |
| Database | MongoDB + Motor + Beanie ODM | `db/client.py`, `db/repositories/` |
| Simulation loop | LangGraph state machine | `simulation/loop.py` |
| LLM agents | OpenRouter (via `utils/llm.py`) | `agents/civ_agent.py`, `agents/event_agent.py`, `agents/narrator_agent.py`, `agents/memory_manager.py` |
| World engine | Pure Python referee (no LLM) | `agents/world_engine.py` |
| Hex geometry | Axial coordinates, pointy-top | `simulation/hex_grid.py`, `utils/hex_math.py` |
| Prompt system | `.txt` templates with `{placeholder}` syntax | `prompts/`, `utils/prompt_builder.py` |
| Config | Pydantic Settings | `config.py` |

### Frontend stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS 4 |
| State management | Zustand |
| Map visualization | D3.js (hex grid SVG) |
| 3D effects | Three.js |
| Icons | Lucide React |

### Data model (MongoDB / Beanie ODM)

| Collection | Document | Description |
|---|---|---|
| `simulations` | `Simulation` | Top-level run: status, turn counter, winner, config |
| `civstates` | `CivState` | Per-civ snapshot per turn: resources, tiles, relationships, memory |
| `events` | `Event` | Every action: war, trade, disaster, narrator entry (21 event types) |
| `turns` | `Turn` | Full world snapshot: every tile owner + all civ resource snapshots |

### Prompt templates (`backend/prompts/`)

| File | Purpose |
|------|---------|
| `civ_system.txt` | Civ identity, 6 possible actions, JSON output format |
| `event_agent.txt` | 6 world event types with narrative targeting guidance |
| `narrator_system.txt` | Historical prose style guide — formal, past tense, 2–3 sentences |
| `memory_system.txt` | Compresses event history into second-person summary (refreshed every 5 turns) |

---

## API Reference

Base URL: `http://localhost:8000`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server + MongoDB connection status |
| `GET` | `/api/world/preview` | Generate a world preview (not persisted) |
| `POST` | `/api/sim/start` | Start a new simulation (background task) |
| `POST` | `/api/sim/{id}/stop` | Pause / stop a running simulation |
| `GET` | `/api/sim/{id}` | Get simulation status, turn counter, winner |
| `GET` | `/api/sim/{id}/stream` | SSE stream — live turn events |
| `GET` | `/api/sim/{id}/events` | Get all events for a simulation (optionally filter by turn) |
| `GET` | `/api/sim/{id}/turns` | List all completed turn snapshots |
| `GET` | `/api/sims` | List recent simulations (limit 20) |

### `POST /api/sim/start` request body

```json
{
  "civ_ids": ["ironhold", "verdant", "merchants", "conclave"],
  "config": {
    "max_turns": 50,
    "grid_size": 15
  }
}
```

---

## Frontend Pages & Components

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Civ cards, war record stats, recent simulations, Start/Configure buttons |
| `/history` | History | All past simulations with status, winner, turn count, victories chart |
| `/simulation/[id]` | Simulation View | Live hex map, event chronicle, civ panels, replay controls, win screen |

### Components

| Component | Description |
|-----------|-------------|
| **HexGrid** | D3.js SVG hex grid — tile type colors, owner overlays, hover tooltips, animated ownership transitions |
| **CivPanel** | Bottom bar — resource bars (gold/food/stone/military), tile counts, relationship dots, last action |
| **EventFeed** (Chronicle) | Right sidebar — filterable by ALL / WARS / DIPLOMACY / WORLD / NARRATOR, auto-scrolls on new events |
| **SimControls** | Top bar — turn counter, progress bar, status badge, speed selector (0.5×/1×/2×/4×), Pause/Stop |
| **ReplayControls** | Scrub through turns of a completed simulation |
| **WinScreen** | Full-page overlay — trophy, winner name, win type, final narrative, navigation |

---

## World Engine Resolution Order

Actions are resolved each turn in strict priority order:

1. **Resource tick** — Each owned tile yields food/gold/stone; military units consume food; starvation shrinks military
2. **War** — `attacker_power = military × random(0.8, 1.2)`; attacker wins if `att_power > defender_military × 0.6`; casualties 5–15% attacker / 10–25% defender; border tile seized on victory; relationship −40
3. **Tile capture** — Requires military advantage over any contested tile
4. **Infrastructure** — Costs 50 stone; permanently +10% food yield on all owned tiles
5. **Trade** — Auto-accept if relationship ≥ 20, auto-reject if ≤ −20, coin-flip otherwise; both sides gain 30 gold
6. **Alliance** — Requires relationship ≥ 0; relationship +40 boost for both parties
7. **Elimination check** — Civs reduced to 0 tiles are marked dead

---

## Win Conditions

Evaluated by `simulation/judge.py` after every turn:

| Condition | Rule |
|-----------|------|
| **Domination** | A civ controls ≥ 60% of all tiles |
| **Elimination** | Only one civ remains alive (all others at 0 tiles) |
| **Stalemate** | Turn 50 reached; civ with the most tiles declared winner |

---

## Configuration

### `configs/world_params.json`
Controls grid dimensions, tile type weights, resource yields, event probability, and win thresholds.

### `configs/default_civs.json`
Defines all 4 civilizations: `id`, `name`, `traits`, `personality` (LLM system prompt injection), starting resources, display color, and spawn corner.

### Backend environment (`backend/.env`)

```env
OPENROUTER_API_KEY=sk-or-...      # Required — your OpenRouter key
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=civilex
FRONTEND_URL=http://localhost:3000  # Used for CORS
```

### Frontend environment (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Testing

Run from the `backend/` directory:

```bash
# Basic models & DB connectivity
uv run python scripts/smoke_test.py

# World generation — prints a full grid to console
uv run python scripts/test_worldgen.py

# OpenRouter LLM API connectivity
uv run python scripts/test_openrouter.py

# Full end-to-end single turn (no database required)
uv run python scripts/test_single_turn.py
```

> The single-turn test generates a world, calls the LLM for all 4 civ decisions, resolves through the world engine, rolls for a world event, narrates, and prints everything to console — no MongoDB needed.

---

## Backend Files Reference

| File | Purpose |
|------|---------|
| `api/server.py` | FastAPI app factory — CORS middleware, MongoDB lifespan startup/shutdown |
| `api/routes.py` | All HTTP endpoints |
| `api/sse.py` | In-memory SSE pub/sub — one channel per simulation |
| `config.py` | Pydantic `Settings` loaded from `.env` |
| `db/client.py` | MongoDB connect / close / ping |
| `db/indexes.py` | Index creation on startup |
| `db/repositories/sim_repo.py` | CRUD for `Simulation` documents |
| `db/repositories/event_repo.py` | Bulk insert + query for `Event` documents |
| `db/repositories/turn_repo.py` | Save and fetch `Turn` snapshots |
| `models/simulation.py` | `Simulation`, `SimStatus`, `SimConfig` |
| `models/civ_state.py` | `CivState`, `Resources` |
| `models/event.py` | `Event`, `EventType` |
| `models/turn.py` | `Turn`, `WorldSnapshot`, `TileSnapshot`, `CivResourceSnapshot` |
| `simulation/hex_grid.py` | Axial coordinate hex geometry (neighbors, rings, spirals, pixel conversion) |
| `simulation/world_state.py` | World generation — weighted tile types, resource yields, corner spawn assignment |
| `simulation/civilizations.py` | Load civ config JSON, build initial `CivState` documents |
| `simulation/loop.py` | LangGraph 8-node state machine (`SimState` TypedDict) |
| `simulation/judge.py` | Win condition evaluator — domination, elimination, stalemate |
| `utils/hex_math.py` | Border detection, territory pathfinding, domination % calculator |
| `utils/prompt_builder.py` | Template loader + filler for all LLM agent prompts |
| `utils/llm.py` | OpenRouter API wrapper (streaming + retries) |
| `agents/civ_agent.py` | Per-civ LLM decision caller with JSON validation + fallback |
| `agents/world_engine.py` | Deterministic referee — resolves all actions, updates state |
| `agents/event_agent.py` | 20%-chance world event roller + LLM event picker |
| `agents/narrator_agent.py` | Turn narrative generator (2–3 sentences of historical prose) |
| `agents/memory_manager.py` | Compresses event log into per-civ memory summaries every 5 turns |

---

## Project Status

All five development phases are complete. The simulator is ready for local use.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Backend scaffold (FastAPI + MongoDB) | ✅ Complete |
| 2 | World generation & configuration | ✅ Complete |
| 3 | Agents & world engine | ✅ Complete |
| 4 | Full simulation loop (LangGraph) | ✅ Complete |
| 5 | Frontend application (Next.js + D3) | ✅ Complete |

---

*Start the backend, start the frontend, click **Start Simulation**, and watch history unfold.*
