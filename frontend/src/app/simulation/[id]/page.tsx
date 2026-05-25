"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
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
import Spinner from "@/components/Spinner"

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false })

export default function SimulationPage() {
  const params = useParams()
  const simId = params.id as string

  const { current, setCurrent } = useSimStore()
  const { reset: resetWorld } = useWorldStore()
  const { reset: resetEvents } = useEventStore()
  const { status: streamStatus, error: streamError } = useEventStream(simId)

  useEffect(() => {
    if (!simId) return
    resetWorld()
    resetEvents()
    api.getSim(simId)
      .then((sim) => {
        setCurrent({
          id: sim.sim_id,
          status: sim.status as any,
          turn: sim.turn,
          winner: sim.winner,
          winner_reason: sim.winner_reason,
          civ_ids: sim.civ_ids,
          config: sim.config as any,
          final_narrative: sim.final_narrative,
          created_at: sim.created_at,
          updated_at: sim.created_at,
          completed_at: sim.completed_at,
        })
      })
      .catch(console.error)
  }, [simId])

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden relative">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors">← Back</a>
          <span className="text-zinc-700">|</span>
          <span className="text-sm font-semibold text-zinc-200">🌍 AI Civilization Simulator</span>
        </div>
        <div className="text-xs text-zinc-600 font-mono truncate max-w-48">{simId}</div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Hex map */}
        <div className="flex-1 relative border-r border-zinc-800 overflow-hidden">
          {streamStatus === "connecting" && !current?.turn && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <Spinner size="lg" />
                <p className="text-zinc-500 text-sm mt-3">Generating world...</p>
              </div>
            </div>
          )}
          <HexGrid />
        </div>

        {/* Event feed */}
        <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col border-l border-zinc-800">
          <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chronicle</span>
            {streamStatus === "connected" && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-zinc-600">Live</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <EventFeed />
          </div>
        </div>

      </div>

      {/* Civ panels */}
      <div className="h-28 flex-shrink-0 border-t border-zinc-800 px-3 py-2">
        <CivPanel />
      </div>

      {/* Controls */}
      <SimControls simId={simId} streamStatus={streamStatus} maxTurns={current?.config?.max_turns ?? 50} />

      {/* Win screen */}
      <WinScreen />

      {/* Error banner */}
      {streamError && (
        <div className="absolute bottom-16 left-4 right-4 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">
          ⚠️ Stream error: {streamError}
        </div>
      )}

    </div>
  )
}