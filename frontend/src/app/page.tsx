"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/apiClient"

const CIVS = [
  { id: "ironhold",  name: "The Ironhold Confederacy", trait: "Militaristic",  color: "#C0392B", icon: "⚔️" },
  { id: "verdant",   name: "The Verdant Pact",          trait: "Diplomatic",    color: "#27AE60", icon: "🌿" },
  { id: "merchants", name: "The Ashborne Merchant Guild",trait: "Transactional", color: "#F39C12", icon: "💰" },
  { id: "conclave",  name: "The Silent Conclave",        trait: "Isolationist",  color: "#8E44AD", icon: "🔮" },
]

export default function HomePage() {
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "unreachable">("checking")

  useEffect(() => {
    api.health()
      .then((res) => setDbStatus(res.db === "connected" ? "connected" : "unreachable"))
      .catch(() => setDbStatus("unreachable"))
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">

      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-2">
          AI Civilization Simulator
        </h1>
        <p className="text-zinc-400 text-lg max-w-md mx-auto">
          Spawn civilizations. Watch them think. Let history write itself.
        </p>
      </div>

      {/* DB status pill */}
      <div className="mb-10">
        {dbStatus === "checking" && (
          <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">
            Checking connection…
          </span>
        )}
        {dbStatus === "connected" && (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            ● MongoDB connected
          </span>
        )}
        {dbStatus === "unreachable" && (
          <span className="text-xs px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800">
            ● DB unreachable — is the backend running?
          </span>
        )}
      </div>

      {/* Civ cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 w-full max-w-3xl">
        {CIVS.map((civ) => (
          <div
            key={civ.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2"
          >
            <div className="text-2xl">{civ.icon}</div>
            <div className="text-sm font-semibold text-zinc-100 leading-tight">{civ.name}</div>
            <div
              className="text-xs font-medium px-2 py-0.5 rounded-full w-fit"
              style={{ background: civ.color + "22", color: civ.color }}
            >
              {civ.trait}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          disabled
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 
                     disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          ▶ Start Simulation
          <span className="ml-2 text-xs opacity-60">(Phase 4)</span>
        </button>

        <Link
          href="/history"
          className="px-6 py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 
                     text-zinc-300 hover:text-zinc-100 font-semibold transition-colors"
        >
          View History
        </Link>
      </div>

      {/* Phase indicator */}
      <div className="mt-16 flex gap-2 items-center">
        {[1, 2, 3, 4, 5, 6].map((p) => (
          <div
            key={p}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
              ${p === 1
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-500"
              }`}
          >
            {p}
          </div>
        ))}
        <span className="ml-2 text-xs text-zinc-500">Phase 1 — Scaffold complete</span>
      </div>

    </main>
  )
}
