// app/like/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Like() {
  const router = useRouter()
  const [status, setStatus] = useState('saving')

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
    saving:       { icon: '◌', title: 'Saving...',               sub: null,                                         hint: null },
    success:      { icon: '✦', title: 'Scan successful!',        sub: 'Close this tab to continue your journey.',   hint: 'This artwork has been added to your collection' },
    already:      { icon: '○', title: 'Already saved',           sub: 'Close this tab to continue your journey.',   hint: 'This artwork is already in your collection' },
    error:        { icon: '×', title: 'Something went wrong :(', sub: 'Close this tab and try again.',              hint: 'This artwork could not be found' },
    'no-session': { icon: '×', title: 'No session found',        sub: 'Please check in first before scanning.',     hint: null },
  }

  const screen = screens[status]

  return (
    <main className="min-h-screen flex flex-col justify-between p-8">
      <div className="flex justify-between items-center">
        <span className="t-label">Sehsüchte</span>
        <span className="t-label">Artwork</span>
      </div>

      <div className="flex flex-col gap-6">
        <span style={{ fontSize: '1.875rem', color: 'rgba(28,26,21,0.22)' }}>{screen.icon}</span>
        <div className="flex flex-col gap-2">
          <h1 className="t-heading">{screen.title}</h1>
          {screen.sub && <p className="t-body max-w-[260px]">{screen.sub}</p>}
        </div>

        {status === 'no-session' && (
          <button
            onClick={() => router.push('/checkin')}
            className="w-fit flex items-center gap-3 group"
          >
            <span className="t-label" style={{ color: 'var(--color-ink)' }}>Go to check in</span>
            <span className="t-label group-hover:translate-x-1 transition-transform">→</span>
          </button>
        )}
      </div>

      {screen.hint && (
        <div className="flex flex-col gap-1 border-t border-neutral-300 pt-6">
          <p className="t-label">Next step</p>
          <p className="t-body" style={{ color: 'var(--color-ink)' }}>{screen.hint}</p>
        </div>
      )}
    </main>
  )
}
