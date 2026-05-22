import Link from "next/link"

export default function HistoryPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">📜</div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Simulation History</h1>
        <p className="text-zinc-500 text-sm mb-6">Past runs will appear here</p>
        <p className="text-zinc-600 text-xs mb-6">Built in Phase 6</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to dashboard
        </Link>
      </div>
    </main>
  )
}