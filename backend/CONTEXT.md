## ARCHITECTURE

A python-based project composed of the following subsystems:

- **simulation/**: Primary subsystem containing 6 files
- **db/**: Primary subsystem containing 6 files
- **models/**: Primary subsystem containing 5 files
- **scripts/**: Primary subsystem containing 5 files
- **Root**: Contains scripts and execution points

## ENTRY_POINTS

*No entry points identified within budget.*

## SYMBOL_INDEX

**`config.py`**
- class `Settings`

**`models/civ_state.py`**
- class `Resources`
  - `__str__()`
  - `__repr__()`
- class `CivState`

**`models/turn.py`**
- class `TileSnapshot`
- class `CivResourceSnapshot`
- class `WorldSnapshot`
- class `Turn`

**`models/event.py`**
- class `EventType`
- class `Event`

**`models/simulation.py`**
- class `SimStatus`
- class `SimConfig`
- class `Simulation`

**`main.py`**
- `main()`

**`simulation/civilizations.py`**
- `load_civs_config()`
- `build_initial_civ_states()`
- `get_civ_config()`
- `get_civ_personality()`
- `get_all_civ_ids()`

**`db/repositories/event_repo.py`**
- `_safe_event_type()`
- `save_events()`
- `get_events_for_turn()`
- `get_events_for_sim()`
- `get_events_as_dicts()`

**`db/repositories/turn_repo.py`**
- `_dict_to_world_snapshot()`
- `save_turn()`
- `get_turn()`
- `get_all_turns()`

**`db/repositories/sim_repo.py`**
- `create_simulation()`
- `get_simulation()`
- `update_sim_turn()`
- `update_sim_status()`
- `set_sim_winner()`
- `get_all_simulations()`
- `is_sim_paused()`

**`simulation/world_state.py`**
- `_load_world_params()`
- `_load_civs_config()`
- `_pick_tile_type()`
- `_get_resource_yield()`
- `_assign_starting_tiles()`
- `generate_world()`
- `world_snapshot_to_dict()`

**`simulation/hex_grid.py`**
- class `Hex`
  - `__add__()`
  - `__sub__()`
  - `length()`
  - `distance()`
- `hex_neighbors()`
- `hex_distance()`
- `hex_ring()`
- `hex_spiral()`
- `hex_to_pixel()`
- `pixel_to_hex()`
- `hex_round()`
- `generate_grid_coords()`
- `get_corner_hexes()`

**`db/client.py`**
- `connect_db()`
- `close_db()`
- `ping_db()`

**`utils/prompt_builder.py`**
- `load_template()`
- `build_civ_system_prompt()`
- `build_civ_user_message()`
- `build_world_summary()`
- `build_narrator_user_message()`
- `build_event_agent_user_message()`
- `build_memory_user_message()`

**`simulation/loop.py`**
- class `SimState`
- `_civ_doc_to_dict()`
- `increment_turn()`
- `run_civ_agents()`
- `run_world_engine()`
- `run_event_agent()`
- `run_narrator()`
- `refresh_memory()`
- `persist_turn()`
- `check_winner()`
- `should_continue()`
- `build_simulation_graph()`
- `run_simulation_loop()`

**`api/sse.py`**
- class `SseManager`
  - `__init__()`
  - `create_channel()`
  - `publish()`
  - `subscribe()`
  - `close_channel()`
- `stream_simulation()`

**`simulation/judge.py`**
- class `WinResult`
- `check_win()`

## IMPORTANT_CALL_PATHS

main.main()
## CORE_MODULES

### `README.md`

**Purpose:** Implements README.

### `config.py`

**Purpose:** Implements config.

**Types:**
- `Settings` (bases: `BaseSettings`)

### `models/civ_state.py`

**Purpose:** Implements civ state.

**Types:**
- `CivState` (bases: `Document`)
- `Resources` (bases: `BaseModel`) methods: `__repr__`, `__str__`

### `models/turn.py`

**Purpose:** Implements turn.

**Types:**
- `CivResourceSnapshot` (bases: `BaseModel`)
- `TileSnapshot` (bases: `BaseModel`)
- `Turn` (bases: `Document`)
- `WorldSnapshot` (bases: `BaseModel`)

### `models/event.py`

**Purpose:** Implements event.

**Types:**
- `Event` (bases: `Document`)
- `EventType` (bases: `str, Enum`)

### `models/simulation.py`

**Purpose:** Implements simulation.

**Types:**
- `SimConfig` (bases: `BaseModel`)
- `SimStatus` (bases: `str, Enum`)
- `Simulation` (bases: `Document`)

## SUPPORTING_MODULES

### `main.py`

```python
def main()

```

### `simulation/civilizations.py`

> 
Loads civilization configs and builds initial CivState documents
for a new simulation run.


```python
def load_civs_config() -> list[dict]
    """Load raw civ config from JSON."""

def build_initial_civ_states(
    sim_id: str,
    civ_tiles: dict[str, list],  # civ_id → list of starting Hex
) -> list[CivState]
    """Build turn-0 CivState documents for all 4 civs.
    Called once when a simulation starts.

    Args:
        sim_id: The MongoDB ID of the simulation run
        civ_tiles: Mapping from civ_id to their starting tile hexes

    Returns:
        List of CivState documents (not yet inserted to DB)"""

def get_civ_config(civ_id: str) -> dict | None
    """Look up a single civ's config by ID."""

def get_civ_personality(civ_id: str) -> str
    """Return the personality string for use in agent system prompts.
    Returns empty string if civ not found."""

def get_all_civ_ids() -> list[str]

```

### `db/repositories/event_repo.py`

> 
Event repository — save and query simulation events.


```python
def _safe_event_type(type_str: str) -> EventType
    """Safely convert string to EventType, falling back to civ_idle."""

def save_events(
    sim_id: str,
    turn: int,
    events: list[dict],
) -> list[Event]
    """Bulk insert events for a turn."""

def get_events_for_turn(sim_id: str, turn: int) -> list[Event]
    """Fetch all events for a specific turn."""

def get_events_for_sim(sim_id: str) -> list[Event]
    """Fetch full event log for a simulation."""

def get_events_as_dicts(sim_id: str) -> list[dict]
    """Fetch full event log as plain dicts for agent memory."""

```

### `db/repositories/turn_repo.py`

> 
Turn repository — save and query turn snapshots.


```python
def _dict_to_world_snapshot(world_dict: dict) -> WorldSnapshot
    """Convert raw world dict to WorldSnapshot model."""

def save_turn(
    sim_id: str,
    turn: int,
    world_snapshot_dict: dict,
) -> Turn
    """Save a turn snapshot to MongoDB."""

def get_turn(sim_id: str, turn: int) -> Turn | None
    """Fetch a specific turn snapshot."""

def get_all_turns(sim_id: str) -> list[Turn]
    """Fetch all turns for a simulation (for replay)."""

```

### `db/repositories/sim_repo.py`

> 
Simulation repository — clean data access for Simulation documents.


```python
def create_simulation(
    civ_ids: list[str],
    config: SimConfig | None = None,
) -> Simulation
    """Create and insert a new simulation document."""

def get_simulation(sim_id: str) -> Simulation | None
    """Fetch a simulation by ID."""

def update_sim_turn(sim_id: str, turn: int) -> None
    """Update the current turn counter."""

def update_sim_status(sim_id: str, status: SimStatus) -> None
    """Update simulation status."""

def set_sim_winner(
    sim_id: str,
    winner_id: str,
    win_type: str,
    final_narrative: str,
) -> None
    """Mark a simulation as complete with a winner."""

def get_all_simulations(limit: int = 20) -> list[Simulation]
    """Fetch recent simulations for the history page."""

def is_sim_paused(sim_id: str) -> bool
    """Check if a simulation has been paused/stopped."""

```

### `simulation/world_state.py`

> 
World state generator.
Builds a fresh 15×15 hex grid with tile types, resources, and civ starting positions.


```python
def _load_world_params() -> dict

def _load_civs_config() -> list[dict]

def _pick_tile_type(params: dict, rng: random.Random) -> str
    """Weighted random tile type selection."""

def _get_resource_yield(tile_type: str, params: dict) -> tuple[float, float, float]
    """Return (food, gold, stone) yield for a tile type."""

def _assign_starting_tiles(
    civ_id: str,
    corner: Hex,
    all_hex_set: set[Hex],
    already_owned: set[Hex],
    n: int = 3,
) -> list[Hex]
    """Give a civ `n` contiguous starting tiles centred on its corner.
    Uses spiral expansion so tiles are always adjacent."""

def generate_world(
    grid_size: int | None = None,
    seed: int | None = None,
) -> tuple[WorldSnapshot, dict[str, list[Hex]]]
    """Generate a fresh world.

    Returns:
        world_snapshot: WorldSnapshot — ready to store in MongoDB
        civ_tiles: dict mapping civ_id → list of their starting Hex positions"""

def world_snapshot_to_dict(snapshot: WorldSnapshot) -> dict
    """Serialize WorldSnapshot to a plain dict for API responses."""

```

### `simulation/hex_grid.py`

> 
Hex grid using axial coordinates (q, r) with pointy-top orientation.

Axial coordinate system:
  - q increases going right
  - r increases going down-right
  - s = -q - r (derived, not stored)

Pointy-top hex means the flat sides face left/right.


```python
class Hex

def hex_neighbors(h: Hex) -> list[Hex]
    """Return all 6 neighbors of a hex."""

def hex_distance(a: Hex, b: Hex) -> int
    """Manhattan distance between two hexes."""

def hex_ring(center: Hex, radius: int) -> list[Hex]
    """Return all hexes exactly `radius` steps from center."""

def hex_spiral(center: Hex, radius: int) -> list[Hex]
    """Return center hex + all hexes within `radius` steps (filled circle)."""

def hex_to_pixel(h: Hex, size: float) -> tuple[float, float]
    """Convert axial hex coords to pixel center (pointy-top).
    `size` is the distance from center to corner."""

def pixel_to_hex(x: float, y: float, size: float) -> Hex
    """Convert pixel coords back to the nearest hex (pointy-top)."""

def hex_round(fq: float, fr: float) -> Hex
    """Round fractional axial coords to the nearest integer hex."""

def generate_grid_coords(grid_size: int) -> list[Hex]
    """Generate all hex coordinates for a rhombus-shaped grid.
    grid_size=15 gives a 15x15 = 225 tile grid.
    Offset so the grid is centred around (0,0)."""

def get_corner_hexes(grid_size: int) -> dict[str, Hex]
    """Return the four corner hexes for a given grid size.
    Used for spawning civilizations."""

```

### `db/client.py`

```python
def connect_db() -> None

def close_db() -> None

def ping_db() -> bool

```

### `utils/prompt_builder.py`

> 
Builds prompt strings from .txt templates and world state data.


```python
def load_template(filename: str) -> str
    """Load a prompt template from the prompts/ directory."""

def build_civ_system_prompt(
    civ_id: str,
    civ_name: str,
    traits: list[str],
    personality: str,
    all_civ_configs: list[dict],
) -> str
    """Build the system prompt for a civilization agent."""

def build_civ_user_message(
    turn: int,
    civ_state: dict,
    world_summary: str,
    memory_summary: str,
) -> str
    """Build the user message for a civilization agent each turn."""

def build_world_summary(
    world_snapshot: dict,
    civ_states: dict,
    exclude_civ_id: str,
) -> str
    """Build a compact world state summary string for injection into civ prompts.
    Excludes the civ's own state (already shown separately)."""

def build_narrator_user_message(
    turn: int,
    turn_diff: dict,
) -> str
    """Build the user message for the narrator agent."""

def build_event_agent_user_message(
    turn: int,
    world_snapshot: dict,
    civ_states: dict,
) -> str
    """Build the user message for the event agent."""

def build_memory_user_message(
    civ_id: str,
    civ_name: str,
    event_log: list[dict],
    current_state: dict,
) -> str
    """Build the user message for the memory manager."""

```

### `simulation/loop.py`

> 
LangGraph simulation loop.
Defines SimState and the full turn-cycle graph:
  increment_turn → run_civ_agents → run_world_engine → run_event_agent
  → run_narrator → refresh_memory → persist_turn → check_winner
  → (winner? END : back to increment_turn)


```python
class SimState(TypedDict)

def _civ_doc_to_dict(state: CivState) -> dict

def increment_turn(state: SimState) -> SimState

def run_civ_agents(state: SimState) -> SimState

def run_world_engine(state: SimState) -> SimState

def run_event_agent(state: SimState) -> SimState

def run_narrator(state: SimState) -> SimState

def refresh_memory(state: SimState) -> SimState

def persist_turn(state: SimState) -> SimState

def check_winner(state: SimState) -> SimState

def should_continue(state: SimState) -> str

def build_simulation_graph() -> StateGraph

def run_simulation_loop(sim_id: str) -> None
    """Main entry point. Called as a background task from POST /api/sim/start.
    Builds initial state from MongoDB, runs the LangGraph loop until done."""

```

### `db/repositories/__init__.py`

*38 lines, 3 imports*

### `api/sse.py`

> 
SSE manager — in-memory pub/sub for streaming simulation turn events.
Each simulation gets its own asyncio.Queue.
Clients connect to GET /api/sim/{id}/stream and receive events as they fire.


```python
class SseManager

def stream_simulation(sim_id: str)
    """SSE endpoint — streams turn events for a running simulation.
    Connect once and receive JSON events as each turn completes."""

```

### `simulation/judge.py`

> 
Judge — checks win conditions after every turn.
Returns a WinResult if someone won, None if game continues.


```python
class WinResult

def check_win(
    turn: int,
    civ_states: dict,
    world_snapshot: dict,
    max_turns: int = 50,
    domination_threshold: float = 0.60,
) -> WinResult | None
    """Check all win conditions for the current turn.

    Returns WinResult if someone won, None if game continues."""

```

## DEPENDENCY_GRAPH

```mermaid
graph LR
    f0["config.py"]
    f1["models/civ_state.py"]
    f2["models/turn.py"]
    f3["models/event.py"]
    f4["models/simulation.py"]
    f5["main.py"]
    f6["simulation/civilizations.py"]
    f7["db/repositories/event_repo.py"]
    f8["db/repositories/turn_repo.py"]
    f9["db/repositories/sim_repo.py"]
    f10["simulation/world_state.py"]
    f11["simulation/hex_grid.py"]
    f12["db/client.py"]
    f13["utils/prompt_builder.py"]
    f14["simulation/loop.py"]
    f15["db/repositories/__init__.py"]
    f16["api/sse.py"]
    f17["simulation/judge.py"]
    f18["scripts/test_full_sim.py"]
    f19["api/routes.py"]
    f20["agents/narrator_agent.py"]
    f21["agents/event_agent.py"]
    f22["agents/civ_agent.py"]
    f23["agents/world_engine.py"]
    f24["simulation/__init__.py"]
    f1 --> f0
    f2 --> f0
    f3 --> f0
    f4 --> f0
    f6 --> f11
    f6 --> f1
    f7 --> f3
    f8 --> f2
    f9 --> f4
    f10 --> f2
    f10 --> f11
    f12 --> f1
    f12 --> f3
    f12 --> f2
    f12 --> f4
    f12 --> f0
    f13 --> f2
    f14 --> f8
    f14 --> f9
    f14 --> f7
    f14 --> f16
    f14 --> f1
    f14 --> f4
    f14 --> f15
    f14 --> f6
    f14 --> f10
    f14 --> f17
    f14 --> f20
    f14 --> f21
    f14 --> f23
    f14 --> f22
    f14 --> f0
    f15 --> f7
    f15 --> f8
    f15 --> f9
    f18 --> f5
    f19 --> f7
    f19 --> f8
    f19 --> f9
    f19 --> f16
    f19 --> f14
    f19 --> f10
    f19 --> f4
    f19 --> f15
    f19 --> f12
    f20 --> f13
    f20 --> f0
    f21 --> f3
    f21 --> f13
    f21 --> f0
    f22 --> f13
    f22 --> f6
    f22 --> f0
    f24 --> f14
    f24 --> f17
    f24 --> f6
    f24 --> f10
    f24 --> f11
```

## RANKED_FILES

| File | Score | Tier | Tokens |
|------|-------|------|--------|
| `README.md` | 0.500 | structured summary | 11 |
| `config.py` | 0.437 | structured summary | 26 |
| `models/civ_state.py` | 0.304 | structured summary | 54 |
| `models/turn.py` | 0.304 | structured summary | 65 |
| `models/event.py` | 0.270 | structured summary | 38 |
| `models/simulation.py` | 0.270 | structured summary | 52 |
| `main.py` | 0.267 | signatures | 13 |
| `simulation/civilizations.py` | 0.240 | signatures | 238 |
| `db/repositories/event_repo.py` | 0.223 | signatures | 173 |
| `db/repositories/turn_repo.py` | 0.223 | signatures | 140 |
| `db/repositories/sim_repo.py` | 0.223 | signatures | 228 |
| `simulation/world_state.py` | 0.207 | signatures | 304 |
| `simulation/hex_grid.py` | 0.207 | signatures | 396 |
| `db/client.py` | 0.204 | signatures | 32 |
| `utils/prompt_builder.py` | 0.204 | signatures | 330 |
| `simulation/loop.py` | 0.190 | signatures | 264 |
| `db/repositories/__init__.py` | 0.185 | signatures | 18 |
| `api/sse.py` | 0.185 | signatures | 94 |
| `simulation/judge.py` | 0.185 | signatures | 113 |
| `scripts/test_full_sim.py` | 0.181 | one-liner | 10 |
| `api/routes.py` | 0.156 | one-liner | 8 |
| `agents/narrator_agent.py` | 0.146 | one-liner | 11 |
| `agents/event_agent.py` | 0.146 | one-liner | 9 |
| `agents/civ_agent.py` | 0.146 | one-liner | 10 |
| `agents/world_engine.py` | 0.145 | one-liner | 9 |
| `simulation/__init__.py` | 0.123 | one-liner | 17 |
| `agents/memory_manager.py` | 0.104 | one-liner | 9 |
| `.gitignore` | 0.104 | one-liner | 10 |
| `utils/hex_math.py` | 0.098 | one-liner | 10 |
| `scripts/test_single_turn.py` | 0.096 | one-liner | 10 |
| `models/__init__.py` | 0.070 | one-liner | 17 |
| `db/indexes.py` | 0.062 | one-liner | 20 |
| `scripts/test_worldgen.py` | 0.057 | one-liner | 10 |
| `scripts/smoke_test.py` | 0.054 | one-liner | 10 |
| `utils/llm.py` | 0.054 | one-liner | 21 |
| `pyproject.toml` | 0.046 | one-liner | 12 |
| `prompts/memory_system.txt` | 0.045 | one-liner | 13 |
| `prompts/event_agent.txt` | 0.045 | one-liner | 13 |
| `prompts/narrator_system.txt` | 0.045 | one-liner | 15 |
| `prompts/civ_system.txt` | 0.045 | one-liner | 14 |

## PERIPHERY

- `scripts/test_full_sim.py` — 
- `api/routes.py` — 
- `agents/narrator_agent.py` — 
- `agents/event_agent.py` — 
- `agents/civ_agent.py` — 
- `agents/world_engine.py` — 
- `simulation/__init__.py` — 5 imports, 13 lines
- `agents/memory_manager.py` — 
- `.gitignore` — 98 lines
- `utils/hex_math.py` — 
- `scripts/test_single_turn.py` — 
- `models/__init__.py` — 4 imports, 11 lines
- `db/indexes.py` — 1 function, 5 imports, 22 lines
- `scripts/test_worldgen.py` — 
- `scripts/smoke_test.py` — 
- `utils/llm.py` — 1 function, 5 imports, 65 lines
- `pyproject.toml` — 36 lines
- `prompts/memory_system.txt` — 26 lines
- `prompts/event_agent.txt` — 36 lines
- `prompts/narrator_system.txt` — 41 lines
- `prompts/civ_system.txt` — 45 lines
- `api/server.py` — 1 function, 8 imports, 42 lines
- `utils/__init__.py` — 1 imports, 14 lines
- `scripts/test_openrouter.py` — 1 function, 4 imports, 61 lines
- `.python-version` — 2 lines

