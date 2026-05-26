# AI Civilization Simulator

**Initial product is ready.** The simulation engine, LLM-powered agents, world generator, API, database persistence, and real-time frontend are fully functional. Four AI civilizations battle for dominance across a 15×15 hex grid world — every decision, war, treaty, and disaster is driven by a large language model via OpenRouter, adjudicated by a deterministic world engine, and narrated into historical chronicles.

![Dashboard](./images/Screenshot%202026-05-26%20134100.png)

## Project Structure

```
civilex/
├── backend/          Python FastAPI + MongoDB (Beanie ODM)
├── frontend/         Next.js 16 + React 19 + Tailwind CSS 4 + Zustand + D3
├── configs/          World parameters & civilization configuration
└── images/           Screenshots
```

## Quick Start

### Prerequisites

- **Python 3.11+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 20+**
- **MongoDB** — local or [Atlas](https://www.mongodb.com/atlas)
- **OpenRouter API key** — register at https://openrouter.ai/keys

### Backend Setup

```bash
cd backend
uv sync                                # Install Python dependencies

# Create backend/.env:
echo "OPENROUTER_API_KEY=sk-or-...
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=civilex
FRONTEND_URL=http://localhost:3000" > .env

uv run python api/server.py            # Starts at http://localhost:8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev                            # Opens at http://localhost:3000
```

![Simulation View](./images/Screenshot%202026-05-26%20134112.png)

## How It Works

Each turn, the simulation runs a LangGraph state machine with 8 nodes:

| Step | Component | What Happens |
|------|-----------|-------------|
| 1 | **Resource Tick** | Owned tiles yield food, gold, stone; military consumes food |
| 2 | **Civ Agents** | Each civ's LLM decides: war, trade, alliance, capture, build, or idle |
| 3 | **World Engine** | Deterministic referee resolves all decisions — battle math, captures, trade deals |
| 4 | **Event Agent** | 20% chance of a random world event (drought, plague, gold, etc.) |
| 5 | **Narrator** | Generates 2-3 sentences of historical prose |
| 6 | **Memory Refresh** | Every 5 turns, compresses event history into memory summaries |
| 7 | **Persist** | Saves turn snapshot to MongoDB, emits SSE event |
| 8 | **Judge** | Checks domination (60% tiles), elimination, or stalemate |

No winner → loop back to step 1. Winner found → simulation ends.

![Hex Grid Map](./images/Screenshot%202026-05-26%20134355.png)

## The Four Civilizations

| Name | Traits | Starting Resources (G/F/S/M) |
|------|--------|------------------------------|
| The Ironhold Confederacy | militaristic, proud, distrustful, expansionist | 100/60/80/85 |
| The Verdant Pact | diplomatic, pacifist, nature-focused, generous | 80/140/60/30 |
| The Ashborne Merchant Guild | shrewd, transactional, neutral, opportunistic | 200/80/60/20 |
| The Silent Conclave | mysterious, isolationist, unpredictable, patient | 120/90/100/50 |

### World Parameters

| Parameter | Value |
|-----------|-------|
| Grid size | 15×15 (225 tiles) |
| Max turns | 50 |
| Starting tiles per civ | 3 |
| Event chance per turn | 20% |
| Tile types | plains (30%), forest (20%), mountain (15%), river (15%), coast (10%), ruins (10%) |
| Domination threshold | 60% of all tiles |
| Win conditions | Domination, elimination, or most tiles at turn 50 |

## Architecture

### Backend Stack

| Layer | Technology | Key Files |
|-------|-----------|-----------|
| API | FastAPI + Uvicorn | `api/server.py`, `api/routes.py` |
| Database | MongoDB + Motor + Beanie ODM | `db/client.py`, `db/repositories/` |
| Simulation | LangGraph state machine | `simulation/loop.py` |
| Agents | OpenRouter LLM (via `utils/llm.py`) | `agents/civ_agent.py`, `agents/event_agent.py`, `agents/narrator_agent.py`, `agents/memory_manager.py` |
| World Engine | Pure Python referee | `agents/world_engine.py` |
| Hex Grid | Axial coordinates, pointy-top | `simulation/hex_grid.py`, `utils/hex_math.py` |
| Prompts | `.txt` templates with `{placeholder}` syntax | `prompts/`, `utils/prompt_builder.py` |
| SSE | In-memory pub/sub per simulation | `api/sse.py` |

### Frontend Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand |
| Visualization | D3.js (hex grid) |
| Icons | Lucide React |

### Data Model

Four MongoDB document types (Beanie ODM):

- **Simulation** — Top-level run with status, turn counter, winner, config
- **CivState** — Per-civ snapshot: resources, tiles, relationships, memory
- **Event** — Everything that happens: war, trade, disasters, narrator entries (21 event types)
- **Turn** — Full world snapshot with every tile owner and civ resource snapshots

![Event Chronicle](./images/Screenshot%202026-05-26%20134414.png)

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server + MongoDB connection status |
| `GET` | `/api/world/preview` | Generate a world preview (not saved) |
| `POST` | `/api/sim/start` | Start a new simulation (background task) |
| `POST` | `/api/sim/{id}/stop` | Pause a running simulation |
| `GET` | `/api/sim/{id}` | Get simulation status, turn, winner |
| `GET` | `/api/sim/{id}/stream` | SSE stream — live turn events |
| `GET` | `/api/sim/{id}/events` | Get all events (optionally by turn) |
| `GET` | `/api/sim/{id}/turns` | List all completed turns |
| `GET` | `/api/sims` | List recent simulations (limit 20) |

## Testing

Run the full test suite from the backend directory:

```bash
cd backend
uv run python scripts/smoke_test.py           # Models & DB connectivity
uv run python scripts/test_worldgen.py         # World generation
uv run python scripts/test_openrouter.py       # LLM API connectivity
uv run python scripts/test_single_turn.py      # Full end-to-end single turn
```

The single-turn test (`test_single_turn.py`) runs one complete turn without a database: generates the world, calls the LLM for all civ decisions, resolves through the world engine, rolls for an event, narrates, and prints everything to console.

## Configuration

Create `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-...
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=civilex
FRONTEND_URL=http://localhost:3000
```

World and civ defaults are in `configs/`:

- **`configs/world_params.json`** — Grid size, max turns, tile yields/weights, event chance, win thresholds
- **`configs/default_civs.json`** — 4 civilizations with traits, personalities, starting resources, colors, spawn corners

### Prompt Templates

Four `.txt` files in `backend/prompts/` define LLM agent behaviour:

| Template | Purpose |
|----------|---------|
| `civ_system.txt` | Civ identity, 6 actions (declare_war, propose_trade, form_alliance, capture_tile, build_infrastructure, idle), JSON output format |
| `event_agent.txt` | 6 world event types with narrative targeting guidance |
| `narrator_system.txt` | Historical prose style guide — formal, past tense, 2-3 sentences |
| `memory_system.txt` | Compresses event history into second-person summary, refreshed every 5 turns |

## World Engine Resolution Order

Decisions are resolved each turn in priority order:

1. **Resource tick** — Tiles yield food/gold/stone; military consumes food; starvation reduces military
2. **War** — Battle math: `attacker_power = military * random(0.8, 1.2)`, attacker wins if `att_power > def_military * 0.6`. Casualties on both sides (5-15% attacker, 10-25% defender). Border tile seized on victory. Relationship penalty (-40)
3. **Tile capture** — Requires military advantage for contested tiles
4. **Infrastructure** — Costs 50 stone, permanently +10% food yield on all owned tiles
5. **Trade** — Auto-accept if relationship ≥ 20, auto-reject if ≤ -20, coin flip otherwise; both gain 30 gold
6. **Alliance** — Requires relationship ≥ 0; +40 relationship boost
7. **Elimination** — Civs with 0 tiles marked dead

## Win Conditions

The Judge (`simulation/judge.py`) evaluates three conditions after every turn:

- **Domination** — A civ controls ≥ 60% of all tiles
- **Elimination** — Only one civ remains alive
- **Stalemate** — Max turns (50) reached; civ with most tiles wins

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Civ overview cards, DB status, Start Simulation button, recent simulations |
| `/history` | History | List of past simulations with winner, turn count, status |
| `/simulation/[id]` | Sim View | Live hex map (D3.js), event chronicle feed, civ resource panels, win screen |

### Frontend Components

- **HexGrid** — D3.js SVG rendering of the 15×15 hex grid with tile type colors, owner overlays, hover tooltips, and animated ownership transitions
- **CivPanel** — Bottom bar showing all 4 civs with resource bars, tile counts, relationship dots, last action
- **EventFeed** — Right sidebar scrollable timeline with narrator blocks and event cards, auto-scrolls
- **SimControls** — Top bar with turn counter, progress bar, status badge, stop button
- **WinScreen** — Overlay with trophy, winner name, win type, final narrative, and navigation

## Backend Files Reference

| File | Purpose |
|------|---------|
| `api/server.py` | FastAPI app factory with CORS and MongoDB lifespan |
| `api/routes.py` | All HTTP endpoints |
| `api/sse.py` | SSE pub/sub for live streaming |
| `config.py` | Pydantic Settings from `.env` |
| `db/client.py` | MongoDB connect/close/ping |
| `db/indexes.py` | Index creation |
| `db/repositories/` | Async CRUD for Simulation, Event, Turn |
| `models/` | Beanie ODM documents: Simulation, CivState, Event, Turn |
| `simulation/hex_grid.py` | Axial coordinate hex geometry |
| `simulation/world_state.py` | World generation with weighted random tile types |
| `simulation/civilizations.py` | Civ config loader and initial state builder |
| `simulation/loop.py` | LangGraph simulation state machine |
| `simulation/judge.py` | Win condition evaluator |
| `utils/hex_math.py` | Border detection, pathfinding, territory math |
| `utils/prompt_builder.py` | Prompt template loader and filler |
| `utils/llm.py` | OpenRouter API wrapper |
| `agents/` | All LLM agents and the world engine referee |

## Project Status

**Phase 5 — Frontend Application** — Complete. All five phases are implemented:

| Phase | Status |
|-------|--------|
| 1 — Backend Scaffold (FastAPI + MongoDB) | Complete |
| 2 — World Generation & Config | Complete |
| 3 — Agents & World Engine | Complete |
| 4 — Full Simulation Loop (LangGraph) | Complete |
| 5 — Frontend Application (Next.js + D3) | Complete |

The initial product is ready for local deployment and experimentation. Start the backend and frontend, click "Start Simulation," and watch history unfold.
