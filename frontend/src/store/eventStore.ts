import { create } from "zustand"
import type { SimEvent } from "@/types"

interface EventStore {
  events: SimEvent[]
  narratorLog: Array<{ turn: number; text: string }>
  addEvents: (events: SimEvent[]) => void
  addNarration: (turn: number, text: string) => void
  reset: () => void
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  narratorLog: [],

  addEvents: (newEvents) =>
    set((state) => ({ events: [...state.events, ...newEvents] })),

  addNarration: (turn, text) =>
    set((state) => ({
      narratorLog: [...state.narratorLog, { turn, text }],
    })),

  reset: () => set({ events: [], narratorLog: [] }),
}))