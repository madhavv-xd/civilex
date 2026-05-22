export default function SimulationPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Simulation Viewer</h1>
        <p className="text-zinc-500 text-sm">Sim ID: {params.id}</p>
        <p className="text-zinc-600 text-xs mt-2">Built in Phase 5</p>
      </div>
    </main>
  )
}