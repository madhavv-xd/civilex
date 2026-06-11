"use client"

import { useToastStore, type ToastKind } from "@/store/toastStore"
import { X } from "@/components/Icons"

const KIND_STYLES: Record<ToastKind, { border: string; dot: string }> = {
  info: { border: "border-zinc-700", dot: "bg-indigo-400" },
  success: { border: "border-emerald-800", dot: "bg-emerald-400" },
  error: { border: "border-red-800", dot: "bg-red-400" },
}

export default function ToastNotification() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-xs"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const styles = KIND_STYLES[t.kind]
        return (
          <div
            key={t.id}
            role="status"
            className={`toast-enter flex items-center gap-2.5 rounded-xl border bg-zinc-900/95
                        px-3.5 py-2.5 shadow-2xl backdrop-blur-sm ${styles.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
            <span className="text-xs text-zinc-300 flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
