'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Like() {
  const [status, setStatus] = useState('Saving...')
  const router = useRouter()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    const saveScan = async () => {
      const sessionId = localStorage.getItem('session_id')

      if (!sessionId) {
        router.push('/checkin')
        return
      }

      // Look up artwork by nfc_code
      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .select('id')
        .eq('nfc_code', code)
        .single()

      if (artworkError || !artwork) {
        setStatus('Artwork not found.')
        return
      }

      // Save the scan
      const { error: scanError } = await supabase
        .from('scans')
        .insert({ session_id: sessionId, artwork_id: artwork.id })

      if (scanError) {
        setStatus('Something went wrong.')
        return
      }

      setStatus('Added to your collection!')
    }

    if (code) saveScan()
  }, [])

  return (
    <main>
      <h1>{status}</h1>
      <button onClick={() => router.push('/summary')}>
        View my collection
      </button>
    </main>
  )
}