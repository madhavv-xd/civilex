"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import * as d3 from "d3"
import { useWorldStore } from "@/store/worldStore"
import { useUiStore } from "@/store/uiStore"
import { hexToPixel, gridBounds, tilesBounds, HEX_SIZE } from "@/lib/hexUtils"
import { CIV_COLORS, CIV_NAMES, TILE_COLORS } from "@/lib/civColors"
import type { HexTile } from "@/types"

const PAD = 20

// Axial neighbor directions, ordered so edge i sits between corner i and corner i+1
// (pointy-top, corners at 60·i − 30 degrees)
const AXIAL_DIRS: Array<[number, number]> = [
  [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1],
]

interface TooltipState {
  x: number
  y: number
  tile: HexTile
}

const tileKey = (t: { q: number; r: number }) => `${t.q},${t.r}`

export default function HexGrid() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const prevTilesRef = useRef<Map<string, string | null> | null>(null)

  const worldState = useWorldStore((s) => s.worldState)
  const focusedCiv = useUiStore((s) => s.focusedCiv)
  const clearFocusedCiv = useUiStore((s) => s.clearFocusedCiv)

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Derive bounds from the actual tiles so any grid size renders correctly
  const tiles = worldState?.tiles
  const bounds = useMemo(
    () => (tiles?.length ? tilesBounds(tiles, HEX_SIZE) : gridBounds(15, HEX_SIZE)),
    [tiles]
  )

  const center = (t: { q: number; r: number }) => {
    const { x, y } = hexToPixel(t.q, t.r, HEX_SIZE)
    return { x: x - bounds.minX + PAD, y: y - bounds.minY + PAD }
  }

  const cornerPoints = (t: { q: number; r: number }, size = HEX_SIZE - 1) => {
    const { x, y } = center(t)
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 30)
      return [x + size * Math.cos(angle), y + size * Math.sin(angle)] as [number, number]
    })
  }

  // ── Zoom / pan (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 6])
      .on("zoom", (event) => {
        svg.select<SVGGElement>(".viewport").attr("transform", event.transform.toString())
        setTooltip(null)
      })
    svg.call(zoom)
    zoomRef.current = zoom
    return () => {
      svg.on(".zoom", null)
    }
  }, [])

  // ── Tile rendering with diff updates ──────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !worldState?.tiles) return

    const svg = d3.select(svgRef.current)
    const tiles = worldState.tiles
    const hexGroup = svg.select<SVGGElement>(".hex-group")
    const unitGroup = svg.select<SVGGElement>(".unit-group")
    const borderGroup = svg.select<SVGGElement>(".border-group")

    const prevOwners = prevTilesRef.current
    const changed: HexTile[] = []
    if (prevOwners) {
      for (const t of tiles) {
        if (prevOwners.get(tileKey(t)) !== (t.owner ?? null)) changed.push(t)
      }
    }
    prevTilesRef.current = new Map(tiles.map((t) => [tileKey(t), t.owner ?? null]))

    // Enter (first paint or grid change)
    const hexes = hexGroup
      .selectAll<SVGPolygonElement, HexTile>("polygon.hex")
      .data(tiles, (d) => tileKey(d))

    hexes
      .enter()
      .append("polygon")
      .attr("class", "hex")
      .attr("points", (d) => cornerPoints(d).map((p) => p.join(",")).join(" "))
      .attr("fill", (d) => getTileFill(d))
      .attr("stroke", (d) => getTileStroke(d))
      .attr("stroke-width", (d) => (d.owner ? 1.5 : 0.5))
      .style("cursor", "pointer")
      .on("mouseenter", function (event: MouseEvent, d) {
        d3.select(this)
          .raise()
          .attr("fill-opacity", 0.8)
          .attr("stroke", "#fafafa")
          .attr("stroke-width", 2)
        const rect = containerRef.current!.getBoundingClientRect()
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, tile: d })
      })
      .on("mouseleave", function (_event, d) {
        d3.select(this)
          .attr("fill-opacity", 1)
          .attr("stroke", getTileStroke(d))
          .attr("stroke-width", d.owner ? 1.5 : 0.5)
        setTooltip(null)
      })

    hexes.exit().remove()

    // Re-bind data so tooltips show fresh tile values, but only animate changed tiles
    const all = hexGroup
      .selectAll<SVGPolygonElement, HexTile>("polygon.hex")
      .data(tiles, (d) => tileKey(d))

    if (!prevOwners) {
      all
        .attr("fill", (d) => getTileFill(d))
        .attr("stroke", (d) => getTileStroke(d))
        .attr("stroke-width", (d) => (d.owner ? 1.5 : 0.5))
    } else if (changed.length > 0) {
      const changedKeys = new Set(changed.map(tileKey))
      const changedSel = all.filter((d) => changedKeys.has(tileKey(d)))

      // Battle flash: white pulse, then settle into the new owner's blend
      changedSel
        .attr("fill", "#ffffff")
        .transition("flash")
        .duration(600)
        .attr("fill", (d) => getTileFill(d))

      // Turn-diff glow: thick outline in the new owner's color, fading over 2s
      changedSel
        .attr("stroke", (d) => (d.owner ? CIV_COLORS[d.owner] ?? "#fff" : "#ffffff66"))
        .attr("stroke-width", 4)
        .transition("glow")
        .duration(2000)
        .attr("stroke", (d) => getTileStroke(d))
        .attr("stroke-width", (d) => (d.owner ? 1.5 : 0.5))
    }

    // ── Unit markers ─────────────────────────────────────────────────────────
    const unitTiles = tiles.filter((t) => t.has_unit)
    const units = unitGroup
      .selectAll<SVGRectElement, HexTile>("rect.unit")
      .data(unitTiles, (d) => tileKey(d))

    units
      .enter()
      .append("rect")
      .attr("class", "unit")
      .attr("width", 7)
      .attr("height", 7)
      .attr("pointer-events", "none")
      .merge(units)
      .attr("transform", (d) => {
        const { x, y } = center(d)
        return `translate(${x},${y}) rotate(45) translate(-3.5,-3.5)`
      })
      .attr("fill", (d) => (d.owner ? CIV_COLORS[d.owner] ?? "#fff" : "#ffffffaa"))
      .attr("stroke", "#000")
      .attr("stroke-width", 0.75)

    units.exit().remove()

    // ── Territory borders ────────────────────────────────────────────────────
    const tileMap = new Map(tiles.map((t) => [tileKey(t), t]))
    const segmentsByCiv = new Map<string, string[]>()

    for (const t of tiles) {
      if (!t.owner) continue
      const corners = cornerPoints(t)
      AXIAL_DIRS.forEach(([dq, dr], i) => {
        const neighbor = tileMap.get(`${t.q + dq},${t.r + dr}`)
        if (neighbor && neighbor.owner === t.owner) return
        const [x1, y1] = corners[i]
        const [x2, y2] = corners[(i + 1) % 6]
        const segs = segmentsByCiv.get(t.owner!) ?? []
        segs.push(`M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`)
        segmentsByCiv.set(t.owner!, segs)
      })
    }

    const borders = borderGroup
      .selectAll<SVGPathElement, [string, string[]]>("path.border")
      .data(Array.from(segmentsByCiv.entries()), (d) => d[0])

    borders
      .enter()
      .append("path")
      .attr("class", "border")
      .attr("fill", "none")
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr("pointer-events", "none")
      .merge(borders)
      .attr("stroke", (d) => CIV_COLORS[d[0]] ?? "#fff")
      .attr("d", (d) => d[1].join(""))

    borders.exit().remove()
    // center/cornerPoints derive only from bounds, which is already a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldState, bounds])

  // ── Focused-civ dimming ────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg
      .selectAll<SVGPolygonElement, HexTile>("polygon.hex")
      .transition("focus")
      .duration(250)
      .attr("opacity", (d) => (!focusedCiv || d.owner === focusedCiv ? 1 : 0.2))
    svg
      .selectAll<SVGPathElement, [string, string[]]>("path.border")
      .transition("focus")
      .duration(250)
      .attr("opacity", (d) => (!focusedCiv || d[0] === focusedCiv ? 1 : 0.15))
  }, [focusedCiv, worldState])

  const resetView = () => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity)
  }

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomRef.current.scaleBy, factor)
  }

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

  const svgW = bounds.width + PAD * 2
  const svgH = bounds.height + PAD * 2

  const presentCivs = Array.from(
    new Set(worldState.tiles.map((t) => t.owner).filter((o): o is string => !!o))
  )

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-xl
                 bg-[radial-gradient(ellipse_at_center,#121217_0%,#09090b_75%)]"
    >
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none
                   bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45)_100%)]"
      />
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        className="block"
        role="img"
        aria-label="Hex world map"
        onClick={(e) => {
          if (e.target === e.currentTarget) clearFocusedCiv()
        }}
      >
        <g className="viewport">
          <g className="hex-group" />
          <g className="border-group" />
          <g className="unit-group" />
        </g>
      </svg>

      {/* Map controls */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-900/80 overflow-hidden">
          <button
            onClick={() => zoomBy(1.4)}
            aria-label="Zoom in"
            className="w-7 h-7 flex items-center justify-center text-zinc-400
                       hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-sm font-bold"
          >
            +
          </button>
          <span className="w-px bg-zinc-700" aria-hidden="true" />
          <button
            onClick={() => zoomBy(1 / 1.4)}
            aria-label="Zoom out"
            className="w-7 h-7 flex items-center justify-center text-zinc-400
                       hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-sm font-bold"
          >
            −
          </button>
        </div>
        <button
          onClick={resetView}
          aria-label="Reset map view"
          className="text-[10px] px-2.5 py-1.5 rounded-lg border border-zinc-700
                     bg-zinc-900/80 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200
                     font-medium uppercase tracking-wider transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* Legend — pinned bottom-left, unaffected by zoom */}
      <div className="absolute bottom-3 left-3 bg-zinc-900/85 border border-zinc-800 rounded-lg
                      px-3 py-2 space-y-1 pointer-events-none">
        {presentCivs.map((civId) => (
          <div key={civId} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm border border-black/40"
              style={{ background: CIV_COLORS[civId] ?? "#6b7280" }}
            />
            <span className="text-[10px] text-zinc-400 font-medium">
              {CIV_NAMES[civId] ?? civId}
            </span>
          </div>
        ))}
        {presentCivs.length === 0 && (
          <span className="text-[10px] text-zinc-600">Unclaimed world</span>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-zinc-900 border border-zinc-700
                     rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10, transform: "translateY(-50%)" }}
        >
          <div className="font-semibold text-zinc-100 capitalize mb-1">
            {tooltip.tile.tile_type}
          </div>
          {tooltip.tile.owner && (
            <div
              className="text-xs font-medium mb-1"
              style={{ color: CIV_COLORS[tooltip.tile.owner] ?? "#fff" }}
            >
              {CIV_NAMES[tooltip.tile.owner] ?? tooltip.tile.owner}
            </div>
          )}
          <div className="text-zinc-400 space-y-0.5">
            <div>🌾 {tooltip.tile.food.toFixed(1)}</div>
            <div>💰 {tooltip.tile.gold.toFixed(1)}</div>
            <div>🪨 {tooltip.tile.stone.toFixed(1)}</div>
          </div>
          {tooltip.tile.has_unit && (
            <div className="text-zinc-300 mt-1">⬥ Unit garrisoned</div>
          )}
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
