"use client"

import { useSimStore } from "@/store/simStore"
import { useSimulation } from "@/hooks/useSimulation"
import { StreamStatus } from "@/hooks/useEventStream"

interface SimControlsProps {
  simId: string
  streamStatus: StreamStatus
  maxTurns?: number
}

export default function SimControls({ simId, streamStatus, maxTurns = 50 }: SimControlsProps) {
  const { current } = useSimStore()
  const { stopSim, isStopping } = useSimulation()

  const turn = current?.turn ?? 0
  const status = current?.status ?? "running"
  const progress = Math.round((turn / maxTurns) * 100)

  const isRunning = status === "running" && streamStatus === "connected"
  const isPaused  = status === "paused"
  const isDone    = status === "completed"

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-zinc-950 border-t border-zinc-800">

      {/* Turn counter */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-zinc-500 font-medium">Turn</span>
        <span className="text-sm font-bold text-zinc-100 tabular-nums w-6 text-center">
          {turn}
        </span>
        <span className="text-xs text-zinc-600">/ {maxTurns}</span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: isDone
              ? "#eab308"
              : isRunning
              ? "#6366f1"
              : "#6b7280",
          }}
        />
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isRunning ? "bg-green-500 animate-pulse" :
            isPaused  ? "bg-yellow-500" :
            isDone    ? "bg-amber-400" :
            "bg-zinc-600"
          }`}
        />
        <span className="text-xs text-zinc-400 capitalize w-16">
          {isDone ? "complete" : status}
        </span>
      </div>

      {/* Stop button */}
      {isRunning && (
        <button
          onClick={() => stopSim(simId)}
          disabled={isStopping}
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400
                     hover:border-zinc-500 hover:text-zinc-200 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isStopping ? "Stopping…" : "⏸ Pause"}
        </button>
      )}

      {/* Stream status indicator */}
      <div className="flex-shrink-0">
        {streamStatus === "connecting" && (
          <span className="text-[10px] text-zinc-600 animate-pulse">connecting…</span>
        )}
        {streamStatus === "error" && (
          <span className="text-[10px] text-red-500">stream error</span>
        )}
        {streamStatus === "closed" && !isDone && (
          <span className="text-[10px] text-zinc-600">stream closed</span>
        )}
      </div>

    </div>
  )
}