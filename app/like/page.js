// app/like/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Like() {
  const router = useRouter()
  const [status, setStatus] = useState('saving') // saving | success | error | no-session

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    const saveScan = async () => {
      const sessionId = localStorage.getItem('session_id')

      if (!sessionId) {
        setStatus('no-session')
        return
      }

      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .select('id, title, artist')
        .eq('nfc_code', code)
        .single()

      if (artworkError || !artwork) {
        setStatus('error')
        return
      }

      // Check if already scanned
      const { data: existing } = await supabase
        .from('scans')
        .select('id')
        .eq('session_id', sessionId)
        .eq('artwork_id', artwork.id)
        .single()

      if (existing) {
        setStatus('already')
        return
      }

      const { error: scanError } = await supabase
        .from('scans')
        .insert({ session_id: sessionId, artwork_id: artwork.id })

      if (scanError) {
        setStatus('error')
        return
      }

      setStatus('success')
    }

    if (code) saveScan()
    else setStatus('error')
  }, [])

  const screens = {
    saving: {
      icon: '◌',
      title: 'Saving...',
      sub: null,
      hint: null,
    },
    success: {
      icon: '✦',
      title: 'Scan successful!',
      sub: 'This artwork has been added to your collection.',
      hint: 'Close this tab to continue your journey',
    },
    already: {
      icon: '○',
      title: 'Already saved',
      sub: 'This artwork is already in your collection.',
      hint: 'Close this tab to continue your journey',
    },
    error: {
      icon: '×',
      title: 'Something went wrong',
      sub: 'This artwork could not be found.',
      hint: 'Close this tab and try again',
    },
    'no-session': {
      icon: '×',
      title: 'No session found',
      sub: 'Please check in first before scanning artworks.',
      hint: null,
    },
  }

  const screen = screens[status]

  return (
    <main
      className="min-h-screen flex flex-col justify-between p-8"
      style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center">
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Sehsüchte</span>
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Artwork</span>
      </div>

      {/* Center content */}
      <div className="flex flex-col gap-6">
        <span className="text-3xl text-neutral-300">{screen.icon}</span>
        <div className="flex flex-col gap-2">
          <h1
            className="text-4xl text-neutral-900 leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {screen.title}
          </h1>
          {screen.sub && (
            <p className="text-sm text-neutral-500 leading-relaxed max-w-[260px]">
              {screen.sub}
            </p>
          )}
        </div>

        {status === 'no-session' && (
          <button
            onClick={() => router.push('/checkin')}
            className="w-fit flex items-center gap-3 group"
          >
            <span className="text-xs tracking-[0.2em] text-neutral-900 uppercase group-hover:text-neutral-500 transition-colors">
              Go to check in
            </span>
            <span className="text-neutral-400 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        )}
      </div>

      {/* Bottom hint */}
      {screen.hint && (
        <p className="text-xs text-neutral-300 tracking-wide">
          {screen.hint}
        </p>
      )}
    </main>
  )
}