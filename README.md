# AI Civilization Simulator

Spawn AI-driven civilizations on a hexagonal grid world and watch history write itself. Each civilization's decisions — diplomacy, war, trade, expansion — are powered by a large language model via the OpenRouter API, adjudicated by a deterministic world engine, and narrated into historical chronicles.

```
civilex/
├── backend/       Python FastAPI + MongoDB (Beanie ODM)
├── frontend/      Next.js 16 + React 19 + Tailwind CSS 4 + Zustand + D3
└── configs/       World parameters & civilization configuration
```

---

## How It Works

Each turn, the simulation runs a LangGraph state machine with 8 nodes:

1. **🤖 Civ agents** — Each civilization's LLM decides its next move (war, trade, alliance, expand, build, or idle)
2. **⚙️ World engine** — Deterministic referee resolves all decisions: battle math, tile captures, trade deals, resource yields, food consumption
3. **🌪️ Event agent** — 20% chance of a random world event (drought, plague, gold discovery, rebellion, etc.)
4. **📜 Narrator** — Generates 2-3 sentences of historical prose chronicling the turn
5. **🧠 Memory refresh** — Every 5 turns, compresses each civ's event history into a memory summary
6. **💾 Persist** — Saves turn snapshot, events, and civ states to MongoDB; emits SSE event
7. **🏆 Judge** — Checks domination (60% tiles), elimination (one civ left), or stalemate (max turns)
8. **🔁 Loop** — If no winner, advance turn and repeat

---

## Getting Started

### Prerequisites

- **Python 3.11+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 20+**
- **MongoDB** — local or [Atlas](https://www.mongodb.com/atlas)
- **OpenRouter API key** — register at https://openrouter.ai/keys

### Backend

```bash
cd backend
uv sync                              # Install Python deps into .venv
# Edit .env (copy from template below)
uv run python api/server.py          # Starts at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                          # Opens at http://localhost:3000
```

---

## Quick Test — Single Turn End-to-End

Run one complete turn of the simulation without starting the server:

```bash
cd backend
uv run python scripts/test_single_turn.py
```

This does everything in sequence:
1. Generates a 15×15 hex world (seed=42)
2. Builds turn-0 civ states for all 4 civilizations
3. Calls the LLM for each civ's decision (in parallel)
4. Resolves all decisions through the world engine (war, trade, alliances, infrastructure, captures)
5. Rolls for a random world event (drought, plague, gold discovery, etc.)
6. Narrates the turn in historical prose
7. Prints everything to the console

No database writes — pure simulation.

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

### World Parameters

| Parameter | Value |
|-----------|-------|
| Grid size | 15×15 (225 tiles) |
| Max turns | 50 |
| Starting tiles per civ | 3 |
| Event chance per turn | 20% |
| Tile types | plains (30%), forest (20%), mountain (15%), river (15%), coast (10%), ruins (10%) |
| Win: domination | 60% of all tiles |
| Win: elimination | Enabled |
| Win: diplomatic | 10 turns of alliance victory |

---

## Architecture

The simulation runs in a 7-step loop each turn:

```
  1. Resource tick    — owned tiles yield food/gold/stone
  2. Agent decisions  — LLM decides each civ's next move
  3. World engine     — deterministic resolution of all decisions
  4. Event agent      — 20% chance of random world event
  5. Elimination check— civs with 0 tiles are removed
  6. Memory refresh   — compress event log into memory summary
  7. Narrator         — write historical chronicle entry
```

**World Engine** (`agents/world_engine.py`) — Pure Python referee. Resolves wars (battle math with random variance), tile captures, trade deals, alliances, infrastructure projects, resource collection, food consumption, and starvation penalties.

**Civ Agent** (`agents/civ_agent.py`) — Each civ is an LLM agent returning a structured JSON decision. All civs decide in parallel via `asyncio.gather`. Retry logic with fallback to idle on failure.

**Event Agent** (`agents/event_agent.py`) — 20% chance per turn. LLM picks the most dramatically interesting event type with magnitude (1-3), applied deterministically.

**Narrator Agent** (`agents/narrator_agent.py`) — Writes 2-3 sentences of historical prose per turn. Formal, dramatic tone — past tense, no meta references.

**Memory Manager** (`agents/memory_manager.py`) — Every 5 turns, compresses each civ's event history into a 3-sentence second-person memory summary injected into their agent prompt.

**Prompt Builder** (`utils/prompt_builder.py`) — Loads `.txt` templates and fills them with live simulation data via `{placeholder}` syntax.

---

## Prompt Templates

Four `.txt` files in `backend/prompts/` define LLM agent behaviour:

| Template | Lines | Purpose |
|----------|-------|---------|
| `civ_system.txt` | 45 | Civ identity + 6 actions (`declare_war`, `propose_trade`, `form_alliance`, `capture_tile`, `build_infrastructure`, `idle`) with JSON output format and decision rules |
| `event_agent.txt` | 36 | 6 world event types (drought, plague, gold discovery, natural disaster, ancient ruins, rebellion) with narrative targeting guidance |
| `narrator_system.txt` | 41 | Historical prose style guide — formal, past tense, 2-3 sentences, no meta-references, tone per event type |
| `memory_system.txt` | 26 | 3-sentence memory compression — second person, major events only, refreshed every 5 turns |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server + MongoDB connection status |
| `GET` | `/api/world/preview?grid_size=15&seed=42` | Generate a fresh world (not saved). Returns tiles, civ positions, distribution |
| `POST` | `/api/sim/start` | Start a new simulation (background task). Body: `{grid_size, max_turns, civ_ids}` |
| `POST` | `/api/sim/{id}/stop` | Pause a running simulation |
| `GET` | `/api/sim/{id}` | Get simulation status, turn, winner, config |
| `GET` | `/api/sim/{id}/stream` | SSE stream — live `sim_start`, `turn_complete`, `sim_end` events |
| `GET` | `/api/sim/{id}/events?turn=N` | Get all events (optionally filtered by turn) |
| `GET` | `/api/sim/{id}/turns` | List all completed turns |
| `GET` | `/api/sims` | List recent simulations (limit 20) |

---

## Data Model

Four MongoDB document types (Beanie ODM):

| Document | Purpose |
|----------|---------|
| **Simulation** | Top-level run — status, turn counter, winner, config |
| **CivState** | Per-civ per-turn snapshot — resources, tiles, relationships, memory |
| **Event** | Everything that happens — war, trade, disasters, narrator (21 event types) |
| **Turn** | Full world snapshot — every tile with owner + all civ resource snapshots |

---

## Running Tests

```bash
cd backend
uv run python scripts/smoke_test.py           # Phase 1 — models & DB
uv run python scripts/test_worldgen.py         # Phase 2 — world generation
uv run python scripts/test_openrouter.py       # LLM connectivity
uv run python scripts/test_single_turn.py      # Phase 3 — full turn end-to-end
```

---

## Phase 1 — Backend Scaffold

- **FastAPI** with CORS middleware, lifespan hooks for MongoDB connect/disconnect
- **MongoDB** via Motor + Beanie ODM (`db/client.py`)
- Four **document models**: `Simulation`, `CivState`, `Event` (21 EventType values), `Turn`
- Database **indexes**: unique compound indexes on `(sim_id, turn)`, `(sim_id, turn, civ_id)`
- Health endpoint returning server + DB status

---

## Phase 2 — World Generation & Config

**Hex Grid** (`simulation/hex_grid.py`) — Immutable `Hex(q, r)` dataclass using axial coordinates (pointy-top). 6-direction neighbors, Manhattan distance, ring/spiral generation, pixel coordinate conversion, 15×15=225 tile grid centered on (0,0), corner hexes for spawning.

**World Generator** (`simulation/world_state.py`) — Weighted random tile type assignment (plains 30%, forest 20%, mountain/river 15%, coast/ruins 10%). 3 contiguous starting tiles per civ via spiral expansion. Builds `WorldSnapshot` with tiles and civ resource snapshots.

**Civilization Builder** (`simulation/civilizations.py`) — Loads 4 civ configs from JSON. Builds turn-0 `CivState` documents with resources and neutral relationships. Helpers: `get_civ_config`, `get_civ_personality`, `get_all_civ_ids`.

**LLM Client** (`utils/llm.py`) — Wraps OpenRouter `/v1/chat/completions`. Configurable model/temperature/max tokens. Runs blocking HTTP in a threadpool executor.

**Hex Math** (`utils/hex_math.py`) — `get_tiles_in_range`, `get_border_tiles`, `is_connected` (BFS), `find_path` (BFS), `tiles_owned_by`, `domination_percentage`.

---

## Phase 3 — Agents & World Engine

### Civ Agent (`agents/civ_agent.py`)

Each civ is an LLM agent receiving a system prompt (identity, personality, rules) and a user message (resources, relationships, memory, world state). Returns validated JSON:
- **6 actions**: declare_war, propose_trade, form_alliance, capture_tile, build_infrastructure, idle
- **target**: civ_id, tile coords ("q,r"), or null
- **reasoning**: 2-3 sentences in character
- **tone**: aggressive, diplomatic, cautious, mysterious, opportunistic
- Up to 2 retries on parse failure, falls back to idle. All civs decide in parallel.

### World Engine (`agents/world_engine.py`)

Deterministic referee. Resolution order by priority:

1. **Resource tick** — tiles yield food/gold/stone; military consumes food; starvation reduces military
2. **War** — battle math: `attacker_power = military * random(0.8, 1.2)`, attacker wins if `att_power > def_military * 0.6`. Casualties both sides (5-15% attacker, 10-25% defender). Border tile seized on victory. Relationship penalty (-40)
3. **Tile capture** — requires military advantage for contested tiles; small military loss on contested attempts
4. **Infrastructure** — costs 50 stone, permanently +10% food on all owned tiles
5. **Trade** — auto-accept if relationship ≥ 20, auto-reject if ≤ -20, coin flip otherwise; both gain 30 gold
6. **Alliance** — requires relationship ≥ 0; +40 relationship boost. Auto-reject if hostile
7. **Elimination** — civs with 0 tiles marked dead

### Event Agent (`agents/event_agent.py`)

20% chance per turn. LLM picks from 6 types: drought (reduces food tiles), plague (reduces military), gold discovery (boosts neutral tile), natural disaster (removes border tiles), ancient ruins found (grants gold), rebellion (starving civ loses a tile). Magnitude 1-3.

### Narrator Agent (`agents/narrator_agent.py`)

Writes 2-3 sentences of formal historical prose each turn. Past tense, no meta-references. The system prompt includes 3 example entries showing the desired style.

### Memory Manager (`agents/memory_manager.py`)

Every 5 turns, compresses each civ's event history into a 3-sentence second-person summary using LangChain's `ChatOpenAI` wrapper. Only refreshes when `turn % 5 == 0` to save API calls.

---

## Phase 4 — Full Simulation Loop

The simulation loop uses **LangGraph** (`simulation/loop.py`) to orchestrate a state machine with these nodes executed sequentially each turn:

1. **increment_turn** — advance turn counter, check pause status, update DB
2. **run_civ_agents** — query all alive civs for decisions via OpenRouter (parallel)
3. **run_world_engine** — resolve war/trade/alliance/capture/infrastructure + resource tick
4. **run_event_agent** — 20% chance of random world event (drought, plague, gold, etc.)
5. **run_narrator** — generate 2-3 sentences of historical lore
6. **refresh_memory** — compress event log into memory summaries every 5 turns
7. **persist_turn** — save turn snapshot, events, and updated civ states to MongoDB; emit SSE event
8. **check_winner** — evaluate domination/elimination/stalemate conditions

After `check_winner`, the graph either terminates (`END`) or loops back to `increment_turn`.

**Judge** (`simulation/judge.py`) — Evaluates three win conditions each turn:
- **Domination** — a civ controls ≥ 60% of all tiles
- **Elimination** — only one civ remains alive
- **Stalemate** — max turns reached; civ with most tiles wins

**SSE Streaming** (`api/sse.py`) — In-memory pub/sub with per-simulation `asyncio.Queue`. Clients connect to `GET /api/sim/{id}/stream` and receive `sim_start`, `turn_complete`, `sim_end`, and `sim_error` events as JSON over Server-Sent Events.

**Database persistence** (`db/repositories/`) — `sim_repo.py`, `event_repo.py`, `turn_repo.py` provide async CRUD for Simulation, Event, and Turn documents. `persist_turn` saves the turn snapshot, all events (with narrator entry), and updated `CivState` records.

**API routes** (`api/routes.py`) — Full CRUD: `POST /api/sim/start` (background task via `BackgroundTasks`), `POST /api/sim/{id}/stop`, `GET /api/sim/{id}`, `GET /api/sim/{id}/events`, `GET /api/sim/{id}/turns`, `GET /api/sims`.

**Simulation config** — `POST /api/sim/start` accepts `SimConfig` with `grid_size`, `max_turns`, and `civ_ids`. The simulation is created in MongoDB with status `pending`, then launched as a background task that generates the world, builds initial civ states, and runs the LangGraph loop.

---

## Phase 5 — Frontend Application

The frontend is a **Next.js 16** single-page application with React 19, Tailwind CSS 4, Zustand, and D3.js. It connects to the backend API and SSE stream to provide real-time simulation viewing.

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Civ overview cards, DB status, Start Simulation button, recent simulations |
| `/history` | History | List of all past simulations with winner, turn count, date |
| `/simulation/[id]` | Sim View | Live hex map, event chronicle, civ panels, win screen |

### Components

| Component | Description |
|-----------|-------------|
| **HexGrid** | D3.js SVG rendering of the 15×15 hex grid. Converts axial coords to pixel positions. Tile fill blends terrain color with owner color. Stroke reflects ownership. Hover tooltip shows tile details. Animated transitions on ownership changes. |
| **CivPanel** | Horizontal bottom bar showing all 4 civs simultaneously. Per-civ card: icon, name, tile count, alive/eliminated status, resource bars scaled relative to max, last action text, relationship dots (green→red gradient). |
| **EventFeed** | Right sidebar scrollable timeline. Groups events per turn with narrator blocks (amber-bordered quotes) and event cards (icons, colored labels, narrative text). Auto-scrolls at bottom. |
| **SimControls** | Top bar: turn counter, progress bar, status badge (green pulse for running), stop button, stream status indicator. |
| **WinScreen** | Overlay on sim completion. Trophy icon, win type label, winner name with civ icon, final narrative quote. Dynamic gradient background using winner's color. |

### State Management (Zustand)

| Store | Purpose |
|-------|---------|
| `useSimStore` | Current simulation metadata (id, status, turn, winner, config) |
| `useWorldStore` | World state (tiles, civ resources) and civ states |
| `useEventStore` | Event log array and narrator log entries |

### Hooks

| Hook | Description |
|------|-------------|
| `useSimulation` | `startSim()` — POSTs to API and navigates to sim page. `stopSim()` — POSTs stop and updates store. Tracks loading/error states. |
| `useEventStream` | Manages `EventSource` SSE connection. Handles `sim_start`, `turn_complete`, `sim_end`, `sim_error` events. Updates all three Zustand stores. Auto-cleanup on unmount. |

---

## File Reference

### Backend

| File | What It Does |
|------|-------------|
| `api/server.py` | FastAPI app factory, CORS, lifespan |
| `api/routes.py` | HTTP endpoints for health, world preview, sim CRUD |
| `api/sse.py` | SSE pub/sub manager + streaming endpoint |
| `config.py` | Pydantic `Settings` loaded from `.env` |
| `db/client.py` | `connect_db`, `close_db`, `ping_db` |
| `db/indexes.py` | MongoDB index creation |
| `db/repositories/sim_repo.py` | Async CRUD for Simulation documents |
| `db/repositories/event_repo.py` | Async CRUD for Event documents |
| `db/repositories/turn_repo.py` | Async CRUD for Turn documents |
| `models/simulation.py` | `Simulation` + `SimConfig` + `SimStatus` |
| `models/civ_state.py` | `CivState` + `Resources` |
| `models/event.py` | `Event` + `EventType` (21 values) |
| `models/turn.py` | `Turn` + `WorldSnapshot` + `TileSnapshot` |
| `simulation/hex_grid.py` | `Hex` dataclass, axial coords, geometry |
| `simulation/world_state.py` | World generation, tile assignment |
| `simulation/civilizations.py` | Civ config loader, initial states |
| `simulation/loop.py` | LangGraph simulation state machine |
| `simulation/judge.py` | Win condition evaluator |
| `utils/hex_math.py` | Border detection, pathfinding, territory |
| `utils/prompt_builder.py` | Prompt template loader + fillers |
| `utils/llm.py` | OpenRouter API wrapper |
| `agents/civ_agent.py` | LLM-powered civ decision agent |
| `agents/world_engine.py` | Deterministic turn resolution referee |
| `agents/event_agent.py` | Random world event generator |
| `agents/narrator_agent.py` | Historical chronicle writer |
| `agents/memory_manager.py` | Event history compression |
| `prompts/civ_system.txt` | Civ identity + decision format |
| `prompts/event_agent.txt` | World event rules + output format |
| `prompts/narrator_system.txt` | Narration style guide |
| `prompts/memory_system.txt` | Memory compression instructions |
| `scripts/smoke_test.py` | Models & DB smoke test |
| `scripts/test_worldgen.py` | World generation test |
| `scripts/test_openrouter.py` | LLM connectivity test |
| `scripts/test_single_turn.py` | Full single-turn end-to-end test |

### Frontend

| File | What It Does |
|------|-------------|
| `src/app/page.tsx` | Dashboard — hero, DB status, civ cards, start button, recent sims |
| `src/app/history/page.tsx` | Simulation history list with winner, turn count, status |
| `src/app/simulation/[id]/page.tsx` | Sim view — hex map, chronicle, civ panels, controls, win screen |
| `src/components/HexGrid.tsx` | D3.js SVG hex grid with hover tooltips, animated transitions |
| `src/components/CivPanel.tsx` | Horizontal bottom bar with all 4 civ resource/status cards |
| `src/components/EventFeed.tsx` | Scrollable timeline of events and narrator entries |
| `src/components/SimControls.tsx` | Turn counter, progress bar, status, stop button |
| `src/components/WinScreen.tsx` | Victory overlay with narrative, winner, navigation |
| `src/hooks/useEventStream.ts` | SSE connection manager, parses all event types |
| `src/hooks/useSimulation.ts` | Start/stop simulation lifecycle actions |
| `src/lib/apiClient.ts` | Typed API fetch wrapper |
| `src/lib/civColors.ts` | Civ color/icon/name and tile/event constants |
| `src/lib/hexUtils.ts` | Hex-to-pixel conversion and SVG polygon generation |
| `src/store/simStore.ts` | Simulation metadata Zustand store |
| `src/store/worldStore.ts` | World + civ state Zustand store |
| `src/store/eventStore.ts` | Events + narrator log Zustand store |
| `src/types/simulation.ts` | `Simulation`, `SimConfig`, `SimStatus` types |
| `src/types/civilization.ts` | `CivConfig`, `CivState`, `Resources` types |
| `src/types/world.ts` | `WorldState`, `HexTile`, `TileType`, `Turn` types |
| `src/types/events.ts` | `SimEvent`, `EventType`, `TurnPayload` types |

### Config

| File | What It Does |
|------|-------------|
| `configs/world_params.json` | Grid size, max turns, tile yields/weights, event chance, win thresholds |
| `configs/default_civs.json` | 4 civilizations: traits, personalities, starting resources, colors, spawn corners |
