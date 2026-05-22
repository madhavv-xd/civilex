export interface CivConfig {
  id: string
  name: string
  traits: string[]
  personality: string
  starting_resources: Resources
  color: string
  spawn_corner: "top_left" | "top_right" | "bottom_left" | "bottom_right"
}

export interface Resources {
  gold: number
  food: number
  stone: number
  military: number
}

export interface CivState {
  id: string
  sim_id: string
  turn: number
  civ_id: string
  name: string
  traits: string[]
  resources: Resources
  tile_count: number
  is_alive: boolean
  relationships: Record<string, number>
  memory_summary: string
  last_action: string | null
  last_reasoning: string | null
  timestamp: string
}