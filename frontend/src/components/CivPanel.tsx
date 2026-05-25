"use client"

import { useWorldStore } from "@/store/worldStore"
import { CIV_COLORS, CIV_ICONS, CIV_NAMES } from "@/lib/civColors"
import type { CivState } from "@/types"

const CIV_ORDER = ["ironhold", "verdant", "merchants", "conclave"]

export default function CivPanel() {
  const { civStates } = useWorldStore()

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
  const maxTiles = Math.max(...allStates.map((s) => s.tile_count), 1)

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
            maxGold={maxGold}
            maxFood={maxFood}
            maxMilitary={maxMilitary}
            maxTiles={maxTiles}
          />
        )
      })}
    </div>
  )
}

function CivCard({
  civId, state, maxGold, maxFood, maxMilitary, maxTiles,
}: {
  civId: string
  state: CivState
  maxGold: number
  maxFood: number
  maxMilitary: number
  maxTiles: number
}) {
  const color = CIV_COLORS[civId] ?? "#6b7280"
  const icon = CIV_ICONS[civId] ?? "🏛️"
  const name = CIV_NAMES[civId] ?? civId
  const alive = state.is_alive

  return (
    <div
      className={`flex-1 rounded-xl border px-3 py-2.5 transition-all ${
        alive
          ? "bg-zinc-900/80 border-zinc-800"
          : "bg-zinc-950 border-zinc-900 opacity-40"
      }`}
      style={alive ? { borderColor: `${color}33` } : {}}
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
            </span>
            {!alive && (
              <span className="text-[10px] text-zinc-600 font-medium">
                ELIMINATED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Resource bars */}
      <div className="space-y-1.5">
        <ResourceBar
          label="💰"
          value={state.resources.gold}
          max={maxGold}
          color="#f59e0b"
        />
        <ResourceBar
          label="🌾"
          value={state.resources.food}
          max={maxFood}
          color="#22c55e"
        />
        <ResourceBar
          label="⚔️"
          value={state.resources.military}
          max={maxMilitary}
          color="#ef4444"
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
    </div>
  )
}

function ResourceBar({
  label, value, max, color,
}: {
  label: string; value: number; max: number; color: string
}) {
  const pct = Math.min(100, (value / max) * 100)
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
    </div>
  )
}

function RelDot({ civId, score }: { civId: string; score: number }) {
  const color = CIV_COLORS[civId] ?? "#6b7280"
  const bg =
    score >= 60 ? "#22c55e" :
    score >= 20 ? "#84cc16" :
    score >= -20 ? "#6b7280" :
    score >= -60 ? "#f97316" :
    "#ef4444"

  return (
    <div
      title={`${civId}: ${score}`}
      className="w-2 h-2 rounded-full border"
      style={{ background: bg, borderColor: `${color}66` }}
    />
  )
}