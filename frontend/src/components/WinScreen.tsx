"use client"

import { useEventStore } from "@/store/eventStore"
import { useSimStore } from "@/store/simStore"
import { CIV_COLORS, CIV_ICONS, CIV_NAMES } from "@/lib/civColors"

export default function WinScreen() {
  const { current } = useSimStore()
  const { narratorLog } = useEventStore()

  if (!current || current.status !== "completed" || !current.winner) return null

  const winner = current.winner
  const winReason = current.winner_reason
  const color = CIV_COLORS[winner] ?? "#eab308"
  const icon = CIV_ICONS[winner] ?? "🏆"
  const name = CIV_NAMES[winner] ?? winner

  const finalNarrative = narratorLog[narratorLog.length - 1]?.text ?? ""

  const winLabel: Record<string, string> = {
    domination: "Domination Victory",
    elimination: "Elimination Victory",
    stalemate: "Stalemate — Most Tiles",
    draw: "The age ended in a draw",
    mutual_destruction: "Mutual Destruction",
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center
                    bg-zinc-950/90 backdrop-blur-sm">
      <div
        className="max-w-md w-full mx-4 rounded-2xl border p-8 text-center shadow-2xl"
        style={{
          background: `linear-gradient(135deg, #09090b 60%, ${color}15)`,
          borderColor: `${color}44`,
          boxShadow: `0 0 60px ${color}22`,
        }}
      >
        {/* Trophy */}
        <div className="text-6xl mb-4">🏆</div>

        {/* Winner */}
        <div
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color }}
        >
          {winLabel[winReason ?? ""] ?? winReason}
        </div>
        <div className="text-3xl font-bold text-zinc-100 mb-1 flex items-center justify-center gap-2">
          <span>{icon}</span>
          <span>{name}</span>
        </div>
        <div className="text-zinc-500 text-sm mb-6">
          Turn {current.turn}
        </div>

        {/* Final narrative */}
        {finalNarrative && (
          <div className="border-l-2 pl-4 text-left mb-6"
               style={{ borderColor: `${color}66` }}>
            <p className="text-sm text-zinc-400 italic leading-relaxed">
              &ldquo;{finalNarrative}&rdquo;
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700
                       text-zinc-300 text-sm font-medium transition-colors"
          >
            ← Dashboard
          </a>
          <a
            href="/history"
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
          >
            View History
          </a>
        </div>
      </div>
    </div>
  )
}