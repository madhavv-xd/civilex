"use client"

import { useWorldStore } from "@/store/worldStore"
import { CIV_COLORS, CIV_NAMES } from "@/lib/civColors"

interface TurnTimelineProps {
  totalTurns: number
  currentTurn: number
  onSelect: (turn: number) => void
  disabled?: boolean
}

/**
 * One dot per turn. Completed turns are tinted with the civ that held the most
 * tiles that turn; the current turn pulses. Clicking a dot jumps the replay.
 */
export default function TurnTimeline({
  totalTurns, currentTurn, onSelect, disabled = false,
}: TurnTimelineProps) {
  const turnDominants = useWorldStore((s) => s.turnDominants)

  return (
    <div
      className="flex-1 flex items-center gap-[3px] flex-wrap py-1"
      role="group"
      aria-label="Turn timeline"
    >
      {Array.from({ length: totalTurns }, (_, i) => {
        const turn = i + 1
        const dominant = turnDominants[i]
        const color = dominant ? CIV_COLORS[dominant] ?? "#71717a" : "#3f3f46"
        const isCurrent = turn === currentTurn

        return (
          <button
            key={turn}
            onClick={() => onSelect(turn)}
            disabled={disabled}
            aria-label={`Jump to turn ${turn}${dominant ? ` — ${CIV_NAMES[dominant] ?? dominant} dominant` : ""}`}
            title={`Turn ${turn}${dominant ? ` · ${CIV_NAMES[dominant] ?? dominant}` : ""}`}
            className={`rounded-full transition-all disabled:cursor-not-allowed ${
              isCurrent ? "w-2.5 h-2.5 animate-pulse" : "w-1.5 h-1.5 hover:scale-150"
            }`}
            style={{
              background: color,
              boxShadow: isCurrent ? `0 0 6px ${color}` : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
