export type EventType =
  | "war_declaration"
  | "peace_treaty"
  | "trade_offer"
  | "trade_accepted"
  | "trade_rejected"
  | "alliance_formed"
  | "alliance_broken"
  | "territory_captured"
  | "build_infrastructure"
  | "civ_idle"
  | "drought"
  | "plague"
  | "gold_discovery"
  | "natural_disaster"
  | "ancient_ruins_found"
  | "rebellion"
  | "narrator"
  | "turn_start"
  | "sim_start"
  | "sim_end"
  | "civ_eliminated"

export interface SimEvent {
  id: string
  sim_id: string
  turn: number
  type: EventType
  actor: string | null
  target: string | null
  narrative: string | null
  data: Record<string, unknown>
  timestamp: string
}

export interface TurnPayload {
  type: "turn_complete"
  turn: number
  events: SimEvent[]
  narrative: string
  world_state: import("./world").WorldState
  civ_states: Record<string, import("./civilization").CivState>
}