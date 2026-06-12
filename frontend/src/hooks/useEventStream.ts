"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSimStore } from "@/store/simStore"
import { useWorldStore } from "@/store/worldStore"
import { useEventStore } from "@/store/eventStore"
import { api } from "@/lib/apiClient"
import type { CivState, SimEvent, TurnPayload } from "@/types"

export type StreamStatus =
  | "idle" | "connecting" | "connected" | "closed" | "error" | "reconnecting"

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_BASE_MS = 2000 // 2s → 4s → 8s
const REL_SHIFT_THRESHOLD = 30

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Synthesize relationship_shift events for pairs that moved ≥ threshold this turn */
function computeRelationshipShifts(
  prev: Record<string, CivState>,
  next: Record<string, CivState>,
  turn: number,
  simId: string,
): SimEvent[] {
  const shifts: SimEvent[] = []
  const seen = new Set<string>()

  for (const [civId, cs] of Object.entries(next)) {
    const prevCs = prev[civId]
    if (!prevCs) continue
    for (const [otherId, after] of Object.entries(cs.relationships ?? {})) {
      const pairKey = [civId, otherId].sort().join("|")
      if (seen.has(pairKey)) continue
      const before = prevCs.relationships?.[otherId]
      if (before === undefined) continue
      if (Math.abs(after - before) < REL_SHIFT_THRESHOLD) continue
      seen.add(pairKey)
      shifts.push({
        id: `rel_${turn}_${pairKey}`,
        sim_id: simId,
        turn,
        type: "relationship_shift",
        actor: civId,
        target: otherId,
        narrative: null,
        data: { before, after },
        timestamp: new Date().toISOString(),
      })
    }
  }
  return shifts
}

export function useEventStream(simId: string | null) {
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endedRef = useRef(false)
  const turnQueueRef = useRef<TurnPayload[]>([])
  const processingRef = useRef(false)
  const lastTurnRef = useRef(0)

  const disconnect = useCallback(() => {
    endedRef.current = true
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setStatus("closed")
  }, [])

  useEffect(() => {
    if (!simId) return

    endedRef.current = false
    retryRef.current = 0
    turnQueueRef.current = []
    lastTurnRef.current = 0
    useEventStore.getState().reset()

    const applyTurn = (payload: TurnPayload) => {
      // The server replays the latest turn snapshot to (re)connecting
      // clients — skip turns we've already rendered.
      if (payload.turn <= lastTurnRef.current) return
      lastTurnRef.current = payload.turn

      const world = useWorldStore.getState()
      const { setTurn } = useSimStore.getState()
      const { addEvents, addNarration } = useEventStore.getState()

      const shifts = computeRelationshipShifts(
        world.civStates, payload.civ_states, payload.turn, simId
      )

      setTurn(payload.turn)
      world.setWorldState(payload.world_state)
      world.setCivStates(payload.civ_states)
      useWorldStore.getState().recordTurnStats()

      const narratorEvent = payload.events?.find((ev) => ev.type === "narrator")
      const actionEvents = payload.events?.filter((ev) => ev.type !== "narrator") ?? []

      if (narratorEvent?.narrative) {
        addNarration(payload.turn, narratorEvent.narrative)
      } else if (payload.narrative) {
        addNarration(payload.turn, payload.narrative)
      }

      const combined = [...actionEvents, ...shifts]
      if (combined.length > 0) addEvents(combined)
    }

    // Drain the turn queue, pacing by the user-selected turn delay
    const processQueue = async () => {
      if (processingRef.current) return
      processingRef.current = true
      try {
        while (turnQueueRef.current.length > 0) {
          const payload = turnQueueRef.current.shift()!
          applyTurn(payload)
          const delay = useSimStore.getState().turnDelayMs
          if (delay > 0) await sleep(delay)
        }
      } finally {
        processingRef.current = false
      }
      // Anything queued while we slept on the last item
      if (turnQueueRef.current.length > 0) void processQueue()
    }

    const connect = () => {
      setStatus("connecting")
      setError(null)
      const es = new EventSource(api.streamUrl(simId))
      esRef.current = es

      es.onopen = () => {
        retryRef.current = 0
        setReconnectAttempt(0)
        setError(null)
        setStatus("connected")
      }

      es.addEventListener("sim_start", (e: MessageEvent) => {
        const payload = JSON.parse(e.data)
        const world = useWorldStore.getState()
        world.setWorldState(payload.world_snapshot)
        world.setCivStates(payload.civ_states)
      })

      es.addEventListener("turn_complete", (e: MessageEvent) => {
        turnQueueRef.current.push(JSON.parse(e.data) as TurnPayload)
        void processQueue()
      })

      es.addEventListener("sim_paused", () => {
        useSimStore.getState().updateStatus("paused")
      })

      es.addEventListener("sim_resumed", () => {
        useSimStore.getState().updateStatus("running")
      })

      es.addEventListener("sim_end", (e: MessageEvent) => {
        const payload = JSON.parse(e.data)
        const { updateStatus } = useSimStore.getState()
        const { addEvents, addNarration } = useEventStore.getState()
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
        if (endedRef.current) return
        es.close()
        esRef.current = null

        if (retryRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError("Stream connection lost")
          setStatus("error")
          return
        }

        retryRef.current += 1
        setReconnectAttempt(retryRef.current)
        setStatus("reconnecting")
        const backoff = RECONNECT_BASE_MS * 2 ** (retryRef.current - 1)
        retryTimerRef.current = setTimeout(() => {
          if (!endedRef.current) connect()
        }, backoff)
      }
    }

    // Defer so connection-status setState runs outside the effect body
    const startTimer = setTimeout(connect, 0)

    return () => {
      endedRef.current = true
      clearTimeout(startTimer)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      esRef.current?.close()
      esRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simId])

  return { status, error, reconnectAttempt, disconnect }
}
