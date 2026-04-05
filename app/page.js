'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen flex flex-col justify-between p-8" style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}>

      {/* Top bar */}
      <div className="flex justify-between items-center">
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Sehsüchte</span>
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">2026</span>
      </div>

      {/* Center content */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-[0.25em] text-neutral-400 uppercase">Exhibition</p>
          <h1
            className="text-6xl leading-[1.05] text-neutral-900"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Point of<br />Interest
          </h1>
        </div>

        <p className="text-sm text-neutral-500 leading-relaxed max-w-[260px]">
          Move through the space. Collect the works that speak to you.
        </p>

        <button
          onClick={() => router.push('/checkin')}
          className="w-fit flex items-center gap-3 group mt-2"
        >
          <span className="text-xs tracking-[0.2em] text-neutral-900 uppercase group-hover:text-neutral-500 transition-colors duration-300">
            Begin Journey
          </span>
          <span className="text-neutral-400 group-hover:translate-x-1 transition-transform duration-300">→</span>
        </button>
      </div>

      {/* Bottom */}
      <div className="flex justify-between items-end">
        <span className="text-xs text-neutral-300 tracking-widest">POI</span>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
      </div>

    </main>
  )
}