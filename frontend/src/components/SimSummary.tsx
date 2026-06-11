"use client"

import { useEffect, useState } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { CIV_COLORS, CIV_NAMES, CIV_ICON_COMPONENTS } from "@/lib/civColors"
import { Trophy, X, Download, Clock, BarChart, Sword2, Link2, Flag, Handshake, Building, Skull, Globe } from "@/components/Icons"

interface SummaryData {
  sim_id: string
  winner: string | null
  turn: number
  status: string
  total_events: number
  wars_declared: number
  alliances_formed: number
  alliances_broken: number
  trades_accepted: number
  trades_rejected: number
  territory_captures: number
  world_events: number
  civilizations_eliminated: number
  infrastructure_built: number
}

interface SimSummaryProps {
  simId: string
  isVisible: boolean
  onClose: () => void
}

export default function SimSummary({ simId, isVisible, onClose }: SimSummaryProps) {
  const [loaded, setLoaded] = useState<{ simId: string; summary: SummaryData } | null>(null)
  const trapRef = useFocusTrap<HTMLDivElement>(isVisible)

  useEffect(() => {
    if (!isVisible || !simId) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/sim/${simId}/summary`)
      .then((r) => r.json())
      .then((summary: SummaryData) => setLoaded({ simId, summary }))
      .catch(console.error)
  }, [isVisible, simId])

  const summary = loaded?.simId === simId ? loaded.summary : null
  const loading = summary === null

  if (!isVisible) return null

  const winColor    = summary?.winner ? CIV_COLORS[summary.winner] : "#6b7280"
  const WinIconComp = summary?.winner ? CIV_ICON_COMPONENTS[summary.winner] : null
  const winName     = summary?.winner ? CIV_NAMES[summary.winner] : "No winner"

  const stats = summary ? [
    { label: "Total turns",      value: summary.turn,                     Icon: Clock    },
    { label: "Total events",     value: summary.total_events,             Icon: BarChart  },
    { label: "Wars declared",    value: summary.wars_declared,            Icon: Sword2    },
    { label: "Alliances formed", value: summary.alliances_formed,         Icon: Link2     },
    { label: "Alliances broken", value: summary.alliances_broken,         Icon: X        },
    { label: "Trades accepted",  value: summary.trades_accepted,          Icon: Handshake },
    { label: "Tiles captured",   value: summary.territory_captures,       Icon: Flag      },
    { label: "World events",     value: summary.world_events,             Icon: Globe     },
    { label: "Civs eliminated",  value: summary.civilizations_eliminated, Icon: Skull     },
    { label: "Infrastructure",   value: summary.infrastructure_built,     Icon: Building  },
  ] : []

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center
                    bg-zinc-950/80 backdrop-blur-sm"
         onClick={onClose}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Simulation summary"
        className="max-w-sm w-full mx-4 rounded-2xl border p-6 shadow-2xl"
        style={{
          background: "#0d0d0f",
          borderColor: `${winColor}33`,
          boxShadow: `0 0 40px ${winColor}15`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${winColor}18`, border: `1px solid ${winColor}33`, color: winColor }}
            >
              {WinIconComp ? <WinIconComp size={16} /> : <Trophy size={16} />}
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">{winName}</div>
              <div className="text-[10px] text-zinc-500">Simulation Summary</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close summary"
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-zinc-600"><stat.Icon size={13} /></span>
                  <span className="text-lg font-bold text-zinc-100 tabular-nums">
                    {stat.value}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Export button */}
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/sim/${simId}/export`}
          download
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5
                     rounded-xl border border-zinc-700 text-zinc-400 text-sm
                     hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <Download size={14} /> Export JSON
        </a>
      </div>
    </div>
  )
}