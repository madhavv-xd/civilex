"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/apiClient"
import { useSimStore } from "@/store/simStore"
import { toast } from "@/store/toastStore"

export interface StartSimParams {
  grid_size?: number
  max_turns?: number
  civ_ids?: string[]
}

export function useSimulation() {
  const [isStarting, setIsStarting] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const router = useRouter()

  const startSim = useCallback(async (params?: StartSimParams) => {
    setIsStarting(true)
    setStartError(null)
    try {
      const res = await api.startSim({
        grid_size: params?.grid_size ?? 15,
        max_turns: params?.max_turns ?? 50,
        ...(params?.civ_ids ? { civ_ids: params.civ_ids } : {}),
      })
      toast("Simulation started", "success")
      router.push(`/simulation/${res.sim_id}`)
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start")
      toast("Failed to start simulation", "error")
    } finally {
      setIsStarting(false)
    }
  }, [router])

  const pauseSim = useCallback(async (simId: string) => {
    setIsPausing(true)
    try {
      await api.pauseSim(simId)
      useSimStore.getState().updateStatus("paused")
    } catch (err) {
      console.error("Pause failed:", err)
      toast("Failed to pause simulation", "error")
    } finally {
      setIsPausing(false)
    }
  }, [])

  const resumeSim = useCallback(async (simId: string) => {
    setIsResuming(true)
    try {
      await api.resumeSim(simId)
      useSimStore.getState().updateStatus("running")
    } catch (err) {
      console.error("Resume failed:", err)
      toast("Failed to resume simulation", "error")
    } finally {
      setIsResuming(false)
    }
  }, [])

  const stopSim = useCallback(async (simId: string) => {
    setIsStopping(true)
    try {
      await api.stopSim(simId)
      useSimStore.getState().updateStatus("completed")
      toast("Simulation stopped", "info")
    } catch (err) {
      console.error("Stop failed:", err)
      toast("Failed to stop simulation", "error")
    } finally {
      setIsStopping(false)
    }
  }, [])

  return {
    startSim, pauseSim, resumeSim, stopSim,
    isStarting, isPausing, isResuming, isStopping,
    startError,
  }
}
