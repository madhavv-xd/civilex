import { create } from "zustand"

export type ViewerTab = "map" | "feed" | "civs"

interface UiStore {
  /** Civ whose tiles are highlighted on the map; all others dim */
  focusedCiv: string | null
  /** Mobile viewer tab */
  viewerTab: ViewerTab
  /** Map fills the whole viewer, hiding feed + civ panels */
  fullscreenMap: boolean
  toggleFocusedCiv: (civId: string) => void
  clearFocusedCiv: () => void
  setViewerTab: (tab: ViewerTab) => void
  setFullscreenMap: (on: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  focusedCiv: null,
  viewerTab: "map",
  fullscreenMap: false,

  toggleFocusedCiv: (civId) =>
    set((state) => ({ focusedCiv: state.focusedCiv === civId ? null : civId })),

  clearFocusedCiv: () => set({ focusedCiv: null }),

  setViewerTab: (viewerTab) => set({ viewerTab }),

  setFullscreenMap: (fullscreenMap) => set({ fullscreenMap }),
}))
