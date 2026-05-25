"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import * as d3 from "d3"
import { useWorldStore } from "@/store/worldStore"
import { hexToPixel, hexCorners, gridBounds, HEX_SIZE } from "@/lib/hexUtils"
import { CIV_COLORS, TILE_COLORS } from "@/lib/civColors"
import type { HexTile } from "@/types"

interface TooltipState {
  x: number; y: number
  tile: HexTile
  visible: boolean
}

export default function HexGrid() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { worldState } = useWorldStore()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const bounds = useMemo(() => gridBounds(15, HEX_SIZE), [])

  useEffect(() => {
    if (!svgRef.current || !worldState?.tiles) return

    const svg = d3.select(svgRef.current)
    const tiles = worldState.tiles

    const hexGroup = svg.select<SVGGElement>(".hex-group")

    // Bind data
    const hexes = hexGroup
      .selectAll<SVGPolygonElement, HexTile>("polygon.hex")
      .data(tiles, (d) => `${d.q},${d.r}`)

    // Enter
    hexes.enter()
      .append("polygon")
      .attr("class", "hex")
      .attr("points", (d) => {
        const { x, y } = hexToPixel(d.q, d.r, HEX_SIZE)
        return hexCorners(x - bounds.minX + 20, y - bounds.minY + 20, HEX_SIZE - 1)
      })
      .attr("fill", (d) => getTileFill(d))
      .attr("stroke", (d) => getTileStroke(d))
      .attr("stroke-width", (d) => d.owner ? 1.5 : 0.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 0.75)
        const rect = svgRef.current!.getBoundingClientRect()
        const { x, y } = hexToPixel(d.q, d.r, HEX_SIZE)
        setTooltip({
          x: x - bounds.minX + 20,
          y: y - bounds.minY + 20,
          tile: d,
          visible: true,
        })
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1)
        setTooltip(null)
      })

    // Update (animate ownership changes)
    hexGroup.selectAll<SVGPolygonElement, HexTile>("polygon.hex")
      .data(tiles, (d) => `${d.q},${d.r}`)
      .transition()
      .duration(600)
      .attr("fill", (d) => getTileFill(d))
      .attr("stroke", (d) => getTileStroke(d))
      .attr("stroke-width", (d) => d.owner ? 1.5 : 0.5)

  }, [worldState, bounds])

  if (!worldState) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">🌍</div>
          <p className="text-zinc-500 text-sm">Waiting for world generation...</p>
        </div>
      </div>
    )
  }

  const svgW = bounds.width + 40
  const svgH = bounds.height + 40

  return (
    <div className="relative w-full h-full overflow-auto bg-zinc-950 rounded-xl">
      <svg
        ref={svgRef}
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="block mx-auto"
      >
        <g className="hex-group" />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-zinc-900 border border-zinc-700
                     rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            left: tooltip.x + 28,
            top: tooltip.y - 20,
            transform: "translateY(-50%)",
          }}
        >
          <div className="font-semibold text-zinc-100 capitalize mb-1">
            {tooltip.tile.tile_type}
          </div>
          {tooltip.tile.owner && (
            <div
              className="text-xs font-medium mb-1"
              style={{ color: CIV_COLORS[tooltip.tile.owner] ?? "#fff" }}
            >
              {tooltip.tile.owner}
            </div>
          )}
          <div className="text-zinc-400 space-y-0.5">
            <div>🌾 {tooltip.tile.food.toFixed(1)}</div>
            <div>💰 {tooltip.tile.gold.toFixed(1)}</div>
            <div>🪨 {tooltip.tile.stone.toFixed(1)}</div>
          </div>
          <div className="text-zinc-600 mt-1">q={tooltip.tile.q} r={tooltip.tile.r}</div>
        </div>
      )}
    </div>
  )
}

function getTileFill(d: HexTile): string {
  const base = TILE_COLORS[d.tile_type] ?? "#4a4a4a"
  if (!d.owner) return base

  const civColor = CIV_COLORS[d.owner]
  if (!civColor) return base

  // Blend civ color over tile base
  return blendColors(base, civColor, 0.55)
}

function getTileStroke(d: HexTile): string {
  if (d.owner) return CIV_COLORS[d.owner] ?? "#ffffff33"
  return "#ffffff18"
}

function blendColors(base: string, overlay: string, alpha: number): string {
  const b = hexToRgb(base)
  const o = hexToRgb(overlay)
  if (!b || !o) return base
  const r = Math.round(b.r * (1 - alpha) + o.r * alpha)
  const g = Math.round(b.g * (1 - alpha) + o.g * alpha)
  const bl = Math.round(b.b * (1 - alpha) + o.b * alpha)
  return `rgb(${r},${g},${bl})`
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null
}