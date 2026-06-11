"use client"

import { useState } from "react"
import { useWorldStore } from "@/store/worldStore"
import { CIV_COLORS, CIV_ICONS, CIV_NAMES } from "@/lib/civColors"

const CIV_ORDER = ["ironhold", "verdant", "merchants", "conclave"]

/** Map −100…100 to a deep-red → grey → deep-green background */
function scoreColor(score: number): string {
  const t = Math.max(-100, Math.min(100, score)) / 100
  if (t >= 0) {
    const k = Math.round(t * 110)
    return `rgb(${40 - Math.round(t * 20)}, ${60 + k}, ${50})`
  }
  const k = Math.round(-t * 130)
  return `rgb(${60 + k}, ${40 - Math.round(-t * 15)}, ${45})`
}

export default function RelationshipMatrix() {
  const civStates = useWorldStore((s) => s.civStates)
  const [open, setOpen] = useState(false)

  const civs = CIV_ORDER.filter((id) => civStates[id])
  if (civs.length === 0) return null

  return (
    <div className="border-t border-zinc-800/70">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-1.5 text-left group"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600
                         group-hover:text-zinc-400 transition-colors">
          {open ? "▾" : "▸"} Relationship Matrix
        </span>
        <span className="flex-1 h-px bg-zinc-800/60" />
      </button>

      {open && (
        <div className="px-4 pb-3">
          <table className="border-separate border-spacing-0.5">
            <thead>
              <tr>
                <th className="w-8" aria-hidden="true" />
                {civs.map((id) => (
                  <th key={id} className="w-12 text-center" title={CIV_NAMES[id] ?? id}>
                    <span className="text-xs">{CIV_ICONS[id]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {civs.map((rowId) => (
                <tr key={rowId}>
                  <td className="text-center pr-1" title={CIV_NAMES[rowId] ?? rowId}>
                    <span className="text-xs">{CIV_ICONS[rowId]}</span>
                  </td>
                  {civs.map((colId) => {
                    if (rowId === colId) {
                      return (
                        <td key={colId}
                            className="w-12 h-7 rounded text-center bg-zinc-900 border border-zinc-800">
                          <span className="text-[10px]" style={{ color: CIV_COLORS[rowId] }}>—</span>
                        </td>
                      )
                    }
                    const score = civStates[rowId]?.relationships?.[colId]
                    return (
                      <td
                        key={colId}
                        className="w-12 h-7 rounded text-center"
                        style={{ background: score === undefined ? "#18181b" : scoreColor(score) }}
                        title={`${CIV_NAMES[rowId]} → ${CIV_NAMES[colId]}: ${score ?? "?"}`}
                      >
                        <span className="text-[10px] font-semibold text-white/90 tabular-nums">
                          {score === undefined ? "?" : score > 0 ? `+${score}` : score}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
