"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/apiClient"
import { useSimulation } from "@/hooks/useSimulation"
import { CIV_COLORS, CIV_ICONS } from "@/lib/civColors"

const CIVS = [
  { id: "ironhold",  name: "The Ironhold Confederacy", trait: "Militaristic",  color: "#C0392B", icon: "⚔️" },
  { id: "verdant",   name: "The Verdant Pact",          trait: "Diplomatic",    color: "#27AE60", icon: "🌿" },
  { id: "merchants", name: "The Ashborne Merchant Guild",trait: "Transactional", color: "#F39C12", icon: "💰" },
  { id: "conclave",  name: "The Silent Conclave",        trait: "Isolationist",  color: "#8E44AD", icon: "🔮" },
]

export default function HomePage() {
  const [dbStatus, setDbStatus] = useState<"checking"|"connected"|"unreachable">("checking")
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-zinc-950">

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-2">
          AI Civilization Simulator
        </h1>
        <p className="text-zinc-400 text-lg max-w-md mx-auto">
          Spawn civilizations. Watch them think. Let history write itself.
        </p>
      </div>

      {/* DB status */}
      <div className="mb-8">
        {dbStatus === "checking" && (
          <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">Checking connection…</span>
        )}
        {dbStatus === "connected" && (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">● MongoDB connected</span>
        )}
        {dbStatus === "unreachable" && (
          <span className="text-xs px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800">● DB unreachable — is the backend running?</span>
        )}
      </div>

      {/* Civ cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full max-w-3xl">
        {CIVS.map((civ) => (
          <div key={civ.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2">
            <div className="text-2xl">{civ.icon}</div>
            <div className="text-sm font-semibold text-zinc-100 leading-tight">{civ.name}</div>
            <div className="text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                 style={{ background: civ.color + "22", color: civ.color }}>
              {civ.trait}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={startSim}
          disabled={isStarting || dbStatus !== "connected"}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                     disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          {isStarting ? "Starting…" : "▶ Start Simulation"}
        </button>
        <a href="/history"
           className="px-6 py-3 rounded-xl border border-zinc-700 hover:border-zinc-500
                      text-zinc-300 hover:text-zinc-100 font-semibold transition-colors">
          View History
        </a>
      </div>

      {startError && (
        <p className="text-sm text-red-400 mb-4">{startError}</p>
      )}

      {/* Recent sims */}
      {recentSims.length > 0 && (
        <div className="w-full max-w-3xl mt-8">
          <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">
            Recent Simulations
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recentSims.map((sim) => (
              <a key={sim.sim_id} href={`/simulation/${sim.sim_id}`}
                 className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-600 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {sim.winner && (
                    <span className="text-sm">{CIV_ICONS[sim.winner] ?? "🏆"}</span>
                  )}
                  <span className="text-xs text-zinc-400 font-medium truncate">
                    {sim.winner ? (CIV_COLORS[sim.winner] ? sim.winner : "Unknown") : sim.status}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600">
                  {sim.turn} turns · {sim.winner_reason ?? sim.status}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Phase indicator */}
      <div className="mt-12 flex gap-2 items-center">
        {[1,2,3,4,5,6].map((p) => (
          <div key={p}
               className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
                 ${p <= 5 ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>
            {p}
          </div>
        ))}
        <span className="ml-2 text-xs text-zinc-500">Phase 5 — Frontend live</span>
      </div>

    </main>
  )
}