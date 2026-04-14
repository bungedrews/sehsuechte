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
    <main className="min-h-screen flex flex-col justify-between p-8" style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}>
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push('/')}
          className="text-xs tracking-[0.2em] text-neutral-400 uppercase hover:text-neutral-700 transition-colors"
        >
          ← Back
        </button>
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Check In</span>
      </div>

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-[0.25em] text-neutral-400 uppercase">Your name</p>
          <h2
            className="text-4xl text-neutral-900 leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
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
            className="bg-transparent border-b border-neutral-300 pb-3 text-neutral-900 text-lg placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
          />

          {error && (
            <p className="text-xs text-red-500 tracking-wide">{error}</p>
          )}

          <button
            onClick={handleCheckIn}
            disabled={loading || !name.trim()}
            className="w-fit flex items-center gap-3 group disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-xs tracking-[0.2em] text-neutral-900 uppercase group-hover:text-neutral-500 transition-colors duration-300">
              {loading ? 'Starting...' : 'Start Journey'}
            </span>
            {!loading && (
              <span className="text-neutral-400 group-hover:translate-x-1 transition-transform duration-300">→</span>
            )}
          </button>
        </div>
      </div>

      <div className="text-xs text-neutral-300 tracking-widest">
        Sehsüchte / 2025
      </div>
    </main>
  )
}
