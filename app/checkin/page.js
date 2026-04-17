'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function CheckIn() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleCheckIn = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('sessions')
      .insert({ name })
      .select()
      .single()

    if (error) {
      console.error(error)
      setError('Something went wrong. Try again.')
      setLoading(false)
      return
    }

    localStorage.setItem('session_id', data.id)
    router.push('/checkin/ready')
  }

  return (
    <main className="min-h-screen flex flex-col justify-between p-8">
      <div className="flex justify-between items-center">
        <button onClick={() => router.push('/')} className="t-label">← Back</button>
        <span className="t-label">Check In</span>
      </div>

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <p className="t-label">Your name</p>
          <h2 className="t-heading">
            Who's exploring<br />today?
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
            autoFocus
            className="t-input bg-transparent border-b border-neutral-300 pb-3 focus:outline-none focus:border-neutral-600 transition-colors"
          />

          {error && <p className="t-error">{error}</p>}

          <button
            onClick={handleCheckIn}
            disabled={loading || !name.trim()}
            className="w-fit flex items-center gap-3 group disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="t-label" style={{ color: 'var(--color-ink)' }}>
              {loading ? 'Starting...' : 'Start Journey'}
            </span>
            {!loading && (
              <span className="t-label group-hover:translate-x-1 transition-transform duration-300">→</span>
            )}
          </button>
        </div>
      </div>

      <div className="t-label">Sehsüchte / 2026</div>
    </main>
  )
}
