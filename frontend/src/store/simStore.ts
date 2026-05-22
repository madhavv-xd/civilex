import { create } from "zustand"
import type { Simulation } from "@/types"

interface SimStore {
  current: Simulation | null
  setCurrent: (sim: Simulation | null) => void
  updateStatus: (status: Simulation["status"]) => void
  incrementTurn: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  current: null,

  setCurrent: (sim) => set({ current: sim }),

  updateStatus: (status) =>
    set((state) =>
      state.current ? { current: { ...state.current, status } } : {}
    ),

  incrementTurn: () =>
    set((state) =>
      state.current
        ? { current: { ...state.current, turn: state.current.turn + 1 } }
        : {}
    ),
}))