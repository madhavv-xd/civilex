import { create } from "zustand"
import type { WorldState, CivState } from "@/types"

interface WorldStore {
  worldState: WorldState | null
  civStates: Record<string, CivState>
  setWorldState: (ws: WorldState) => void
  setCivStates: (cs: Record<string, CivState>) => void
  reset: () => void
}

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,
  civStates: {},

  setWorldState: (worldState) => set({ worldState }),
  setCivStates: (civStates) => set({ civStates }),

  reset: () => set({ worldState: null, civStates: {} }),
}))