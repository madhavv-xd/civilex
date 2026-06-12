"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useSimStore } from "@/store/simStore"
import { useWorldStore } from "@/store/worldStore"
import { useEventStore } from "@/store/eventStore"
import { useUiStore, type ViewerTab } from "@/store/uiStore"
import { useEventStream } from "@/hooks/useEventStream"
import { useReplay } from "@/hooks/useReplay"
import { useSimulation } from "@/hooks/useSimulation"
import { api } from "@/lib/apiClient"
import EventFeed from "@/components/EventFeed"
import CivPanel from "@/components/CivPanel"
import SimControls from "@/components/SimControls"
import WinScreen from "@/components/WinScreen"
import SimSummary from "@/components/SimSummary"
import ReplayControls from "@/components/ReplayControls"
import RelationshipMatrix from "@/components/RelationshipMatrix"
import ErrorBoundary from "@/components/ErrorBoundary"
import { HexGridSkeleton, EventFeedSkeleton, CivPanelSkeleton } from "@/components/Skeletons"
import { ArrowLeft, BarChart, Download, Globe, AlertTriangle, RefreshCw } from "@/components/Icons"

const HexGrid = dynamic(() => import("@/components/HexGrid"), {
  ssr: false,
  loading: () => <HexGridSkeleton />,
})

const TABS: Array<{ id: ViewerTab; label: string }> = [
  { id: "map", label: "MAP" },
  { id: "feed", label: "CHRONICLE" },
  { id: "civs", label: "CIVS" },
]

export default function SimulationPage() {
  const params  = useParams()
  const simId   = params.id as string

  const { current, setCurrent }       = useSimStore()
  const { reset: resetWorld, worldState } = useWorldStore()
  const { reset: resetEvents }        = useEventStore()
  const {
    status: streamStatus,
    error: streamError,
    reconnectAttempt,
  } = useEventStream(simId)
  const { pauseSim, resumeSim, isPausing, isResuming } = useSimulation()

  const viewerTab = useUiStore((s) => s.viewerTab)
  const setViewerTab = useUiStore((s) => s.setViewerTab)
  const fullscreenMap = useUiStore((s) => s.fullscreenMap)
  const setFullscreenMap = useUiStore((s) => s.setFullscreenMap)

  const [showSummary, setShowSummary] = useState(false)
  const [showWin, setShowWin]         = useState(false)

  const isDone      = current?.status === "completed"
  const isRunning   = current?.status === "running"
  const isPaused    = current?.status === "paused"
  const totalTurns  = current?.config?.max_turns ?? 50
  const hasWorld    = !!worldState

  const replay = useReplay(simId, current?.turn ?? totalTurns)

  // Load sim metadata on mount
  useEffect(() => {
    if (!simId) return
    resetWorld()
    resetEvents()
    setFullscreenMap(false)
    api.getSim(simId)
      .then((sim) => {
        setCurrent({
          id:              sim.sim_id,
          status:          sim.status as never,
          turn:            sim.turn,
          winner:          sim.winner,
          winner_reason:   sim.winner_reason,
          civ_ids:         sim.civ_ids,
          config:          sim.config as never,
          final_narrative: sim.final_narrative,
          created_at:      sim.created_at,
          updated_at:      sim.created_at,
          completed_at:    sim.completed_at,
        })
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simId])

  // Show win screen when sim ends
  useEffect(() => {
    if (isDone && current?.winner) {
      const t = setTimeout(() => setShowWin(true), 800)
      return () => clearTimeout(t)
    }
  }, [isDone, current?.winner])

  // ── Keyboard shortcuts ──────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return

    switch (e.key) {
      case " ":
        e.preventDefault()
        if (isRunning && !isPausing) pauseSim(simId)
        else if (isPaused && !isResuming) resumeSim(simId)
        break
      case "ArrowLeft":
        if (isDone) {
          e.preventDefault()
          replay.goToTurn(Math.max(0, replay.replayTurn - 1))
        }
        break
      case "ArrowRight":
        if (isDone) {
          e.preventDefault()
          replay.goToTurn(Math.min(current?.turn ?? totalTurns, replay.replayTurn + 1))
        }
        break
      case "r":
      case "R":
        if (isDone && replay.isReplayMode) replay.exitReplay()
        break
      case "s":
      case "S":
        if (isDone) setShowSummary((v) => !v)
        break
      case "Escape":
        if (showSummary) setShowSummary(false)
        else if (showWin) setShowWin(false)
        else if (fullscreenMap) setFullscreenMap(false)
        break
    }
  }, [isRunning, isPaused, isPausing, isResuming, isDone, simId, pauseSim, resumeSim,
      replay, current?.turn, totalTurns, showSummary, showWin, fullscreenMap, setFullscreenMap])

  useEffect(() => {
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [handleKey])

  const showMap  = !fullscreenMap ? viewerTab === "map" : true
  const showFeed = !fullscreenMap && viewerTab === "feed"
  const showCivs = !fullscreenMap && viewerTab === "civs"

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
          <button
            onClick={() => setFullscreenMap(!fullscreenMap)}
            aria-pressed={fullscreenMap}
            aria-label={fullscreenMap ? "Exit fullscreen map" : "Fullscreen map"}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700
                       text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {fullscreenMap ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <div className="text-xs text-zinc-700 font-mono truncate max-w-36 hidden md:block">
            {simId}
          </div>
        </div>
      </div>

      {/* ── Mobile tab bar ─────────────────────────────────── */}
      {!fullscreenMap && (
        <div className="flex md:hidden border-b border-zinc-800 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setViewerTab(t.id)}
              aria-pressed={viewerTab === t.id}
              className={`flex-1 py-2 text-[10px] font-semibold tracking-widest transition-colors ${
                viewerTab === t.id
                  ? "text-zinc-100 border-b-2 border-indigo-500"
                  : "text-zinc-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Hex map */}
        <div className={`flex-1 relative overflow-hidden ${
          fullscreenMap ? "" : "md:border-r md:border-zinc-800"
        } ${showMap ? "block" : "hidden"} md:block`}>
          <ErrorBoundary label="hex map">
            {!hasWorld
              ? <HexGridSkeleton />
              : <HexGrid />
            }
          </ErrorBoundary>
        </div>

        {/* Event feed */}
        {!fullscreenMap && (
          <div className={`w-full md:w-72 xl:w-80 md:flex-shrink-0 flex-col md:border-l md:border-zinc-800 ${
            showFeed ? "flex" : "hidden"
          } md:flex`}>
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
              {streamStatus === "reconnecting" && (
                <span className="text-[10px] text-amber-500 animate-pulse">
                  Reconnecting ({reconnectAttempt}/3)
                </span>
              )}
              {isDone && (
                <span className="text-[10px] text-amber-600">Complete</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary label="chronicle">
                {!hasWorld ? <EventFeedSkeleton /> : <EventFeed />}
              </ErrorBoundary>
            </div>
          </div>
        )}

      </div>

      {/* ── Civ panels + relationship matrix ───────────────── */}
      {!fullscreenMap && (
        <div className={`flex-shrink-0 border-t border-zinc-800 ${
          showCivs ? "block" : "hidden"
        } md:block`}>
          <div className="h-36 px-3 py-2 overflow-hidden">
            <ErrorBoundary label="civ panel">
              {!hasWorld ? <CivPanelSkeleton /> : <CivPanel />}
            </ErrorBoundary>
          </div>
          {hasWorld && <RelationshipMatrix />}
        </div>
      )}

      {/* ── Controls ───────────────────────────────────────── */}
      {!fullscreenMap && (
        isDone ? (
          <ReplayControls
            totalTurns={current?.turn ?? totalTurns}
            replayTurn={replay.replayTurn}
            isLoading={replay.isLoading}
            isReplayMode={replay.isReplayMode}
            goToTurn={replay.goToTurn}
            exitReplay={replay.exitReplay}
          />
        ) : (
          <SimControls
            simId={simId}
            streamStatus={streamStatus}
            maxTurns={totalTurns}
            reconnectAttempt={reconnectAttempt}
          />
        )
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
