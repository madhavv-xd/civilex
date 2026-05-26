"use client"

import { useReplay } from "@/hooks/useReplay"
import { ChevronLeft, ChevronRight, ArrowRight } from "@/components/Icons"

interface ReplayControlsProps {
  simId: string
  totalTurns: number
}

export default function ReplayControls({ simId, totalTurns }: ReplayControlsProps) {
  const { replayTurn, isLoading, isReplayMode, goToTurn, exitReplay } = useReplay(simId, totalTurns)

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-zinc-950 border-t border-zinc-800">

      {/* Replay label */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">
          Replay
        </span>
        {isLoading && (
          <div className="w-3 h-3 border border-zinc-600 border-t-amber-500 rounded-full animate-spin" />
        )}
      </div>

      {/* Turn counter */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-zinc-500">Turn</span>
        <span className="text-sm font-bold text-zinc-100 tabular-nums w-6 text-center">
          {replayTurn}
        </span>
        <span className="text-xs text-zinc-600">/ {totalTurns}</span>
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={totalTurns}
        value={replayTurn}
        onChange={(e) => goToTurn(Number(e.target.value))}
        className="flex-1 h-1.5 accent-amber-500 cursor-pointer"
      />

      {/* Step buttons */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => goToTurn(Math.max(0, replayTurn - 1))}
          disabled={replayTurn <= 0 || isLoading}
          className="w-7 h-7 rounded-lg border border-zinc-700 text-zinc-400
                     hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30
                     transition-colors flex items-center justify-center"
        >
          <ChevronLeft size={13} />
        </button>
        <button
          onClick={() => goToTurn(Math.min(totalTurns, replayTurn + 1))}
          disabled={replayTurn >= totalTurns || isLoading}
          className="w-7 h-7 rounded-lg border border-zinc-700 text-zinc-400
                     hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30
                     transition-colors flex items-center justify-center"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Jump to latest */}
      {isReplayMode && (
        <button
          onClick={exitReplay}
          className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-amber-800
                     text-amber-500 hover:border-amber-600 transition-colors flex-shrink-0"
        >
          Latest <ArrowRight size={10} />
        </button>
      )}

    </div>
  )
}