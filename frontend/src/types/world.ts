export type TileType = "plains" | "forest" | "mountain" | "river" | "coast" | "ruins"

export interface HexTile {
  q: number
  r: number
  tile_type: TileType
  owner: string | null
  food: number
  gold: number
  stone: number
  has_unit: boolean
}

export interface CivResourceSnapshot {
  gold: number
  food: number
  stone: number
  military: number
  tile_count: number
}

export interface WorldState {
  tiles: HexTile[]
  civ_resources: Record<string, CivResourceSnapshot>
}

export interface Turn {
  id: string
  sim_id: string
  turn: number
  world_snapshot: WorldState
  timestamp: string
}