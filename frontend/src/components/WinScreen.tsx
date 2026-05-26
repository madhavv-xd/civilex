"use client"

import Link from "next/link"
import { useEventStore } from "@/store/eventStore"
import { useSimStore } from "@/store/simStore"
import { CIV_COLORS, CIV_NAMES, CIV_ICON_COMPONENTS } from "@/lib/civColors"
import { Trophy, ArrowLeft, BarChart, Scroll } from "@/components/Icons"

interface WinScreenProps {
  onViewSummary?: () => void
}

export default function WinScreen({ onViewSummary }: WinScreenProps) {
  const { current } = useSimStore()
  const { narratorLog } = useEventStore()

  if (!current || current.status !== "completed" || !current.winner) return null

  const winner   = current.winner
  const winReason = current.winner_reason
  const color    = CIV_COLORS[winner] ?? "#eab308"
  const name     = CIV_NAMES[winner]  ?? winner
  const WinIcon  = CIV_ICON_COMPONENTS[winner] ?? null
  const finalNarrative = narratorLog[narratorLog.length - 1]?.text ?? ""

  const winLabel: Record<string, string> = {
    domination:         "Domination Victory",
    elimination:        "Elimination Victory",
    stalemate:          "Stalemate — Most Tiles",
    draw:               "The age ended in a draw",
    mutual_destruction: "Mutual Destruction",
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center
                    bg-zinc-950/90 backdrop-blur-sm">
      <div
        className="max-w-md w-full mx-4 rounded-2xl border p-8 text-center shadow-2xl"
        style={{
          background:  `linear-gradient(135deg, #09090b 60%, ${color}15)`,
          borderColor: `${color}44`,
          boxShadow:   `0 0 60px ${color}22`,
        }}
      >
        {/* Winner icon */}
        <div className="flex items-center justify-center mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}44`, color }}
          >
            {WinIcon ? <WinIcon size={32} /> : <Trophy size={32} />}
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color }}>
          {winLabel[winReason ?? ""] ?? winReason}
        </div>
        <div className="text-3xl font-bold text-zinc-100 mb-1">{name}</div>
        <div className="text-zinc-500 text-sm mb-6">Turn {current.turn}</div>

        {finalNarrative && (
          <div className="border-l-2 pl-4 text-left mb-6" style={{ borderColor: `${color}66` }}>
            <p className="text-sm text-zinc-400 italic leading-relaxed">
              &ldquo;{finalNarrative}&rdquo;
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link href="/"
             className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700
                        text-zinc-300 text-sm font-medium transition-colors">
            <ArrowLeft size={13} /> Dashboard
          </Link>
          {onViewSummary && (
            <button
              onClick={onViewSummary}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
            >
              <BarChart size={13} /> View Stats
            </button>
          )}
          <Link href="/history"
             className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors
                        border border-zinc-700 text-zinc-400 hover:text-zinc-200">
            <Scroll size={13} /> History
          </Link>
        </div>
      </div>
    </div>
  )
}