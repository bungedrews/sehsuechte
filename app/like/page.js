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
        router.push('/checkin')
        return
      }

      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .select('id')
        .eq('nfc_code', code)
        .single()

      if (artworkError || !artwork) {
        router.push('/checkin/ready?error=notfound')
        return
      }

      const { error: scanError } = await supabase
        .from('scans')
        .insert({ session_id: sessionId, artwork_id: artwork.id })

      if (scanError) {
        router.push('/checkin/ready?error=scanfailed')
        return
      }

      // Success — go back to ready with the code so it can update the UI
      router.push(`/checkin/ready?scanned=${code}`)
    }

    if (code) saveScan()
    else router.push('/checkin/ready')
  }, [])

  return <p>Saving...</p>
}