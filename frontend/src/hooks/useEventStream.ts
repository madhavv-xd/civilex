"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSimStore } from "@/store/simStore"
import { useWorldStore } from "@/store/worldStore"
import { useEventStore } from "@/store/eventStore"
import { api } from "@/lib/apiClient"

export type StreamStatus = "idle" | "connecting" | "connected" | "closed" | "error"

export function useEventStream(simId: string | null) {
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const { setCurrent, updateStatus, incrementTurn } = useSimStore()
  const { setWorldState, setCivStates } = useWorldStore()
  const { addEvents, addNarration, reset: resetEvents } = useEventStore()

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setStatus("closed")
  }, [])

  useEffect(() => {
    if (!simId) return

    resetEvents()
    setStatus("connecting")
    setError(null)

    const url = api.streamUrl(simId)
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setStatus("connected")
    }

    es.addEventListener("sim_start", (e: MessageEvent) => {
      const payload = JSON.parse(e.data)
      setWorldState(payload.world_snapshot)
      setCivStates(payload.civ_states)
    })

    es.addEventListener("turn_complete", (e: MessageEvent) => {
      const payload = JSON.parse(e.data)

      incrementTurn()
      setWorldState(payload.world_state)
      setCivStates(payload.civ_states)

      // Separate narrator events from action events
      const narratorEvent = payload.events?.find(
        (ev: { type: string }) => ev.type === "narrator"
      )
      const actionEvents = payload.events?.filter(
        (ev: { type: string }) => ev.type !== "narrator"
      ) ?? []

      if (narratorEvent?.narrative) {
        addNarration(payload.turn, narratorEvent.narrative)
      }

      if (payload.narrative && !narratorEvent) {
        addNarration(payload.turn, payload.narrative)
      }

      if (actionEvents.length > 0) {
        addEvents(actionEvents)
      }
    })

    es.addEventListener("sim_end", (e: MessageEvent) => {
      const payload = JSON.parse(e.data)
      updateStatus("completed")

      if (payload.final_narrative) {
        addNarration(payload.turn, payload.final_narrative)
      }

      addEvents([{
        id: `sim_end_${payload.turn}`,
        sim_id: simId,
        turn: payload.turn,
        type: "sim_end",
        actor: payload.winner,
        target: null,
        narrative: payload.final_narrative,
        data: { winner_reason: payload.winner_reason },
        timestamp: new Date().toISOString(),
      }])

      disconnect()
    })

    es.addEventListener("sim_error", (e: MessageEvent) => {
      const payload = JSON.parse(e.data)
      setError(payload.message || "Simulation error")
      setStatus("error")
      disconnect()
    })

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus("closed")
      } else {
        setError("Stream connection lost")
        setStatus("error")
      }
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [simId])

  return { status, error, disconnect }
}