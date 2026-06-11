"use client"

import { useState, useCallback } from "react"
import { useWorldStore } from "@/store/worldStore"
import { useEventStore } from "@/store/eventStore"

export function useReplay(simId: string, totalTurns: number) {
  const [replayTurn, setReplayTurn] = useState<number>(totalTurns)
  const [isLoading, setIsLoading] = useState(false)
  const [isReplayMode, setIsReplayMode] = useState(false)

  const { setWorldState } = useWorldStore()
  const { addNarration } = useEventStore()

  const goToTurn = useCallback(async (turn: number) => {
    if (!simId || turn < 0) return
    setIsLoading(true)
    setReplayTurn(turn)
    setIsReplayMode(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sim/${simId}/turn/${turn}`
      )
      if (!res.ok) return
      const data = await res.json()

      // Update world state for this turn
      setWorldState(data.world_snapshot)

      // Show events for this turn in feed
      const narratorEvent = data.events?.find(
        (e: { type: string }) => e.type === "narrator"
      )
      if (narratorEvent?.narrative) {
        addNarration(turn, narratorEvent.narrative)
      }

    } catch (err) {
      console.error("Replay fetch failed:", err)
    } finally {
      setIsLoading(false)
    }
  }, [simId, setWorldState, addNarration])

  const exitReplay = useCallback(async () => {
    await goToTurn(totalTurns)
    setIsReplayMode(false)
    setReplayTurn(totalTurns)
  }, [totalTurns, goToTurn])

  return {
    replayTurn,
    isLoading,
    isReplayMode,
    goToTurn,
    exitReplay,
  }
}