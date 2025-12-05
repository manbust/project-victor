'use client';

import dynamic from 'next/dynamic';

// FIXED: Import TriageDashboard instead of the Map directly.
// The TriageDashboard acts as the controller that stitches together 
// the Symptom Selector, Supabase Data, Weather API, and the Map.
const TriageDashboard = dynamic(
  () => import('@/components/triage-dashboard').then((mod) => ({ default: mod.TriageDashboard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-black min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-yellow-500 font-mono">
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Initializing V.I.C.T.O.R. Systems...</span>
          </div>
          <div className="text-red-500/80 text-xs font-mono">
            Loading Triage & Atmospheric Modules
          </div>
        </div>
      </div>
    )
  }
);

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-50 font-mono flex flex-col">
      {/* Header Section */}
      <header className="border-b border-red-500/60 bg-black shrink-0 z-10">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
              V.I.C.T.O.R.
            </h1>
            <p className="text-sm sm:text-base text-yellow-500 font-semibold">
              Viral Incident & Casualty Triage Operations Rig
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Gaussian Plume Model Visualization - Real-time atmospheric dispersion modeling 
              for viral incident monitoring and epidemiological risk assessment.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col">
        {/* 
          We remove the fixed height calc() and direct Map usage.
          Instead, we render the Dashboard which handles the layout 
          of the Panel (Left) and Map (Right).
        */}
        <div className="flex-1 w-full min-h-0 relative">
          <TriageDashboard 
            initialMapCenter={[40.7128, -74.0060]} // NYC coordinates
            initialMapZoom={10}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-red-500/60 bg-black shrink-0 z-10">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <p className="text-xs text-zinc-500">
              Safety-critical atmospheric dispersion modeling system
            </p>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span className="text-yellow-500">STATUS:</span>
              <span className="text-green-500">OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}