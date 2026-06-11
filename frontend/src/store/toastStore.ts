import { create } from "zustand"

export type ToastKind = "info" | "success" | "error"

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const TOAST_TTL_MS = 4000
let nextId = 1

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, kind?: ToastKind) => void
  removeToast: (id: number) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message, kind = "info") => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { id, message, kind }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, TOAST_TTL_MS)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** Imperative helper for non-component code (hooks, API handlers) */
export const toast = (message: string, kind: ToastKind = "info") =>
  useToastStore.getState().addToast(message, kind)
