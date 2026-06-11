import type { ComponentType } from "react"
import { Sword2, Leaf, Coins, Eye } from "@/components/Icons"

export const CIV_COLORS: Record<string, string> = {
  ironhold:  "#C0392B",
  verdant:   "#27AE60",
  merchants: "#F39C12",
  conclave:  "#8E44AD",
}

export const CIV_ICON_COMPONENTS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  ironhold:  Sword2,
  verdant:   Leaf,
  merchants: Coins,
  conclave:  Eye,
}

export const CIV_NAMES: Record<string, string> = {
  ironhold:  "Ironhold",
  verdant:   "Verdant Pact",
  merchants: "Merchants",
  conclave:  "Conclave",
}

export const CIV_ICONS: Record<string, string> = {
  ironhold:  "⚔️",
  verdant:   "🌿",
  merchants: "💰",
  conclave:  "🔮",
}

export const TILE_COLORS: Record<string, string> = {
  plains:   "#4a7c2f",
  forest:   "#2d5a1b",
  mountain: "#6b7280",
  river:    "#1d6fa4",
  coast:    "#0e8a8a",
  ruins:    "#b8860b",
}

export const EVENT_META: Record<string, { icon: string; color: string; label: string }> = {
  war_declaration:      { icon: "⚔️",  color: "#ef4444", label: "War declared"     },
  peace_treaty:         { icon: "🕊️",  color: "#3b82f6", label: "Peace treaty"     },
  trade_accepted:       { icon: "🤝",  color: "#22c55e", label: "Trade accepted"   },
  trade_rejected:       { icon: "❌",  color: "#f59e0b", label: "Trade rejected"   },
  alliance_formed:      { icon: "🔗",  color: "#3b82f6", label: "Alliance formed"  },
  alliance_broken:      { icon: "💔",  color: "#ef4444", label: "Alliance broken"  },
  territory_captured:   { icon: "🚩",  color: "#f59e0b", label: "Territory seized" },
  build_infrastructure: { icon: "🏗️",  color: "#8b5cf6", label: "Built"            },
  civ_idle:             { icon: "👁️",  color: "#6b7280", label: "Observed"         },
  drought:              { icon: "☀️",  color: "#f97316", label: "Drought"          },
  plague:               { icon: "💀",  color: "#6b7280", label: "Plague"           },
  gold_discovery:       { icon: "✨",  color: "#eab308", label: "Gold found"       },
  natural_disaster:     { icon: "🌊",  color: "#3b82f6", label: "Disaster"         },
  ancient_ruins_found:  { icon: "🏛️",  color: "#a855f7", label: "Ruins found"      },
  rebellion:            { icon: "🔥",  color: "#ef4444", label: "Rebellion"        },
  relationship_shift:   { icon: "↕️",  color: "#38bdf8", label: "Relations shift"  },
  narrator:             { icon: "📜",  color: "#d4a847", label: "Chronicle"        },
  civ_eliminated:       { icon: "💀",  color: "#6b7280", label: "Eliminated"       },
  sim_start:            { icon: "🌍",  color: "#22c55e", label: "Age begins"       },
  sim_end:              { icon: "🏆",  color: "#eab308", label: "Age ends"         },
}