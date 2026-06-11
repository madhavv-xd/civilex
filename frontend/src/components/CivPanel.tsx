"use client"

import { useState } from "react"
import { useWorldStore } from "@/store/worldStore"
import { useUiStore } from "@/store/uiStore"
import { CIV_COLORS, CIV_ICONS, CIV_NAMES } from "@/lib/civColors"
import type { CivState } from "@/types"

const CIV_ORDER = ["ironhold", "verdant", "merchants", "conclave"]

function moodLabel(score: number): string {
  if (score >= 60) return "ALLIED"
  if (score >= 20) return "FRIENDLY"
  if (score >= -20) return "NEUTRAL"
  if (score >= -60) return "HOSTILE"
  return "AT WAR"
}

export default function CivPanel() {
  const civStates = useWorldStore((s) => s.civStates)
  const prevCivStates = useWorldStore((s) => s.prevCivStates)
  const tileHistory = useWorldStore((s) => s.tileHistory)
  const focusedCiv = useUiStore((s) => s.focusedCiv)
  const toggleFocusedCiv = useUiStore((s) => s.toggleFocusedCiv)

  if (!civStates || Object.keys(civStates).length === 0) {
    return (
      <div className="flex items-center justify-center h-full gap-4">
        {CIV_ORDER.map((id) => (
          <div key={id} className="flex-1 h-20 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
        ))}
      </div>
    )
  }

  // Find max values for relative bar scaling
  const allStates = Object.values(civStates)
  const maxGold = Math.max(...allStates.map((s) => s.resources.gold), 1)
  const maxFood = Math.max(...allStates.map((s) => s.resources.food), 1)
  const maxMilitary = Math.max(...allStates.map((s) => s.resources.military), 1)

  return (
    <div className="flex gap-3 h-full">
      {CIV_ORDER.map((civId) => {
        const state = civStates[civId]
        if (!state) return null
        return (
          <CivCard
            key={civId}
            civId={civId}
            state={state}
            prev={prevCivStates[civId]}
            history={tileHistory[civId] ?? []}
            maxGold={maxGold}
            maxFood={maxFood}
            maxMilitary={maxMilitary}
            isFocused={focusedCiv === civId}
            anyFocused={focusedCiv !== null}
            onFocus={() => toggleFocusedCiv(civId)}
          />
        )
      })}
    </div>
  )
}

function CivCard({
  civId, state, prev, history, maxGold, maxFood, maxMilitary, isFocused, anyFocused, onFocus,
}: {
  civId: string
  state: CivState
  prev: CivState | undefined
  history: number[]
  maxGold: number
  maxFood: number
  maxMilitary: number
  isFocused: boolean
  anyFocused: boolean
  onFocus: () => void
}) {
  const color = CIV_COLORS[civId] ?? "#6b7280"
  const icon = CIV_ICONS[civId] ?? "🏛️"
  const name = CIV_NAMES[civId] ?? civId
  const alive = state.is_alive
  const justEliminated = !alive && prev?.is_alive === true

  return (
    <button
      type="button"
      onClick={onFocus}
      aria-label={`Focus ${name} on the map`}
      aria-pressed={isFocused}
      className={`flex-1 text-left rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${
        alive
          ? "bg-zinc-900/80 border-zinc-800"
          : "bg-zinc-950 border-zinc-900 opacity-40 grayscale"
      } ${justEliminated ? "civ-eliminate" : ""} ${
        anyFocused && !isFocused ? "opacity-50" : ""
      }`}
      style={
        alive
          ? { borderColor: isFocused ? color : `${color}33`, boxShadow: isFocused ? `0 0 12px ${color}44` : undefined }
          : {}
      }
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-zinc-100 truncate">{name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: `${color}20`, color }}
            >
              {state.tile_count} tiles
              <Trend now={state.tile_count} before={prev?.tile_count} />
            </span>
            {!alive && (
              <span className="text-[10px] text-zinc-600 font-medium">
                ELIMINATED
              </span>
            )}
          </div>
        </div>
        {history.length >= 2 && <Sparkline points={history} color={color} />}
      </div>

      {/* Resource bars */}
      <div className="space-y-1.5">
        <ResourceBar
          label="💰" value={state.resources.gold} before={prev?.resources.gold}
          max={maxGold} color="#f59e0b"
        />
        <ResourceBar
          label="🌾" value={state.resources.food} before={prev?.resources.food}
          max={maxFood} color="#22c55e"
        />
        <ResourceBar
          label="⚔️" value={state.resources.military} before={prev?.resources.military}
          max={maxMilitary} color="#ef4444"
        />
      </div>

      {/* Last action */}
      {state.last_action && alive && (
        <div className="mt-2 text-[10px] text-zinc-500 truncate">
          → {state.last_action.replace(/_/g, " ")}
        </div>
      )}

      {/* Relationships */}
      <div className="flex gap-1 mt-2">
        {Object.entries(state.relationships ?? {}).map(([otherId, score]) => (
          <RelDot key={otherId} civId={otherId} score={score as number} />
        ))}
      </div>
    </button>
  )
}

function Trend({ now, before }: { now: number; before: number | undefined }) {
  if (before === undefined || now === before) return null
  return now > before
    ? <span className="ml-1 text-green-400">↑</span>
    : <span className="ml-1 text-red-400">↓</span>
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 44
  const h = 16
  const max = Math.max(...points, 1)
  const min = Math.min(...points)
  const range = Math.max(max - min, 1)
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * (w - 2) + 1
      const y = h - 2 - ((v - min) / range) * (h - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg width={w} height={h} className="flex-shrink-0 opacity-80" aria-hidden="true">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.25" />
    </svg>
  )
}

function ResourceBar({
  label, value, before, max, color,
}: {
  label: string; value: number; before: number | undefined; max: number; color: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  const delta =
    before === undefined || Math.round(value) === Math.round(before)
      ? null
      : value > before
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] w-4 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-zinc-500 w-8 text-right tabular-nums">
        {Math.round(value)}
      </span>
      <span className="w-2 text-[10px]" aria-hidden="true">
        {delta === true && <span className="text-green-400">↑</span>}
        {delta === false && <span className="text-red-400">↓</span>}
      </span>
    </div>
  )
}

function RelDot({ civId, score }: { civId: string; score: number }) {
  const [hover, setHover] = useState(false)
  const color = CIV_COLORS[civId] ?? "#6b7280"
  const bg =
    score >= 60 ? "#22c55e" :
    score >= 20 ? "#84cc16" :
    score >= -20 ? "#6b7280" :
    score >= -60 ? "#f97316" :
    "#ef4444"

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        className="block w-2 h-2 rounded-full border"
        style={{ background: bg, borderColor: `${color}66` }}
        aria-label={`${CIV_NAMES[civId] ?? civId}: ${score} (${moodLabel(score)})`}
      />
      {hover && (
        <span
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap
                     bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-[10px] shadow-lg"
        >
          <span style={{ color }} className="font-semibold">
            {CIV_NAMES[civId] ?? civId}
          </span>
          <span className="text-zinc-400"> {score > 0 ? `+${score}` : score} · </span>
          <span style={{ color: bg }} className="font-medium">{moodLabel(score)}</span>
        </span>
      )}
    </span>
  )
}
