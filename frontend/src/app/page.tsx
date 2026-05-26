"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/apiClient"
import { useSimulation } from "@/hooks/useSimulation"
import { CIV_COLORS, CIV_NAMES, CIV_ICON_COMPONENTS } from "@/lib/civColors"
import {
  Globe, Play, Scroll, Database, AlertTriangle,
  Clock, Trophy, Sword2, Leaf, Coins, Eye, ArrowRight,
} from "@/components/Icons"

const CIVS = [
  { id: "ironhold",  name: "The Ironhold Confederacy",    trait: "Militaristic",  color: "#C0392B", Icon: Sword2, desc: "Masters of war and iron discipline" },
  { id: "verdant",   name: "The Verdant Pact",            trait: "Diplomatic",    color: "#27AE60", Icon: Leaf,   desc: "Builders of alliances and green lands" },
  { id: "merchants", name: "The Ashborne Merchant Guild", trait: "Transactional", color: "#F39C12", Icon: Coins,  desc: "Wealth is the only true power" },
  { id: "conclave",  name: "The Silent Conclave",         trait: "Isolationist",  color: "#8E44AD", Icon: Eye,    desc: "Hidden knowledge, hidden strength" },
]

export default function HomePage() {
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "unreachable">("checking")
  const [recentSims, setRecentSims] = useState<any[]>([])
  const { startSim, isStarting, startError } = useSimulation()

  useEffect(() => {
    api.health()
      .then((r) => setDbStatus(r.db === "connected" ? "connected" : "unreachable"))
      .catch(() => setDbStatus("unreachable"))
    api.listSims()
      .then((r) => setRecentSims(r.simulations.slice(0, 4)))
      .catch(() => {})
  }, [])

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
          <p className="text-zinc-400 text-lg max-w-sm mb-10 leading-relaxed">
            Four factions. Fifty turns. One history.
            Watch AI civilizations forge alliances, declare war, and shape the world.
          </p>

          {/* CTA */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={startSim}
              disabled={isStarting || dbStatus !== "connected"}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-indigo-600
                         hover:bg-indigo-500 active:bg-indigo-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-semibold text-sm transition-all
                         shadow-lg shadow-indigo-900/40"
            >
              <Play size={13} />
              {isStarting ? "Starting…" : "Start Simulation"}
            </button>
            <Link href="/history"
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-700
                         hover:border-zinc-500 text-zinc-400 hover:text-zinc-200
                         text-sm font-medium transition-all">
              <Scroll size={13} />
              View History
            </Link>
          </div>

          {startError && (
            <p className="text-sm text-red-400 flex items-center gap-2 mt-1">
              <AlertTriangle size={13} /> {startError}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-10 pt-8 border-t border-zinc-900 w-full max-w-sm">
            <div>
              <div className="text-2xl font-bold text-zinc-100">4</div>
              <div className="text-xs text-zinc-600 mt-0.5">Civilizations</div>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <div className="text-2xl font-bold text-zinc-100">50</div>
              <div className="text-xs text-zinc-600 mt-0.5">Turns per age</div>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <div className="text-2xl font-bold text-zinc-100">∞</div>
              <div className="text-xs text-zinc-600 mt-0.5">Outcomes</div>
            </div>
          </div>
        </div>

        {/* Right — Civilization roster + recent sims */}
        <div className="border-l border-zinc-900 flex flex-col bg-zinc-950">

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
          {recentSims.length > 0 && (
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
          )}

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