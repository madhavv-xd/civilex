import { create } from "zustand"
import type { WorldState, CivState } from "@/types"

const HISTORY_LENGTH = 10

interface WorldStore {
  worldState: WorldState | null
  prevWorldState: WorldState | null
  civStates: Record<string, CivState>
  prevCivStates: Record<string, CivState>
  /** Last N tile counts per civ, oldest first — drives sparklines */
  tileHistory: Record<string, number[]>
  /** Dominant civ (most tiles) per completed turn, index = turn number - 1 */
  turnDominants: string[]
  setWorldState: (ws: WorldState) => void
  setCivStates: (cs: Record<string, CivState>) => void
  recordTurnStats: () => void
  reset: () => void
}

export const useWorldStore = create<WorldStore>((set, get) => ({
  worldState: null,
  prevWorldState: null,
  civStates: {},
  prevCivStates: {},
  tileHistory: {},
  turnDominants: [],

  setWorldState: (worldState) =>
    set((state) => ({ worldState, prevWorldState: state.worldState })),

  setCivStates: (civStates) =>
    set((state) => ({ civStates, prevCivStates: state.civStates })),

  recordTurnStats: () => {
    const { civStates, tileHistory, turnDominants } = get()
    const entries = Object.entries(civStates)
    if (entries.length === 0) return

    const nextHistory: Record<string, number[]> = { ...tileHistory }
    for (const [civId, cs] of entries) {
      nextHistory[civId] = [...(nextHistory[civId] ?? []), cs.tile_count].slice(-HISTORY_LENGTH)
    }

    const dominant = entries.reduce((best, cur) =>
      cur[1].tile_count > best[1].tile_count ? cur : best
    )[0]

    set({ tileHistory: nextHistory, turnDominants: [...turnDominants, dominant] })
  },

  reset: () =>
    set({
      worldState: null,
      prevWorldState: null,
      civStates: {},
      prevCivStates: {},
      tileHistory: {},
      turnDominants: [],
    }),
}))

