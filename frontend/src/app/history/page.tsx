"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/apiClient"
import { CIV_COLORS, CIV_ICONS, CIV_NAMES } from "@/lib/civColors"

export default function HistoryPage() {
  const [sims, setSims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listSims()
      .then((r) => setSims(r.simulations))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">📜 Simulation History</h1>
          <p className="text-zinc-500 text-sm mt-1">All recorded ages of civilization</p>
        </div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {loading && (
        <div className="text-zinc-600 text-sm">Loading history...</div>
      )}

      {!loading && sims.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📜</div>
          <p className="text-zinc-600">No simulations yet. Start one from the dashboard.</p>
        </div>
      )}

      <div className="grid gap-3">
        {sims.map((sim) => {
          const winColor = sim.winner ? CIV_COLORS[sim.winner] : "#6b7280"
          const winIcon = sim.winner ? CIV_ICONS[sim.winner] : "⚖️"
          const winName = sim.winner ? CIV_NAMES[sim.winner] : "No winner"
          const date = new Date(sim.created_at).toLocaleDateString()

          return (
            <Link
              key={sim.sim_id}
              href={`/simulation/${sim.sim_id}`}
              className="flex items-center gap-4 rounded-xl border border-zinc-800
                         bg-zinc-900/50 px-4 py-3 hover:border-zinc-600 transition-colors"
            >
              {/* Winner icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: `${winColor}18`, border: `1px solid ${winColor}33` }}
              >
                {winIcon}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-zinc-100">{winName}</span>
                  {sim.winner_reason && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${winColor}18`, color: winColor }}
                    >
                      {sim.winner_reason}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-600">
                  {sim.turn} turns · {date}
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  sim.status === "completed" ? "bg-emerald-950 text-emerald-400" :
                  sim.status === "running"   ? "bg-indigo-950 text-indigo-400 animate-pulse" :
                  "bg-zinc-800 text-zinc-500"
                }`}>
                  {sim.status}
                </span>
              </div>

              <span className="text-zinc-700 flex-shrink-0">→</span>
            </Link>
          )
        })}
      </div>
    </main>
  )
}