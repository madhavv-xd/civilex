"use client"

import { useEffect, useRef } from "react"
import { useEventStore } from "@/store/eventStore"
import { CIV_COLORS, EVENT_META } from "@/lib/civColors"
import type { SimEvent } from "@/types"

export default function EventFeed() {
  const { events, narratorLog } = useEventStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

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

  // Merge narrator + events into a single sorted timeline
  const timeline = buildTimeline(narratorLog, events)

  if (timeline.length === 0) {
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
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto px-4 py-3 space-y-3"
    >
      {timeline.map((entry, i) => (
        entry.kind === "narrator"
          ? <NarratorBlock key={`n-${entry.turn}-${i}`} turn={entry.turn} text={entry.text!} />
          : <EventCard key={`e-${entry.id}-${i}`} event={entry.event!} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function NarratorBlock({ turn, text }: { turn: number; text: string }) {
  return (
    <div className="border-l-2 border-amber-500/60 pl-3 py-1">
      <div className="text-[10px] text-amber-500/60 font-medium uppercase tracking-widest mb-1">
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

  const skip = ["narrator", "civ_idle", "turn_start"]
  if (skip.includes(event.type)) return null

  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-zinc-900/60 px-3 py-2 border border-zinc-800/50">
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

// ── Timeline builder ──────────────────────────────────────────────────────────

type TimelineEntry =
  | { kind: "narrator"; turn: number; text: string; event?: never; id?: never }
  | { kind: "event"; turn: number; event: SimEvent; text?: never; id: string }

function buildTimeline(
  narratorLog: Array<{ turn: number; text: string }>,
  events: SimEvent[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  const maxTurn = Math.max(
    ...narratorLog.map((n) => n.turn),
    ...events.map((e) => e.turn),
    0,
  )

  for (let t = 1; t <= maxTurn; t++) {
    // Events for this turn first
    const turnEvents = events.filter(
      (e) => e.turn === t && !["narrator", "civ_idle", "turn_start"].includes(e.type)
    )
    for (const ev of turnEvents) {
      entries.push({ kind: "event", turn: t, event: ev, id: ev.id ?? `${t}-${ev.type}` })
    }

    // Narrator comes last (summary of the turn)
    const narr = narratorLog.find((n) => n.turn === t)
    if (narr) {
      entries.push({ kind: "narrator", turn: t, text: narr.text })
    }
  }

  return entries
}