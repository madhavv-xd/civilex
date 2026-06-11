"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useEventStore } from "@/store/eventStore"
import { CIV_COLORS, EVENT_META } from "@/lib/civColors"
import type { SimEvent } from "@/types"

const SKIP_TYPES = ["narrator", "civ_idle", "turn_start"]

type FeedFilter = "all" | "wars" | "diplomacy" | "world" | "narrator"

const FILTER_LABELS: Array<{ id: FeedFilter; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "wars", label: "WARS" },
  { id: "diplomacy", label: "DIPLOMACY" },
  { id: "world", label: "WORLD" },
  { id: "narrator", label: "NARRATOR" },
]

const WAR_TYPES = new Set(["war_declaration", "territory_captured", "rebellion", "civ_eliminated"])
const DIPLOMACY_TYPES = new Set([
  "peace_treaty", "trade_offer", "trade_accepted", "trade_rejected",
  "alliance_formed", "alliance_broken", "relationship_shift",
])

function eventMatchesFilter(type: string, filter: FeedFilter): boolean {
  switch (filter) {
    case "all": return true
    case "narrator": return false
    case "wars": return WAR_TYPES.has(type)
    case "diplomacy": return DIPLOMACY_TYPES.has(type)
    case "world": return !WAR_TYPES.has(type) && !DIPLOMACY_TYPES.has(type)
  }
}

export default function EventFeed() {
  const events = useEventStore((s) => s.events)
  const narratorLog = useEventStore((s) => s.narratorLog)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  const [filter, setFilter] = useState<FeedFilter>("all")
  const [collapsedTurns, setCollapsedTurns] = useState<Set<number>>(new Set())

  // Track scroll position
  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [events, narratorLog])

  const latestNarratorTurn = narratorLog.length
    ? narratorLog[narratorLog.length - 1].turn
    : -1

  // Group entries per turn
  const turns = useMemo(
    () => buildTurns(narratorLog, events),
    [narratorLog, events]
  )

  const toggleTurn = (turn: number) =>
    setCollapsedTurns((prev) => {
      const next = new Set(prev)
      if (next.has(turn)) next.delete(turn)
      else next.add(turn)
      return next
    })

  if (turns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-4">
          <div className="text-2xl mb-2">📜</div>
          <p className="text-zinc-600 text-sm">History awaits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="flex gap-1 px-3 py-2 border-b border-zinc-800/70 flex-shrink-0 flex-wrap">
        {FILTER_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={`text-[9px] font-semibold tracking-wider px-2 py-1 rounded-md border transition-colors ${
              filter === id
                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="status"
        aria-live="polite"
        aria-label="Event chronicle"
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
      >
        {turns.map(({ turn, turnEvents, narration }) => {
          const visibleEvents = turnEvents.filter((e) => eventMatchesFilter(e.type, filter))
          const showNarration =
            narration !== null && (filter === "all" || filter === "narrator")
          if (visibleEvents.length === 0 && !showNarration) return null
          const collapsed = collapsedTurns.has(turn)

          return (
            <div key={turn}>
              {/* Collapsible turn header */}
              <button
                onClick={() => toggleTurn(turn)}
                aria-expanded={!collapsed}
                className="w-full flex items-center gap-2 py-1.5 text-left group"
              >
                <span className="text-[10px] font-semibold text-zinc-600 group-hover:text-zinc-400
                                 tracking-widest font-mono transition-colors">
                  {collapsed ? "▸" : "▾"} TURN {String(turn).padStart(2, "0")}
                </span>
                <span className="flex-1 h-px bg-zinc-800/80" />
                {collapsed && (
                  <span className="text-[9px] text-zinc-700">
                    {visibleEvents.length + (showNarration ? 1 : 0)} entries
                  </span>
                )}
              </button>

              {!collapsed && (
                <div className="space-y-2">
                  {visibleEvents.map((ev, i) => (
                    <EventCard key={`${ev.id ?? ev.type}-${i}`} event={ev} />
                  ))}
                  {showNarration && (
                    <NarratorBlock
                      turn={turn}
                      text={narration!}
                      isLatest={turn === latestNarratorTurn}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function NarratorBlock({ turn, text, isLatest }: { turn: number; text: string; isLatest: boolean }) {
  return (
    <div
      data-event-type="narrator"
      className={`feed-enter border-l-2 pl-3 py-1 rounded-r ${
        isLatest
          ? "border-amber-400 narrator-latest"
          : "border-amber-500/60"
      }`}
    >
      <div className={`text-[10px] font-medium uppercase tracking-widest mb-1 ${
        isLatest ? "text-amber-400" : "text-amber-500/60"
      }`}>
        Turn {turn}
      </div>
      <p className="text-sm text-zinc-300 italic leading-relaxed">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  )
}

function EventCard({ event }: { event: SimEvent }) {
  const meta = EVENT_META[event.type] ?? { icon: "📌", color: "#6b7280", label: event.type }

  if (SKIP_TYPES.includes(event.type)) return null
  if (event.type === "relationship_shift") return <RelationshipShiftCard event={event} />

  return (
    <div
      data-event-type={event.type}
      className="feed-enter flex items-start gap-2.5 rounded-lg bg-zinc-900/60 px-3 py-2 border border-zinc-800/50"
    >
      <span className="text-sm flex-shrink-0 mt-0.5">{meta.icon}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>

          {event.actor && (
            <span
              className="text-[10px] font-medium"
              style={{ color: CIV_COLORS[event.actor] ?? "#9ca3af" }}
            >
              {event.actor}
            </span>
          )}

          {event.target && event.target !== event.actor && (
            <>
              <span className="text-zinc-600 text-[10px]">→</span>
              <span
                className="text-[10px] font-medium"
                style={{ color: CIV_COLORS[event.target] ?? "#9ca3af" }}
              >
                {event.target}
              </span>
            </>
          )}
        </div>

        {event.narrative && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            {event.narrative}
          </p>
        )}
      </div>
    </div>
  )
}

function RelationshipShiftCard({ event }: { event: SimEvent }) {
  const data = event.data as { before?: number; after?: number }
  const before = data.before ?? 0
  const after = data.after ?? 0
  const delta = after - before
  const moodAfter =
    after >= 60 ? "allied" : after >= 20 ? "friendly" :
    after >= -20 ? "neutral" : after >= -60 ? "hostile" : "at war"
  const deltaColor = delta > 0 ? "#22c55e" : "#ef4444"

  const toPct = (v: number) => ((v + 100) / 200) * 100

  return (
    <div
      data-event-type="relationship_shift"
      className="feed-enter rounded-lg bg-zinc-900/60 px-3 py-2 border border-zinc-800/50"
    >
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <span style={{ color: deltaColor }} className="font-semibold">
          {delta > 0 ? "↑" : "↓"}
        </span>
        <span className="font-medium uppercase" style={{ color: CIV_COLORS[event.actor ?? ""] ?? "#9ca3af" }}>
          {event.actor}
        </span>
        <span className="text-zinc-600">↔</span>
        <span className="font-medium uppercase" style={{ color: CIV_COLORS[event.target ?? ""] ?? "#9ca3af" }}>
          {event.target}
        </span>
        <span className="font-semibold tabular-nums" style={{ color: deltaColor }}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
        <span className="text-zinc-500">(now {moodAfter})</span>
      </div>
      {/* Before/after relationship meter */}
      <div className="relative mt-1.5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
        <div
          className="absolute inset-y-0 w-1 rounded-full bg-zinc-500"
          style={{ left: `calc(${toPct(before)}% - 2px)` }}
          title={`before: ${before}`}
        />
        <div
          className="absolute inset-y-0 w-1 rounded-full"
          style={{ left: `calc(${toPct(after)}% - 2px)`, background: deltaColor }}
          title={`after: ${after}`}
        />
      </div>
    </div>
  )
}

// ── Turn grouping ─────────────────────────────────────────────────────────────

interface TurnGroup {
  turn: number
  turnEvents: SimEvent[]
  narration: string | null
}

function buildTurns(
  narratorLog: Array<{ turn: number; text: string }>,
  events: SimEvent[],
): TurnGroup[] {
  const maxTurn = Math.max(
    ...narratorLog.map((n) => n.turn),
    ...events.map((e) => e.turn),
    0,
  )

  const groups: TurnGroup[] = []
  for (let t = 1; t <= maxTurn; t++) {
    const turnEvents = events.filter(
      (e) => e.turn === t && !SKIP_TYPES.includes(e.type)
    )
    const narration = narratorLog.find((n) => n.turn === t)?.text ?? null
    if (turnEvents.length === 0 && narration === null) continue
    groups.push({ turn: t, turnEvents, narration })
  }
  return groups
}
