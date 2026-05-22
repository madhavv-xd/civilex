# AI Civilization Simulator

Spawn AI-driven civilizations on a hexagonal grid world and watch history write
itself. Each civilization's decisions — diplomacy, war, trade, expansion — are
powered by a large language model via the OpenRouter API.

```
civilex/
├── backend/       Python FastAPI + MongoDB (Beanie ODM)
├── frontend/      Next.js 16 + React 19 + Tailwind CSS 4 + Zustand
└── configs/       World parameters & civilization configuration
```

---

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Backend scaffold + data models | ✅ Complete |
| 2 | Hex grid world gen + civ configs + LLM client | ✅ Complete |
| 3 | Config files | ✅ Complete |
| 4 | Simulation engine | ⏳ Pending |
| 5 | Live viewer | ⏳ Pending |
| 6 | History viewer | ⏳ Pending |

---

## Getting Started

### Prerequisites

- **Python 3.12+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 20+**
- **MongoDB** — local or [Atlas](https://www.mongodb.com/atlas)
- **OpenRouter API key** — register at https://openrouter.ai/keys

### Backend

```bash
cd backend
uv sync                         # Install Python deps into .venv
# Edit .env (copy from template below)
uv run python api/server.py     # Starts at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # Opens at http://localhost:3000
```

---

## Configuration

Create `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-...
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=civilex
```

World and civ defaults are in `configs/`:

| File | Purpose |
|------|---------|
| `configs/world_params.json` | Grid size (15), max turns (50), tile types with yields & weights, event chance, win conditions |
| `configs/default_civs.json` | 4 civilizations with traits, personality prompts, starting resources, spawn corners |

### The Four Civilizations

| Name | Traits | Starting Resources (G/F/S/M) |
|------|--------|------------------------------|
| The Ironhold Confederacy | militaristic, proud, distrustful, expansionist | 100/60/80/85 |
| The Verdant Pact | diplomatic, pacifist, nature-focused, generous | 80/140/60/30 |
| The Ashborne Merchant Guild | shrewd, transactional, neutral, opportunistic | 200/80/60/20 |
| The Silent Conclave | mysterious, isolationist, unpredictable, patient | 120/90/100/50 |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server + MongoDB connection status |
| `GET` | `/api/world/preview?grid_size=15&seed=42` | Generate a fresh world (not saved to DB). Returns tiles, civ positions, distribution |

---

## Data Model

Four MongoDB document types (Beanie ODM):

| Document | Purpose |
|----------|---------|
| **Simulation** | Top-level run — status, turn counter, winner, config |
| **CivState** | Per-civ per-turn snapshot — resources, tiles, relationships, memory |
| **Event** | Everything that happens — war, trade, disasters, narrator entries |
| **Turn** | Full world snapshot — every tile + all civ resource snapshots |

---

## Running Tests

```bash
cd backend
uv run python scripts/smoke_test.py         # Phase 1 — models & DB
uv run python scripts/test_worldgen.py       # Phase 2 — world generation
uv run python scripts/test_openrouter.py     # LLM connectivity
```

---

## Phase 1 — Scaffold

**Goal:** Get the project skeleton standing with both backend and frontend talking
to each other.

### Backend

- **FastAPI** application with CORS middleware, lifespan hooks to connect/disconnect
  MongoDB on startup/shutdown (`backend/api/server.py`)
- **MongoDB** connection via Motor (async driver) + Beanie ODM (`backend/db/client.py`)
- All four core **document models** defined with Pydantic validation:
  - `Simulation` — status (pending/running/paused/completed/failed), turn counter, winner
  - `CivState` — resources (gold/food/stone/military), traits, alive flag, relationships, memory
  - `Event` — typed events (war, peace, trade, drought, plague, narrator, etc.)
  - `Turn` — full world snapshot (tile grid + civ resource snapshots)
- Database **index creation** (`backend/db/indexes.py`) — compound unique indexes on
  `(sim_id, turn)`, `(sim_id, turn, civ_id)`
- Health endpoint returning server + DB status

### Frontend

- **Next.js 16** app with Tailwind CSS v4, Geist font, dark theme (`globals.css`)
- **Dashboard page** (`page.tsx`) — shows 4 civ cards, MongoDB connection pill,
  disabled "Start Simulation" button (wired in Phase 4), phase progress indicator
- **Placeholder pages** — `/history` (Phase 6) and `/simulation/[id]` (Phase 5)
- **Three Zustand stores** — `simStore` (current sim + status), `eventStore`
  (event list + narrator log), `worldStore` (world + civ states)
- Typed **API client** (`apiClient.ts`) — generic `apiFetch<T>` wrapping `fetch()`
- Full **TypeScript types** mirroring backend models — `Simulation`, `SimConfig`,
  `CivState`, `Resources`, `HexTile`, `WorldState`, `SimEvent`, `EventType`

---

## Phase 2 — World & Models

**Goal:** Build the hexagonal grid, generate a playable world, configure the
civilizations, and connect to the LLM.

### Hex Grid (`backend/simulation/hex_grid.py`)

Immutable `Hex(q, r)` dataclass using **axial coordinates** (pointy-top
orientation). Includes:
- **6-direction neighbor** lookup (`hex_neighbors`), **Manhattan distance**
- **Ring** (hexes at exact radius) and **spiral** (filled circle) generation
- **Pixel coordinate** conversion — `hex_to_pixel` and `pixel_to_hex` for
  rendering on the frontend map
- **Grid generation** — `generate_grid_coords(15)` creates a 15×15=225 tile
  rhombus centered on (0,0)
- **Corner hexes** for spawning — `get_corner_hexes` returns top-left/right,
  bottom-left/right positions with a 2-tile margin

### World Generator (`backend/simulation/world_state.py`)

- Loads `world_params.json` and `default_civs.json`
- **Tile type assignment** — weighted random selection (plains 30%, forest 20%,
  mountain/ river 15%, coast/ruins 10%); each type has food/gold/stone yields
- **Civ starting tiles** — 3 contiguous tiles per civ via spiral expansion from
  their spawn corner; no overlap between civs
- Builds a **`WorldSnapshot`** (all tiles with owners + civ resource snapshots)
- **`world_snapshot_to_dict`** serializer for API responses

### Civilization Builder (`backend/simulation/civilizations.py`)

- Loads 4 civ configs from JSON — traits, personality prompts, starting resources
- Builds turn-0 **`CivState` documents** with initial resources and neutral
  relationships to all other civs
- Helpers: `get_civ_config`, `get_civ_personality`, `get_all_civ_ids` (used by
  LLM agent prompts)

### LLM Client (`backend/utils/llm.py`)

- Wraps the **OpenRouter `/v1/chat/completions`** API
- Configurable model, temperature, max tokens
- Runs the blocking HTTP call in a threadpool executor (`run_in_executor`) so
  it doesn't block the async event loop

### Hex Math Utilities (`backend/utils/hex_math.py`)

- **`get_tiles_in_range`** — all valid grid tiles within a radius
- **`get_border_tiles`** — neutral/enemy tiles adjacent to owned territory
- **`is_connected`** — BFS flood-fill check for territory contiguity
- **`find_path`** — BFS pathfinding through passable tiles
- **`tiles_owned_by` / `domination_percentage`** — territory tracking

### World Preview Endpoint

`GET /api/world/preview?grid_size=15&seed=42` — generates a fresh world and
returns tile type distribution, civ starting positions, and the full tile data.
Used for frontend map debugging before the simulation engine is wired up.

---

## Files at a Glance

| File | What It Does |
|------|-------------|
| `backend/api/routes.py` | HTTP endpoints (`/health`, `/world/preview`) |
| `backend/api/server.py` | FastAPI app factory, CORS, lifespan |
| `backend/config.py` | Pydantic `Settings` loaded from `.env` |
| `backend/db/client.py` | `connect_db`, `close_db`, `ping_db` |
| `backend/db/indexes.py` | MongoDB index creation |
| `backend/models/simulation.py` | `Simulation` + `SimConfig` + `SimStatus` |
| `backend/models/civ_state.py` | `CivState` + `Resources` |
| `backend/models/event.py` | `Event` + `EventType` (21 values) |
| `backend/models/turn.py` | `Turn` + `WorldSnapshot` + `TileSnapshot` |
| `backend/simulation/hex_grid.py` | `Hex` dataclass, axial coords, geometry |
| `backend/simulation/world_state.py` | World generation, tile assignment |
| `backend/simulation/civilizations.py` | Civ config loader, initial states |
| `backend/utils/hex_math.py` | Border detection, pathfinding, territory |
| `backend/utils/llm.py` | OpenRouter API wrapper |
| `frontend/src/app/page.tsx` | Dashboard with civ cards + DB status |
| `frontend/src/lib/apiClient.ts` | Typed `apiFetch<T>` helper |
| `frontend/src/store/*.ts` | Zustand stores (sim, event, world) |
| `frontend/src/types/*.ts` | TypeScript definitions |
| `configs/default_civs.json` | 4 civ definitions |
| `configs/world_params.json` | Grid, tiles, events, win conditions |
