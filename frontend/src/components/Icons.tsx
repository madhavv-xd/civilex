/** Centralised SVG icon set — replace emoji chrome with crisp vector icons */

import { JSX } from "react"

interface IconProps {
  size?: number
  className?: string
}

const icon = (path: JSX.Element, vb = "0 0 24 24") =>
  function Icon({ size = 16, className = "" }: IconProps): JSX.Element {
    return (
      <svg
        width={size}
        height={size}
        viewBox={vb}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {path}
      </svg>
    )
  }

// ── Navigation ───────────────────────────────────────────────────────────────
export const ArrowLeft = icon(<><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></>)
export const ArrowRight = icon(<><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></>)
export const ChevronLeft = icon(<polyline points="15 18 9 12 15 6"/>)
export const ChevronRight = icon(<polyline points="9 18 15 12 9 6"/>)
export const ExternalLink = icon(<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>)

// ── Actions ──────────────────────────────────────────────────────────────────
export const Play = icon(<polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>)
export const Pause = icon(<><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></>)
export const Stop = icon(<rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" stroke="none"/>)
export const Download = icon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>)
export const Trash = icon(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>)
export const X = icon(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>)
export const RefreshCw = icon(<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>)

// ── Data / Status ─────────────────────────────────────────────────────────────
export const BarChart = icon(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>)
export const Trophy = icon(<><path d="M6 9H4a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2h-2"/><path d="M6 9a6 6 0 0 0 12 0"/><path d="M12 15v4"/><path d="M8 19h8"/></>)
export const Zap = icon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none"/>)
export const Shield = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>)
export const Sword = icon(<><line x1="14.5" y1="9.5" x2="3" y2="21"/><polyline points="8 4 20 4 20 16"/><line x1="12" y1="8" x2="20" y2="16"/></>)
export const Globe = icon(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>)
export const Scroll = icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>)
export const Clock = icon(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>)
export const Radio = icon(<><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></>)
export const Wifi = icon(<><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>)
export const AlertTriangle = icon(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>)
export const CheckCircle = icon(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>)
export const Database = icon(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>)

// ── Civilization-specific (colored accent icons) ──────────────────────────────
export const Sword2 = icon(
  <><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M8.5 8.5l-1 1"/></>,
)
export const Leaf = icon(<path d="M17 8C8 10 5.9 16.17 3.82 19.78a.5.5 0 0 0 .78.58C6.62 18.23 12.4 14 17 8z M2 22l.5-2"/>)
export const Coins = icon(<><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><line x1="16.71" y1="13.88" x2="13.38" y2="17.21"/></>)
export const Eye = icon(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>)

// ── Resource icons ────────────────────────────────────────────────────────────
export const Gold = icon(
  <><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4" strokeWidth={2}/></>,
)
export const Food = icon(<><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2v10l4.24 4.24"/></>)
export const Military = icon(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>)

// ── Event type icons ──────────────────────────────────────────────────────────
export const Swords = icon(<><line x1="4" y1="12" x2="20" y2="12" strokeWidth={0}/><path d="M6.5 4l-4 4 12 12 4-4L6.5 4zM20 4l-3 3M12 12l3 3"/><path d="M17.5 20l-4-4"/><path d="M3 20l4-4M3 3l3 3"/></>)
export const Handshake = icon(<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>)
export const Link2 = icon(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>)
export const Flag = icon(<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>)
export const Building = icon(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>)
export const Skull = icon(<><circle cx="12" cy="11" r="8"/><path d="M9 17v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2"/><line x1="9" y1="14" x2="9.01" y2="14" strokeWidth={3}/><line x1="15" y1="14" x2="15.01" y2="14" strokeWidth={3}/></>)
export const Sun = icon(<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>)
export const Flame = icon(<path d="M12 12c0-5-6-5-6-9a6 6 0 0 1 12 0c0 4-6 4-6 9m0 3v.01M12 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3z"/>)
export const Waves = icon(<><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></>)
export const Star = icon(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/>)
export const Landmark = icon(<><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></>)
export const Sparkles = icon(<><path d="M12 3L9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></>)
