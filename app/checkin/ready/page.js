'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Suspense } from 'react'

function ReadyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scannedArtworks, setScannedArtworks] = useState([])
  const [lastScanned, setLastScanned] = useState(null)
  const [status, setStatus] = useState(null)
  const [isFinished, setIsFinished] = useState(false)

  // Handle incoming params from /like or /summary redirects
  useEffect(() => {
    const scanned = searchParams.get('scanned')
    const exit = searchParams.get('exit')
    const error = searchParams.get('error')

    if (error) {
      setStatus(error === 'notfound' ? 'Artwork not found.' : 'Something went wrong.')
      window.history.replaceState({}, '', '/checkin/ready')
      return
    }

    if (exit) {
      setIsFinished(true)
      window.history.replaceState({}, '', '/checkin/ready')
      return
    }

    if (scanned) {
      loadArtwork(scanned)
      window.history.replaceState({}, '', '/checkin/ready')
    }
  }, [searchParams])

  async function loadArtwork(code) {
    const alreadyScanned = scannedArtworks.find(a => a.nfc_code === code)
    if (alreadyScanned) {
      setStatus(`You already saved "${alreadyScanned.title}"`)
      return
    }

    const { data: artwork, error } = await supabase
      .from('artworks')
      .select('id, title, artist, nfc_code')
      .eq('nfc_code', code)
      .single()

    if (error || !artwork) {
      setStatus('Artwork not found.')
      return
    }

    setLastScanned(artwork)
    setScannedArtworks(prev => [...prev, artwork])
    setStatus(null)
  }

  if (isFinished) {
    return (
      <main>
        <h1>Your Journey</h1>
        <p>You explored {scannedArtworks.length} work{scannedArtworks.length !== 1 ? 's' : ''}</p>
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

export default function Ready() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ReadyContent />
    </Suspense>
  )
}