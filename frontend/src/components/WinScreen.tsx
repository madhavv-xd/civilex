"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useEventStore } from "@/store/eventStore"
import { useSimStore } from "@/store/simStore"
import { useToastStore } from "@/store/toastStore"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { CIV_COLORS, CIV_NAMES, CIV_ICON_COMPONENTS } from "@/lib/civColors"
import { Trophy, ArrowLeft, BarChart, Scroll } from "@/components/Icons"

interface WinScreenProps {
  onViewSummary?: () => void
}

const WIN_LABEL: Record<string, string> = {
  domination:         "Domination Victory",
  elimination:        "Elimination Victory",
  stalemate:          "Stalemate — Most Tiles",
  draw:               "The age ended in a draw",
  mutual_destruction: "Mutual Destruction",
}

const WIN_FLAVOR: Record<string, string> = {
  domination:         "No stone unturned. No flag unplanted.",
  elimination:        "The last civilization standing in the ashes.",
  stalemate:          "History judges not by conquest, but by endurance.",
  draw:               "Neither sword nor treaty could decide the age.",
  mutual_destruction: "In the end, the world belonged to no one.",
}

export default function WinScreen({ onViewSummary }: WinScreenProps) {
  const { current } = useSimStore()
  const { events, narratorLog } = useEventStore()
  const addToast = useToastStore((s) => s.addToast)
  const trapRef = useFocusTrap<HTMLDivElement>(true)

  const [typedName, setTypedName] = useState("")

  const winner = current?.winner
  const name = winner ? CIV_NAMES[winner] ?? winner : ""

  // Type the winner name in character by character
  useEffect(() => {
    if (!name) return
    let i = 0
    const step = Math.max(30, 600 / name.length)
    const timer = setInterval(() => {
      i += 1
      setTypedName(name.slice(0, i))
      if (i >= name.length) clearInterval(timer)
    }, step)
    return () => clearInterval(timer)
  }, [name])

  if (!current || current.status !== "completed" || !winner) return null

  const winReason = current.winner_reason
  const color    = CIV_COLORS[winner] ?? "#eab308"
  const WinIcon  = CIV_ICON_COMPONENTS[winner] ?? null
  const finalNarrative = narratorLog[narratorLog.length - 1]?.text ?? ""

  const copyResult = async () => {
    const wars = events.filter((e) => e.type === "war_declaration").length
    const alliances = events.filter((e) => e.type === "alliance_formed").length
    const worldEvents = events.filter((e) =>
      ["drought", "plague", "gold_discovery", "natural_disaster", "ancient_ruins_found"].includes(e.type)
    ).length
    const shortId = current.id.slice(-6).toUpperCase()
    const text = [
      `⚔️ ${name.toUpperCase()} won CIVILEX simulation SIM-${shortId}`,
      `Victory: ${WIN_LABEL[winReason ?? ""] ?? winReason} in ${current.turn} turns`,
      `Wars: ${wars} | Alliances: ${alliances} | World Events: ${worldEvents}`,
      `${window.location.origin}/simulation/${current.id}`,
    ].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      addToast("Result copied to clipboard", "success")
    } catch {
      addToast("Could not access clipboard", "error")
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center
                    bg-zinc-950/90 backdrop-blur-sm win-backdrop">
      <ConfettiBurst color={color} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${name} wins`}
        className="max-w-md w-full mx-4 rounded-2xl border p-8 text-center shadow-2xl"
        style={{
          background:  `linear-gradient(135deg, #09090b 60%, ${color}15)`,
          borderColor: `${color}44`,
          boxShadow:   `0 0 60px ${color}22`,
        }}
      >
        {/* Winner icon — drops from above */}
        <div className="flex items-center justify-center mb-4 win-trophy">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}44`, color }}
          >
            {WinIcon ? <WinIcon size={32} /> : <Trophy size={32} />}
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-widest mb-1 win-trophy" style={{ color }}>
          {WIN_LABEL[winReason ?? ""] ?? winReason}
        </div>
        <div className="text-[11px] text-zinc-500 italic mb-3 win-trophy">
          {WIN_FLAVOR[winReason ?? ""] ?? ""}
        </div>

        {/* Winner name — typed in */}
        <div className="text-3xl font-bold text-zinc-100 mb-1 min-h-[2.5rem]">
          {typedName}
          {typedName.length < name.length && (
            <span className="animate-pulse" style={{ color }}>▌</span>
          )}
        </div>
        <div className="text-zinc-500 text-sm mb-6">Turn {current.turn}</div>

        {finalNarrative && (
          <div className="border-l-2 pl-4 text-left mb-6 win-narrative" style={{ borderColor: `${color}66` }}>
            <p className="text-sm text-zinc-400 italic leading-relaxed">
              &ldquo;{finalNarrative}&rdquo;
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-center flex-wrap win-narrative">
          <Link href="/"
             className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700
                        text-zinc-300 text-sm font-medium transition-colors">
            <ArrowLeft size={13} /> Dashboard
          </Link>
          {onViewSummary && (
            <button
              onClick={onViewSummary}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
            >
              <BarChart size={13} /> View Stats
            </button>
          )}
          <button
            onClick={copyResult}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                       border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
          >
            📋 Copy Result
          </button>
          <Link href="/history"
             className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                        border border-zinc-700 text-zinc-400 hover:text-zinc-200">
            <Scroll size={13} /> History
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Particle burst (vanilla canvas, no dependency) ────────────────────────────

function ConfettiBurst({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const palette = [color, "#ffffff", `${color}aa`]
    const particles = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 7
      return {
        x: canvas.width / 2,
        y: canvas.height / 2.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 2 + Math.random() * 4,
        color: palette[Math.floor(Math.random() * palette.length)],
        life: 1,
      }
    })

    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.18
        p.vx *= 0.99
        p.life -= 0.012
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }
      ctx.globalAlpha = 1
      if (alive) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [color])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
