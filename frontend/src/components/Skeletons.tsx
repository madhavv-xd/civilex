export function HexGridSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(15, 1fr)" }}>
        {Array.from({ length: 225 }).map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded bg-zinc-900 animate-pulse"
            style={{ animationDelay: `${(i % 30) * 50}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function EventFeedSkeleton() {
  return (
    <div className="px-4 py-3 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-zinc-800/70 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-zinc-800/50 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export function CivPanelSkeleton() {
  return (
    <div className="flex gap-3 h-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-zinc-800" />
            <div className="h-3 w-20 bg-zinc-800 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-zinc-800 rounded-full" />
            <div className="h-1.5 w-4/5 bg-zinc-800 rounded-full" />
            <div className="h-1.5 w-3/5 bg-zinc-800 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}