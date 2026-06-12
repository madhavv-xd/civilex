"use client"

import { useSimStore } from "@/store/simStore"
import { useSimulation } from "@/hooks/useSimulation"
import { StreamStatus } from "@/hooks/useEventStream"
import { Play, Pause, Stop, Wifi, AlertTriangle } from "@/components/Icons"

// Playback pacing: artificial delay applied between rendering incoming turns
const SPEEDS = [
  { label: "0.5×", ms: 2400 },
  { label: "1×", ms: 1200 },
  { label: "2×", ms: 600 },
  { label: "4×", ms: 0 },
] as const

interface SimControlsProps {
  simId: string
  streamStatus: StreamStatus
  maxTurns?: number
  reconnectAttempt?: number
}

export default function SimControls({
  simId, streamStatus, maxTurns = 50, reconnectAttempt = 0,
}: SimControlsProps) {
  const { current } = useSimStore()
  const turnDelayMs = useSimStore((s) => s.turnDelayMs)
  const setTurnDelayMs = useSimStore((s) => s.setTurnDelayMs)
  const {
    pauseSim, resumeSim, stopSim,
    isPausing, isResuming, isStopping,
  } = useSimulation()

  const turn     = current?.turn ?? 0
  const status   = current?.status ?? "running"
  const progress = Math.round((turn / maxTurns) * 100)

  const isRunning = status === "running"
  const isLive    = isRunning && streamStatus === "connected"
  const isPaused  = status === "paused"
  const isDone    = status === "completed"

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-zinc-950 border-t border-zinc-800">

      {/* Turn counter */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-zinc-500 font-medium">Turn</span>
        <span className="text-sm font-bold text-zinc-100 tabular-nums w-6 text-center">{turn}</span>
        <span className="text-xs text-zinc-600">/ {maxTurns}</span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: isDone ? "#eab308" : isLive ? "#6366f1" : "#6b7280",
          }}
        />
      </div>

      {/* Status dot + label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${
          isLive    ? "bg-green-500 animate-pulse" :
          isPaused  ? "bg-yellow-500" :
          isDone    ? "bg-amber-400" : "bg-zinc-600"
        }`} />
        <span className="text-xs text-zinc-400 capitalize w-16">
          {isDone ? "complete" : status}
        </span>
      </div>

      {/* Turn speed */}
      <div className="flex items-center gap-0.5 flex-shrink-0" role="group" aria-label="Turn playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s.label}
            onClick={() => setTurnDelayMs(s.ms)}
            aria-pressed={turnDelayMs === s.ms}
            title={s.ms === 0 ? "Render turns as they arrive" : `Pace turns ${s.ms / 1000}s apart`}
            className={`text-[10px] px-1.5 py-1 rounded-md font-medium tabular-nums transition-colors ${
              turnDelayMs === s.ms
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-600 hover:text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Pause / Resume toggle */}
      {isRunning && (
        <button
          onClick={() => pauseSim(simId)}
          disabled={isPausing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700
                     text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Pause size={11} />
          {isPausing ? "Pausing…" : "Pause"}
        </button>
      )}
      {isPaused && (
        <button
          onClick={() => resumeSim(simId)}
          disabled={isResuming}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-700
                     text-indigo-300 hover:border-indigo-500 hover:bg-indigo-600/20 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Play size={11} />
          {isResuming ? "Resuming…" : "Resume"}
        </button>
      )}

      {/* Stop button */}
      {(isRunning || isPaused) && (
        <button
          onClick={() => stopSim(simId)}
          disabled={isStopping}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-900/70
                     text-red-400/80 hover:border-red-700 hover:text-red-300 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Stop size={11} />
          {isStopping ? "Stopping…" : "Stop"}
        </button>
      )}

      {/* Stream status */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {streamStatus === "connecting" && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600 animate-pulse">
            <Wifi size={11} /> connecting
          </span>
        )}
        {streamStatus === "reconnecting" && (
          <span className="flex items-center gap-1 text-[10px] text-amber-500 animate-pulse">
            <Wifi size={11} /> SIGNAL LOST — RECONNECTING ({reconnectAttempt}/3)
          </span>
        )}
        {streamStatus === "error" && (
          <span className="flex items-center gap-1 text-[10px] text-red-500">
            <AlertTriangle size={11} /> stream error
          </span>
        )}
        {streamStatus === "closed" && !isDone && (
          <span className="text-[10px] text-zinc-600">stream closed</span>
        )}
      </div>

    </div>
  )
}