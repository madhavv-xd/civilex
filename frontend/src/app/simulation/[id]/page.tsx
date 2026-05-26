"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useSimStore } from "@/store/simStore"
import { useWorldStore } from "@/store/worldStore"
import { useEventStore } from "@/store/eventStore"
import { useEventStream } from "@/hooks/useEventStream"
import { api } from "@/lib/apiClient"
import EventFeed from "@/components/EventFeed"
import CivPanel from "@/components/CivPanel"
import SimControls from "@/components/SimControls"
import WinScreen from "@/components/WinScreen"
import SimSummary from "@/components/SimSummary"
import ReplayControls from "@/components/ReplayControls"
import Spinner from "@/components/Spinner"
import { HexGridSkeleton, EventFeedSkeleton, CivPanelSkeleton } from "@/components/Skeletons"
import { ArrowLeft, BarChart, Download, Globe, AlertTriangle, RefreshCw } from "@/components/Icons"

const HexGrid = dynamic(() => import("@/components/HexGrid"), {
  ssr: false,
  loading: () => <HexGridSkeleton />,
})

export default function SimulationPage() {
  const params  = useParams()
  const simId   = params.id as string

  const { current, setCurrent }       = useSimStore()
  const { reset: resetWorld, worldState } = useWorldStore()
  const { reset: resetEvents }        = useEventStore()
  const { status: streamStatus, error: streamError } = useEventStream(simId)

  const [showSummary, setShowSummary] = useState(false)
  const [showWin, setShowWin]         = useState(false)

  const isDone      = current?.status === "completed"
  const isRunning   = current?.status === "running"
  const totalTurns  = current?.config?.max_turns ?? 50
  const hasWorld    = !!worldState

  // Load sim metadata on mount
  useEffect(() => {
    if (!simId) return
    resetWorld()
    resetEvents()
    api.getSim(simId)
      .then((sim) => {
        setCurrent({
          id:              sim.sim_id,
          status:          sim.status as any,
          turn:            sim.turn,
          winner:          sim.winner,
          winner_reason:   sim.winner_reason,
          civ_ids:         sim.civ_ids,
          config:          sim.config as any,
          final_narrative: sim.final_narrative,
          created_at:      sim.created_at,
          updated_at:      sim.created_at,
          completed_at:    sim.completed_at,
        })
      })
      .catch(console.error)
  }, [simId])

  // Show win screen when sim ends
  useEffect(() => {
    if (isDone && current?.winner) {
      const t = setTimeout(() => setShowWin(true), 800)
      return () => clearTimeout(t)
    }
  }, [isDone, current?.winner])

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden relative">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5
                      border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/"
             className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
            <ArrowLeft size={14} />
            Back
          </Link>
          <span className="text-zinc-800">|</span>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Globe size={13} className="text-indigo-400" />
            <span className="text-sm font-semibold text-zinc-200">AI Civilization Simulator</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDone && (
            <button
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700
                         text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <BarChart size={12} /> Summary
            </button>
          )}
          {isDone && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/sim/${simId}/export`}
              download
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700
                         text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <Download size={12} /> Export
            </a>
          )}
          <div className="text-xs text-zinc-700 font-mono truncate max-w-36 hidden md:block">
            {simId}
          </div>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Hex map */}
        <div className="flex-1 relative border-r border-zinc-800 overflow-hidden">
          {!hasWorld
            ? <HexGridSkeleton />
            : <HexGrid />
          }
        </div>

        {/* Event feed */}
        <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col border-l border-zinc-800">
          <div className="px-4 py-2.5 border-b border-zinc-800
                          flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400
                             uppercase tracking-wider">
              Chronicle
            </span>
            {streamStatus === "connected" && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-zinc-600">Live</span>
              </div>
            )}
            {isDone && (
              <span className="text-[10px] text-amber-600">Complete</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {!hasWorld ? <EventFeedSkeleton /> : <EventFeed />}
          </div>
        </div>

      </div>

      {/* ── Civ panels ─────────────────────────────────────── */}
      <div className="h-36 flex-shrink-0 border-t border-zinc-800 px-3 py-2 overflow-hidden">
        {!hasWorld ? <CivPanelSkeleton /> : <CivPanel />}
      </div>

      {/* ── Controls ───────────────────────────────────────── */}
      {isDone ? (
        <ReplayControls simId={simId} totalTurns={current?.turn ?? totalTurns} />
      ) : (
        <SimControls
          simId={simId}
          streamStatus={streamStatus}
          maxTurns={totalTurns}
        />
      )}

      {/* ── Overlays ───────────────────────────────────────── */}
      {showWin && !showSummary && (
        <WinScreen onViewSummary={() => {
          setShowWin(false)
          setShowSummary(true)
        }} />
      )}

      <SimSummary
        simId={simId}
        isVisible={showSummary}
        onClose={() => setShowSummary(false)}
      />

      {/* ── Stream error banner ─────────────────────────────── */}
      {streamError && (
        <div className="absolute bottom-16 left-4 right-4 bg-red-950
                        border border-red-800 rounded-xl px-4 py-3
                        text-sm text-red-400 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {streamError}</span>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
          >
            <RefreshCw size={12} /> Reconnect
          </button>
        </div>
      )}

    </div>
  )
}