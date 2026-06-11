"use client"

import { useEffect } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isWorking?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = "Confirm", cancelLabel = "Cancel",
  isWorking = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={trapRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-w-sm w-full mx-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        <h2 className="text-base font-bold text-zinc-100 mb-2">{title}</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isWorking}
            className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-sm
                       hover:text-zinc-200 hover:border-zinc-500 transition-colors
                       disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isWorking}
            className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm
                       font-semibold transition-colors disabled:opacity-50"
          >
            {isWorking ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
