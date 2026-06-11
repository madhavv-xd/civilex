"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/apiClient"
import { useToastStore } from "@/store/toastStore"
import { CIV_COLORS, CIV_NAMES, CIV_ICON_COMPONENTS } from "@/lib/civColors"
import ConfirmDialog from "@/components/ConfirmDialog"
import { Trophy, ArrowLeft, ArrowRight, Trash } from "@/components/Icons"

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

type StatusFilter = "all" | "completed" | "running" | "paused"
type SortKey = "date" | "turns" | "winner"

const CIV_ORDER = ["ironhold", "verdant", "merchants", "conclave"]

export default function HistoryPage() {
  const [sims, setSims] = useState<Sim[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  const [filter, setFilter] = useState<StatusFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortAsc, setSortAsc] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    api.listSims()
      .then((r) => setSims(r.simulations))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const visibleSims = useMemo(() => {
    const filtered = filter === "all" ? sims : sims.filter((s) => s.status === filter)
    const sorted = [...filtered].sort((a, b) => {
      let cmp: number
      switch (sortKey) {
        case "turns":
          cmp = a.turn - b.turn
          break
        case "winner":
          cmp = (a.winner ?? "~").localeCompare(b.winner ?? "~")
          break
        default:
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortAsc ? cmp : -cmp
    })
    return sorted
  }, [sims, filter, sortKey, sortAsc])

  const winCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const id of CIV_ORDER) counts[id] = 0
    for (const s of sims) {
      if (s.winner && s.winner in counts) counts[s.winner] += 1
    }
    return counts
  }, [sims])
  const maxWins = Math.max(...Object.values(winCounts), 1)

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  async function executeDelete(ids: string[]) {
    setIsDeleting(true)
    const results = await Promise.allSettled(ids.map((id) => api.deleteSim(id)))
    const failed = results.filter((r) => r.status === "rejected").length
    const succeeded = ids.filter((_, i) => results[i].status === "fulfilled")

    setSims((prev) => prev.filter((s) => !succeeded.includes(s.sim_id)))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of succeeded) next.delete(id)
      return next
    })

    if (failed > 0) addToast(`Deletion failed for ${failed} simulation${failed > 1 ? "s" : ""}`, "error")
    else addToast(`Deleted ${succeeded.length} simulation${succeeded.length > 1 ? "s" : ""}`, "success")

    setIsDeleting(false)
    setPendingDelete(null)
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

      {/* Winner chart */}
      {sims.some((s) => s.winner) && (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
            Victories per civilization
          </div>
          <div className="space-y-2">
            {CIV_ORDER.map((civId) => {
              const count = winCounts[civId]
              const color = CIV_COLORS[civId]
              return (
                <div key={civId} className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-400 w-24 truncate">{CIV_NAMES[civId]}</span>
                  <div className="flex-1 h-3 bg-zinc-800/80 rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-700"
                      style={{ width: `${(count / maxWins) * 100}%`, background: color }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-5 text-right" style={{ color }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters + sort + bulk actions */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["all", "completed", "running", "paused"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`text-[10px] font-semibold tracking-wider px-2.5 py-1.5 rounded-lg border transition-colors uppercase ${
              filter === f
                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {f}
          </button>
        ))}

        <span className="w-px h-5 bg-zinc-800 mx-1" />

        {([["date", "DATE"], ["turns", "TURNS"], ["winner", "WINNER"]] as Array<[SortKey, string]>).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`text-[10px] font-semibold tracking-wider px-2.5 py-1.5 rounded-lg border transition-colors ${
                sortKey === key
                  ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {label} {sortKey === key ? (sortAsc ? "↑" : "↓") : ""}
            </button>
          )
        )}

        {selected.size > 0 && (
          <button
            onClick={() => setPendingDelete(Array.from(selected))}
            className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold tracking-wider px-3 py-1.5
                       rounded-lg bg-red-900/60 border border-red-800 text-red-300 hover:bg-red-800/60
                       transition-colors"
          >
            <Trash size={11} /> DELETE SELECTED ({selected.size})
          </button>
        )}
      </div>

      {loading && (
        <div className="text-zinc-600 text-sm">Loading history...</div>
      )}

      {!loading && visibleSims.length === 0 && (
        <div className="text-center py-20">
          <div className="flex justify-center mb-3 text-zinc-700">
            <Trophy size={40} />
          </div>
          <p className="text-zinc-600">
            {sims.length === 0
              ? "No simulations yet. Start one from the dashboard."
              : "No simulations match this filter."}
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {visibleSims.map((sim) => {
          const winColor  = sim.winner ? CIV_COLORS[sim.winner] : "#6b7280"
          const winName   = sim.winner ? CIV_NAMES[sim.winner] ?? sim.winner : "No winner"
          const WinIcon   = sim.winner ? CIV_ICON_COMPONENTS[sim.winner] : null
          const date      = new Date(sim.created_at).toLocaleDateString()
          const isChecked = selected.has(sim.sim_id)

          return (
            <div
              key={sim.sim_id}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                isChecked
                  ? "border-red-900/70 bg-red-950/20"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              }`}
            >
              {/* Bulk select */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleSelected(sim.sim_id)}
                disabled={sim.status === "running"}
                aria-label={`Select simulation ${sim.sim_id}`}
                className="accent-red-600 flex-shrink-0 disabled:opacity-25"
              />

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
              <Link href={`/simulation/${sim.sim_id}`}
                aria-label={`View simulation ${sim.sim_id}`}
                className="text-zinc-700 flex-shrink-0 hover:text-zinc-400 transition-colors">
                <ArrowRight size={14} />
              </Link>

              {/* Delete */}
              <button
                onClick={() => setPendingDelete([sim.sim_id])}
                disabled={sim.status === "running"}
                title={sim.status === "running" ? "Stop the simulation first" : "Delete simulation"}
                aria-label={`Delete simulation ${sim.sim_id}`}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                           text-zinc-600 hover:text-red-400 hover:bg-red-950/40
                           disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <Trash size={13} />
              </button>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete && pendingDelete.length > 1
            ? `Delete ${pendingDelete.length} simulations?`
            : "Delete simulation?"
        }
        message="This permanently removes the simulation and all of its recorded turns, events, and civilization states. This cannot be undone."
        confirmLabel="Delete"
        isWorking={isDeleting}
        onConfirm={() => pendingDelete && executeDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  )
}
