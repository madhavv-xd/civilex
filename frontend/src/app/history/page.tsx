"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/apiClient"
import { CIV_COLORS, CIV_NAMES } from "@/lib/civColors"
import { CIV_ICON_COMPONENTS } from "@/lib/civColors"
import { Trophy, ArrowLeft, ArrowRight, Trash, X, AlertTriangle } from "@/components/Icons"

type Sim = {
  sim_id: string
  status: string
  turn: number
  winner: string | null
  winner_reason: string | null
  civ_ids: string[]
  created_at: string
  completed_at: string | null
}

export default function HistoryPage() {
  const [sims, setSims] = useState<Sim[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    api.listSims()
      .then((r) => setSims(r.simulations))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(simId: string) {
    setDeletingId(simId)
    setDeleteError(null)
    try {
      await api.deleteSim(simId)
      setSims((prev) => prev.filter((s) => s.sim_id !== simId))
      setConfirmId(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Simulation History</h1>
          <p className="text-zinc-500 text-sm mt-1">All recorded ages of civilization</p>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={14} />
          Dashboard
        </Link>
      </div>

      {deleteError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-950 border border-red-800 text-red-400 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="text-red-500 hover:text-red-300 ml-4">
            <X size={14} />
          </button>
        </div>
      )}

      {loading && (
        <div className="text-zinc-600 text-sm">Loading history...</div>
      )}

      {!loading && sims.length === 0 && (
        <div className="text-center py-20">
          <div className="flex justify-center mb-3 text-zinc-700">
            <Trophy size={40} />
          </div>
          <p className="text-zinc-600">No simulations yet. Start one from the dashboard.</p>
        </div>
      )}

      <div className="grid gap-3">
        {sims.map((sim) => {
          const winColor  = sim.winner ? CIV_COLORS[sim.winner] : "#6b7280"
          const winName   = sim.winner ? CIV_NAMES[sim.winner] ?? sim.winner : "No winner"
          const WinIcon   = sim.winner ? CIV_ICON_COMPONENTS[sim.winner] : null
          const date      = new Date(sim.created_at).toLocaleDateString()
          const isConfirming = confirmId === sim.sim_id
          const isDeleting   = deletingId === sim.sim_id

          return (
            <div
              key={sim.sim_id}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                isConfirming
                  ? "border-red-800 bg-red-950/30"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              }`}
            >
              {/* Winner icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${winColor}18`, border: `1px solid ${winColor}33`, color: winColor }}
              >
                {WinIcon ? <WinIcon size={18} /> : <Trophy size={18} />}
              </div>

              {/* Details */}
              <Link href={`/simulation/${sim.sim_id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
                    {winName}
                  </span>
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
              </Link>

              {/* Status badge */}
              <div className="flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  sim.status === "completed" ? "bg-emerald-950 text-emerald-400" :
                  sim.status === "running"   ? "bg-indigo-950 text-indigo-400 animate-pulse" :
                  "bg-zinc-800 text-zinc-500"
                }`}>
                  {sim.status}
                </span>
              </div>

              {/* Arrow */}
              {!isConfirming && (
                <Link href={`/simulation/${sim.sim_id}`}
                  className="text-zinc-700 flex-shrink-0 hover:text-zinc-400 transition-colors">
                  <ArrowRight size={14} />
                </Link>
              )}

              {/* Delete controls */}
              {!isConfirming ? (
                <button
                  onClick={(e) => { e.preventDefault(); setConfirmId(sim.sim_id) }}
                  disabled={sim.status === "running"}
                  title={sim.status === "running" ? "Stop the simulation first" : "Delete simulation"}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                             text-zinc-600 hover:text-red-400 hover:bg-red-950/40
                             disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash size={13} />
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-red-400 font-medium">Delete?</span>
                  <button
                    onClick={() => handleDelete(sim.sim_id)}
                    disabled={isDeleting}
                    className="text-xs px-3 py-1 rounded-lg bg-red-700 hover:bg-red-600
                               text-white font-semibold disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? "…" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    disabled={isDeleting}
                    className="text-xs px-3 py-1 rounded-lg border border-zinc-700
                               text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}