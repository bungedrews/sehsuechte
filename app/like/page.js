// app/like/page.js
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Like() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    const saveScan = async () => {
      const sessionId = localStorage.getItem('session_id')

      if (!sessionId) {
        router.replace('/checkin')
        return
      }

      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .select('id')
        .eq('nfc_code', code)
        .single()

      if (artworkError || !artwork) {
        router.replace('/checkin/ready?error=notfound')
        return
      }

      const { error: scanError } = await supabase
        .from('scans')
        .insert({ session_id: sessionId, artwork_id: artwork.id })

      if (scanError) {
        router.replace('/checkin/ready?error=scanfailed')
        return
      }

      // Use replace so the /like page is not in browser history
      router.replace(`/checkin/ready?code=${code}`)
    }

    if (code) saveScan()
    else router.replace('/checkin/ready')
  }, [])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
      <p className="text-xs text-neutral-400 tracking-[0.2em] uppercase">Saving...</p>
    </main>
  )
}