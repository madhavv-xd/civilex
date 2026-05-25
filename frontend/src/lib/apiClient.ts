const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API error ${res.status}: ${error}`)
  }
  return res.json()
}

export const api = {
  health: () => apiFetch<{ status: string; db: string }>("/health"),

  startSim: (params?: { grid_size?: number; max_turns?: number }) =>
    apiFetch<{ sim_id: string; status: string; stream: string }>("/sim/start", {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    }),

  stopSim: (simId: string) =>
    apiFetch<{ sim_id: string; status: string }>(`/sim/${simId}/stop`, {
      method: "POST",
    }),

  getSim: (simId: string) =>
    apiFetch<{
      sim_id: string; status: string; turn: number
      winner: string | null; winner_reason: string | null
      civ_ids: string[]; config: { max_turns: number; grid_size: number }
      final_narrative: string | null
      created_at: string; completed_at: string | null
    }>(`/sim/${simId}`),

  listSims: () =>
    apiFetch<{ simulations: Array<{
      sim_id: string; status: string; turn: number
      winner: string | null; winner_reason: string | null
      civ_ids: string[]; created_at: string; completed_at: string | null
    }> }>("/sims"),

  streamUrl: (simId: string) => `${API_BASE}/sim/${simId}/stream`,
}