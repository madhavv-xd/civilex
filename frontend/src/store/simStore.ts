import { create } from "zustand"
import type { Simulation } from "@/types"

interface SimStore {
  current: Simulation | null
  /** Artificial delay between rendering incoming SSE turns (0 = realtime) */
  turnDelayMs: number
  setCurrent: (sim: Simulation | null) => void
  updateStatus: (status: Simulation["status"]) => void
  setTurn: (turn: number) => void
  setTurnDelayMs: (ms: number) => void
}

export const useSimStore = create<SimStore>((set) => ({
  current: null,
  turnDelayMs: 0,

  setTurnDelayMs: (turnDelayMs) => set({ turnDelayMs }),

  setCurrent: (sim) => set({ current: sim }),

  updateStatus: (status) =>
    set((state) =>
      state.current ? { current: { ...state.current, status } } : {}
    ),

  setTurn: (turn) =>
    set((state) =>
      state.current ? { current: { ...state.current, turn } } : {}
    ),
}))