"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/apiClient"
import { useSimulation } from "@/hooks/useSimulation"
import { CIV_COLORS, CIV_NAMES, CIV_ICON_COMPONENTS } from "@/lib/civColors"
import {
  Globe, Play, Scroll, Database, AlertTriangle,
  Trophy, Sword2, Leaf, Coins, Eye, ArrowRight,
} from "@/components/Icons"

const CIVS = [
  { id: "ironhold",  name: "The Ironhold Confederacy",    trait: "Militaristic",  color: "#C0392B", Icon: Sword2, desc: "Masters of war and iron discipline" },
  { id: "verdant",   name: "The Verdant Pact",            trait: "Diplomatic",    color: "#27AE60", Icon: Leaf,   desc: "Builders of alliances and green lands" },
  { id: "merchants", name: "The Ashborne Merchant Guild", trait: "Transactional", color: "#F39C12", Icon: Coins,  desc: "Wealth is the only true power" },
  { id: "conclave",  name: "The Silent Conclave",         trait: "Isolationist",  color: "#8E44AD", Icon: Eye,    desc: "Hidden knowledge, hidden strength" },
]

interface SimRow {
  sim_id: string
  status: string
  turn: number
  winner: string | null
  winner_reason: string | null
  civ_ids: string[]
  created_at: string
  completed_at: string | null
}

export default function HomePage() {
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "unreachable">("checking")
  const [sims, setSims] = useState<SimRow[]>([])
  const [simsLoaded, setSimsLoaded] = useState(false)
  const { startSim, isStarting, startError } = useSimulation()

  // Sim config
  const [showConfig, setShowConfig] = useState(false)
  const [maxTurns, setMaxTurns] = useState(50)
  const [gridSize, setGridSize] = useState<15 | 20>(15)
  const [selectedCivs, setSelectedCivs] = useState<string[]>(CIVS.map((c) => c.id))

  useEffect(() => {
    api.health()
      .then((r) => setDbStatus(r.db === "connected" ? "connected" : "unreachable"))
      .catch(() => setDbStatus("unreachable"))
    api.listSims()
      .then((r) => setSims(r.simulations))
      .catch(() => {})
      .finally(() => setSimsLoaded(true))
  }, [])

  const runningSim = sims.find((s) => s.status === "running") ?? null

  // Keep the active operation card fresh
  useEffect(() => {
    if (!runningSim) return
    const timer = setInterval(() => {
      api.getSim(runningSim.sim_id)
        .then((fresh) =>
          setSims((prev) =>
            prev.map((s) =>
              s.sim_id === fresh.sim_id
                ? { ...s, status: fresh.status, turn: fresh.turn, winner: fresh.winner }
                : s
            )
          )
        )
        .catch(() => {})
    }, 10_000)
    return () => clearInterval(timer)
  }, [runningSim])

  const stats = useMemo(() => {
    const completed = sims.filter((s) => s.status === "completed")
    const avgTurns = completed.length
      ? Math.round(completed.reduce((sum, s) => sum + s.turn, 0) / completed.length)
      : 0
    return {
      total: sims.length,
      ironhold: completed.filter((s) => s.winner === "ironhold").length,
      verdant: completed.filter((s) => s.winner === "verdant").length,
      avgTurns,
    }
  }, [sims])

  const toggleCiv = (id: string) =>
    setSelectedCivs((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const handleStart = () =>
    startSim({ max_turns: maxTurns, grid_size: gridSize, civ_ids: selectedCivs })

  const recentSims = sims.slice(0, 4)

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-900">
        <div className="flex items-center gap-2 text-zinc-300">
          <Globe size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold tracking-tight">CivilEx</span>
        </div>
        <div className="flex items-center gap-3">
          {/* DB pill */}
          {dbStatus === "checking" && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-500">
              Connecting…
            </span>
          )}
          {dbStatus === "connected" && (
            <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full
                             bg-emerald-950 text-emerald-400 border border-emerald-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          {dbStatus === "unreachable" && (
            <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full
                             bg-red-950 text-red-400 border border-red-900">
              <AlertTriangle size={11} />
              Offline
            </span>
          )}
          <Link href="/history"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300
                       transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800/60">
            <Scroll size={12} />
            History
          </Link>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 grid lg:grid-cols-[1fr_380px] gap-0">

        {/* Left — Hero + CTA */}
        <div className="flex flex-col items-start justify-center px-10 py-16 relative">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-transparent pointer-events-none" />

          {/* Icon mark */}
          <div className="relative mb-8 w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/20
                          flex items-center justify-center text-indigo-400">
            <Globe size={26} />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500
                             border-2 border-zinc-950" />
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-zinc-50 mb-4 leading-tight">
            AI Civilization<br />Simulator
          </h1>
          <p className="text-zinc-400 text-lg max-w-sm mb-8 leading-relaxed">
            Four factions. Fifty turns. One history.
            Watch AI civilizations forge alliances, declare war, and shape the world.
          </p>

          {/* CTA */}
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <button
              onClick={handleStart}
              disabled={isStarting || dbStatus !== "connected" || selectedCivs.length < 2}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-indigo-600
                         hover:bg-indigo-500 active:bg-indigo-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-semibold text-sm transition-all
                         shadow-lg shadow-indigo-900/40"
            >
              <Play size={13} />
              {isStarting ? "Starting…" : "Start Simulation"}
            </button>
            <button
              onClick={() => setShowConfig((v) => !v)}
              aria-expanded={showConfig}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-700
                         hover:border-zinc-500 text-zinc-400 hover:text-zinc-200
                         text-sm font-medium transition-all"
            >
              ⚙ Configure
            </button>
          </div>

          {/* Config panel */}
          {showConfig && (
            <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/70
                            px-5 py-4 mb-4 space-y-4">
              {/* Max turns */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="max-turns" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                    Max turns
                  </label>
                  <span className="text-xs font-bold text-zinc-200 tabular-nums">{maxTurns}</span>
                </div>
                <input
                  id="max-turns"
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(Number(e.target.value))}
                  className="w-full h-1.5 accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Grid size */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Grid size
                </div>
                <div className="flex gap-2">
                  {([15, 20] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setGridSize(size)}
                      aria-pressed={gridSize === size}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        gridSize === size
                          ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                          : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {size}×{size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Civ selection */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Civilizations {selectedCivs.length < 2 && (
                    <span className="text-red-400 normal-case">— pick at least 2</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CIVS.map((civ) => {
                    const checked = selectedCivs.includes(civ.id)
                    return (
                      <label
                        key={civ.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer
                                    transition-colors ${
                          checked ? "border-zinc-600 bg-zinc-800/60" : "border-zinc-800 opacity-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCiv(civ.id)}
                          className="accent-indigo-500"
                        />
                        <span className="text-xs font-medium truncate" style={{ color: civ.color }}>
                          {CIV_NAMES[civ.id]}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {startError && (
            <p className="text-sm text-red-400 flex items-center gap-2 mt-1">
              <AlertTriangle size={13} /> {startError}
            </p>
          )}

          {/* Quick stats strip */}
          <div className="grid grid-cols-4 gap-3 mt-8 pt-8 border-t border-zinc-900 w-full max-w-md relative z-10">
            <StatBox label="Total sims" value={stats.total} />
            <StatBox label="Ironhold wins" value={stats.ironhold} color={CIV_COLORS.ironhold} />
            <StatBox label="Verdant wins" value={stats.verdant} color={CIV_COLORS.verdant} />
            <StatBox label="Avg turns" value={stats.avgTurns} />
          </div>
        </div>

        {/* Right — Civilization roster + recent sims */}
        <div className="border-l border-zinc-900 flex flex-col bg-zinc-950">

          {/* Active operation */}
          {runningSim && (
            <div className="px-4 pt-6">
              <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2 animate-pulse">
                ⦿ Active Operation
              </div>
              <Link
                href={`/simulation/${runningSim.sim_id}`}
                className="block rounded-xl border border-indigo-800/60 bg-indigo-950/30
                           px-4 py-3 hover:border-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-zinc-400 truncate">{runningSim.sim_id}</span>
                  <span className="text-xs font-bold text-indigo-300 tabular-nums">
                    Turn {runningSim.turn}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, (runningSim.turn / 50) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                  WATCH LIVE <ArrowRight size={10} />
                </span>
              </Link>
            </div>
          )}

          {/* Section label */}
          <div className="px-5 pt-8 pb-3">
            <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              Civilizations
            </span>
          </div>

          {/* Civ list */}
          <div className="px-4 flex flex-col gap-2">
            {CIVS.map((civ) => (
              <div
                key={civ.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl border border-zinc-800/70
                           bg-zinc-900/40 hover:border-zinc-700 transition-colors group"
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: civ.color + "18", border: `1px solid ${civ.color}30`, color: civ.color }}
                >
                  <civ.Icon size={16} />
                </div>
                {/* Text */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-zinc-100 truncate leading-tight">
                    {civ.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{civ.desc}</div>
                </div>
                {/* Trait badge */}
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ background: civ.color + "18", color: civ.color }}
                >
                  {civ.trait}
                </span>
              </div>
            ))}
          </div>

          {/* Recent simulations */}
          {recentSims.length > 0 ? (
            <>
              <div className="px-5 pt-6 pb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                  Recent
                </span>
                <Link href="/history" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors
                                                  flex items-center gap-1">
                  All <ArrowRight size={10} />
                </Link>
              </div>
              <div className="px-4 flex flex-col gap-1.5 pb-6">
                {recentSims.map((sim) => {
                  const WinIcon = sim.winner ? CIV_ICON_COMPONENTS[sim.winner] : null
                  const color = sim.winner ? CIV_COLORS[sim.winner] : "#6b7280"
                  const name = sim.winner ? CIV_NAMES[sim.winner] ?? sim.winner : "No winner"
                  return (
                    <Link
                      key={sim.sim_id}
                      href={`/simulation/${sim.sim_id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-800/60
                                 bg-zinc-900/30 hover:border-zinc-700 transition-colors group"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}18`, color }}
                      >
                        {WinIcon ? <WinIcon size={13} /> : <Trophy size={13} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-zinc-300 truncate">{name}</div>
                        <div className="text-[10px] text-zinc-600">
                          {sim.turn} turns · {sim.winner_reason ?? sim.status}
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-500 transition-colors flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </>
          ) : simsLoaded ? (
            /* Empty state with call to action */
            <div className="px-4 pt-8 pb-6 flex flex-col items-center text-center">
              <div className="hex-pulse-grid mb-4" aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} className="hex-pulse" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
              <p className="text-xs text-zinc-600 mb-4 max-w-[220px]">
                No recorded history yet. The first age awaits its chronicler.
              </p>
              <button
                onClick={handleStart}
                disabled={isStarting || dbStatus !== "connected"}
                className="text-[11px] font-semibold tracking-widest px-4 py-2.5 rounded-lg
                           border border-indigo-700 text-indigo-300 hover:bg-indigo-600/20
                           disabled:opacity-40 transition-colors"
              >
                INITIALIZE FIRST SIMULATION
              </button>
            </div>
          ) : null}

          {/* Bottom status bar */}
          <div className="mt-auto border-t border-zinc-900 px-5 py-3 flex items-center gap-2">
            <Database size={12} className="text-zinc-600" />
            <span className="text-[11px] text-zinc-600">
              {dbStatus === "connected"
                ? "Backend connected"
                : dbStatus === "unreachable"
                ? "Backend unreachable"
                : "Checking…"}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: color ?? "#f4f4f5" }}>
        {value}
      </div>
      <div className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  )
}
