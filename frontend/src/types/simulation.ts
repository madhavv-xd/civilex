export type SimStatus = "pending" | "running" | "paused" | "completed" | "failed"

export interface SimConfig {
  max_turns: number
  grid_size: number
  turn_delay_ms: number
  civ_ids: string[]
}

export interface Simulation {
  id: string
  status: SimStatus
  turn: number
  winner: string | null
  winner_reason: string | null
  civ_ids: string[]
  config: SimConfig
  final_narrative: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}