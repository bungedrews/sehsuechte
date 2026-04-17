'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="h-screen flex flex-col pt-[10px] pb-[10px] px-8 overflow-hidden">

      <div className="flex justify-between items-center shrink-0">
        <span className="t-label">Sehsüchte</span>
        <span className="t-label">2026</span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6 min-h-0">
        <div className="flex flex-col gap-3">
          <p className="t-label">Exhibition</p>
          <h1 className="t-heading">
            Welcome<br />curious explorer!
          </h1>
        </div>

        <p className="t-body max-w-[360px]">
          Move through the space. Collect the works that speak to you.
        </p>

        <button
          onClick={() => router.push('/checkin')}
          className="w-fit flex items-center gap-3 group mt-2"
        >
          <span className="t-label" style={{ color: 'var(--color-ink)' }}>Begin Journey</span>
          <span className="t-label group-hover:translate-x-1 transition-transform duration-300">→</span>
        </button>
      </div>

      <div className="flex justify-between items-end shrink-0">
        <span className="t-label">POI</span>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
      </div>

    </main>
  )
}
