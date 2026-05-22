# AI Civilization Simulator

Spawn AI-driven civilizations on a hexagonal grid world and watch history write itself. Each civilization's decisions — diplomacy, war, trade, expansion — are powered by a large language model via the OpenRouter API.

## Architecture

```
civilex/
├── backend/          # Python FastAPI backend (MongoDB + Beanie ODM)
├── frontend/         # Next.js TypeScript frontend (Tailwind CSS + Zustand)
└── configs/          # World and civilization configuration files
```

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, FastAPI, MongoDB (Motor/Beanie ODM), OpenRouter API |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, D3.js, Zustand |

## Getting Started

### Prerequisites

- Python 3.12 + [uv](https://docs.astral.sh/uv/)
- Node.js 20+
- MongoDB instance (local or Atlas)

### Backend

```bash
cd backend
uv run python api/server.py
# or: uvicorn api.server:app --reload
```

The API starts on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm run dev
```

Opens at `http://localhost:3000`.

## Configuration

Copy or edit `backend/.env` with your credentials:

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM inference |
| `MONGODB_URL` | MongoDB connection string |
| `MONGODB_DB` | Database name (default: `civilex`) |

World and civilization defaults are in `configs/`:

- **`default_civs.json`** — 4 civilizations with starting resources, traits, and personalities
- **`world_params.json`** — 15×15 hex grid, tile yields, event chance, win conditions

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Returns server and DB connection status |

## Data Model

Four core document types stored in MongoDB:

- **`Simulation`** — Top-level simulation run (status, turn counter, winner, config)
- **`CivState`** — Per-civilization snapshot per turn (resources, tiles, relationships, memory)
- **`Event`** — In-game events (war, trade, disasters, territory captures, narrator entries)
- **`Turn`** — Full world snapshot per turn (hex grid + civ resource snapshots)

## Phase Progress

| Phase | Status |
|---|---|
| 1 — Scaffold | ✅ Complete |
| 2 — Models | ✅ Complete |
| 3 — Config | ✅ Complete |
| 4 — Simulation Engine | ⏳ Pending |
| 5 — Live Viewer | ⏳ Pending |
| 6 — History | ⏳ Pending |

## Default Civilizations

| Name | Traits | Starting Resources (G/F/S/M) |
|---|---|---|
| The Ironhold Confederacy | militaristic, proud, distrustful | 100/60/80/85 |
| The Verdant Pact | diplomatic, pacifist, nature-focused | 80/140/60/30 |
| The Ashborne Merchant Guild | shrewd, transactional, neutral | 200/80/60/20 |
| The Silent Conclave | mysterious, isolationist, patient | 120/90/100/50 |
