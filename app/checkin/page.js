'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function Ready() {
  const router = useRouter()
  const [scannedArtworks, setScannedArtworks] = useState([])
  const [lastScanned, setLastScanned] = useState(null)
  const [status, setStatus] = useState(null)
  const [isFinished, setIsFinished] = useState(false)

  // On every URL change (each NFC tap), handle the code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const exit = params.get('exit')

    if (exit) {
      finishJourney()
      return
    }

    if (code) {
      handleScan(code)
      // Clean the URL so rescanning works
      window.history.replaceState({}, '', '/checkin/ready')
    }
  }, [])

  // Also detect when user returns to this tab (after NFC opens URL)
  useEffect(() => {
    const handleFocus = () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const exit = params.get('exit')

      if (exit) {
        finishJourney()
        return
      }

      if (code) {
        handleScan(code)
        window.history.replaceState({}, '', '/checkin/ready')
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [scannedArtworks])

  async function handleScan(code) {
    const sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      router.push('/checkin')
      return
    }

    // Check if already scanned
    const alreadyScanned = scannedArtworks.find(a => a.nfc_code === code)
    if (alreadyScanned) {
      setStatus(`You already saved "${alreadyScanned.title}"`)
      return
    }

    // Look up artwork
    const { data: artwork, error } = await supabase
      .from('artworks')
      .select('id, title, artist, nfc_code')
      .eq('nfc_code', code)
      .single()

    if (error || !artwork) {
      setStatus('Artwork not found.')
      return
    }

    // Save scan
    const { error: scanError } = await supabase
      .from('scans')
      .insert({ session_id: sessionId, artwork_id: artwork.id })

    if (scanError) {
      setStatus('Something went wrong.')
      return
    }

    setLastScanned(artwork)
    setScannedArtworks(prev => [...prev, artwork])
    setStatus(null)
  }

  async function finishJourney() {
    const sessionId = localStorage.getItem('session_id')
    if (!sessionId) return

    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    setIsFinished(true)
    window.history.replaceState({}, '', '/checkin/ready')
  }

  if (isFinished) {
    return (
      <main>
        <h1>Your Journey</h1>
        <p>You explored {scannedArtworks.length} works</p>
        {scannedArtworks.map((artwork, i) => (
          <div key={i}>
            <h2>{artwork.title}</h2>
            <p>{artwork.artist}</p>
          </div>
        ))}
        <button onClick={() => {
          localStorage.removeItem('session_id')
          router.push('/')
        }}>
          Start over
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>Your Journey</h1>

      {lastScanned && (
        <div>
          <p>Just added:</p>
          <h2>{lastScanned.title}</h2>
          <p>{lastScanned.artist}</p>
        </div>
      )}

      {status && <p>{status}</p>}

      {scannedArtworks.length === 0 ? (
        <p>Tap an artwork to begin collecting.</p>
      ) : (
        <div>
          <p>{scannedArtworks.length} work{scannedArtworks.length > 1 ? 's' : ''} saved</p>
          {scannedArtworks.map((artwork, i) => (
            <div key={i}>
              <span>{i + 1}. {artwork.title}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}