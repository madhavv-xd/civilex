"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/apiClient"
import { useSimStore } from "@/store/simStore"

export function useSimulation() {
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const router = useRouter()
  const { current, setCurrent } = useSimStore()

  const startSim = useCallback(async () => {
    setIsStarting(true)
    setStartError(null)
    try {
      const res = await api.startSim({ grid_size: 15, max_turns: 50 })
      router.push(`/simulation/${res.sim_id}`)
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start")
    } finally {
      setIsStarting(false)
    }
  }, [router])

  const stopSim = useCallback(async (simId: string) => {
    setIsStopping(true)
    try {
      await api.stopSim(simId)
      if (current) {
        setCurrent({ ...current, status: "paused" })
      }
    } catch (err) {
      console.error("Stop failed:", err)
    } finally {
      setIsStopping(false)
    }
  }, [current, setCurrent])

  return {
    startSim, stopSim,
    isStarting, isStopping,
    startError,
  }
}