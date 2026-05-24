# AI Civilization Simulator

Spawn AI-driven civilizations on a hexagonal grid world and watch history write itself. Each civilization's decisions — diplomacy, war, trade, expansion — are powered by a large language model via the OpenRouter API, adjudicated by a deterministic world engine, and narrated into historical chronicles.

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
| 3 | Agent system + world engine + prompts + end-to-end test | ✅ Complete |
| 4 | Full simulation loop | ✅ Complete |
| 5 | Live viewer | ⏳ Pending |
| 6 | History viewer | ⏳ Pending |

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

`civ_system.txt` includes per-turn context: current resources, tile count, relationships with mood labels (allied/friendly/neutral/hostile/at war), memory summary, and a compact world state of other civs. `event_agent.txt` prioritises dramatic tension and power-balancing — drought targets the civ with most food, plague targets the strongest military, natural disaster hits a dominant civ, ancient ruins rewards the underdog. `narrator_system.txt` maps tone to content: wars are grave, alliances cautiously optimistic, betrayals darkly dramatic, world events biblical, quiet turns ominous. `memory_system.txt` writes in second person ("You declared war on the Verdant Pact on turn 4...") and ends with current strategic state.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server + MongoDB connection status |
| `GET` | `/api/world/preview?grid_size=15&seed=42` | Generate a fresh world (not saved). Returns tiles, civ positions, distribution |

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

## File Reference

| File | What It Does |
|------|-------------|
| `api/server.py` | FastAPI app factory, CORS, lifespan |
| `api/routes.py` | HTTP endpoints (`/health`, `/world/preview`) |
| `config.py` | Pydantic `Settings` loaded from `.env` |
| `db/client.py` | `connect_db`, `close_db`, `ping_db` |
| `db/indexes.py` | MongoDB index creation |
| `models/simulation.py` | `Simulation` + `SimConfig` + `SimStatus` |
| `models/civ_state.py` | `CivState` + `Resources` |
| `models/event.py` | `Event` + `EventType` (21 values) |
| `models/turn.py` | `Turn` + `WorldSnapshot` + `TileSnapshot` |
| `simulation/hex_grid.py` | `Hex` dataclass, axial coords, geometry |
| `simulation/world_state.py` | World generation, tile assignment |
| `simulation/civilizations.py` | Civ config loader, initial states |
| `utils/hex_math.py` | Border detection, pathfinding, territory |
| `utils/prompt_builder.py` | Prompt template loader + fillers |
| `utils/llm.py` | OpenRouter API wrapper |
| `agents/civ_agent.py` | LLM-powered civ decision agent |
| `agents/world_engine.py` | Deterministic turn resolution referee |
| `agents/event_agent.py` | Random world event generator |
| `agents/narrator_agent.py` | Historical chronicle writer |
| `agents/memory_manager.py` | Event history compression |
| `prompts/civ_system.txt` | Civ identity + decision format (45 lines) |
| `prompts/event_agent.txt` | World event rules + output format (36 lines) |
| `prompts/narrator_system.txt` | Narration style guide (41 lines) |
| `prompts/memory_system.txt` | Memory compression instructions (26 lines) |
| `scripts/test_single_turn.py` | Full single-turn end-to-end test |
| `frontend/src/app/page.tsx` | Dashboard with civ cards + DB status |
| `frontend/src/lib/apiClient.ts` | Typed `apiFetch<T>` helper |
| `frontend/src/store/*.ts` | Zustand stores (sim, event, world) |
| `frontend/src/types/*.ts` | TypeScript definitions |
| `configs/default_civs.json` | 4 civ definitions |
| `configs/world_params.json` | Grid, tiles, events, win conditions |
