'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function ReadyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scannedArtworks, setScannedArtworks] = useState([])
  const [lastScanned, setLastScanned] = useState(null)
  const [status, setStatus] = useState(null)
  const [isFinished, setIsFinished] = useState(false)
  const [visitorName, setVisitorName] = useState('')

  useEffect(() => {
    // Redirect if no session
    const sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      router.push('/checkin')
      return
    }
  }, [])

  // Handle incoming params from NFC taps
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
      setStatus(`Already saved — "${alreadyScanned.title}"`)
      setTimeout(() => setStatus(null), 3000)
      return
    }

    const { data: artwork, error } = await supabase
      .from('artworks')
      .select('id, title, artist, nfc_code')
      .eq('nfc_code', code)
      .single()

    if (error || !artwork) {
      setStatus('Artwork not found.')
      setTimeout(() => setStatus(null), 3000)
      return
    }

    setLastScanned(artwork)
    setScannedArtworks(prev => [...prev, artwork])
    setStatus(null)
  }

  // Finished / summary view
  if (isFinished) {
    return (
      <main className="min-h-screen flex flex-col p-8 gap-12" style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}>

        <div className="flex justify-between items-center">
          <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Sehsüchte</span>
          <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Journey Complete</span>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-[0.25em] text-neutral-400 uppercase">Your collection</p>
          <h1
            className="text-5xl text-neutral-900 leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {scannedArtworks.length} work{scannedArtworks.length !== 1 ? 's' : ''}<br />explored
          </h1>
        </div>

        <div className="flex flex-col gap-0 border-t border-neutral-200">
          {scannedArtworks.map((artwork, i) => (
            <div key={i} className="flex items-start gap-4 py-5 border-b border-neutral-200">
              <span className="text-xs text-neutral-300 w-6 pt-0.5 shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-neutral-900 text-sm leading-snug">{artwork.title}</p>
                <p className="text-neutral-400 text-xs">{artwork.artist}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('session_id')
            router.push('/')
          }}
          className="w-fit flex items-center gap-3 group mt-auto"
        >
          <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase group-hover:text-neutral-900 transition-colors duration-300">
            Start over
          </span>
          <span className="text-neutral-300 group-hover:translate-x-1 transition-transform duration-300">→</span>
        </button>

      </main>
    )
  }

  // Active journey view
  return (
    <main className="min-h-screen flex flex-col justify-between p-8" style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}>

      {/* Top bar */}
      <div className="flex justify-between items-center">
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Sehsüchte</span>
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
          {scannedArtworks.length} saved
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-8">

        {lastScanned ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Just added</p>
            <h2
              className="text-4xl text-neutral-900 leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {lastScanned.title}
            </h2>
            <p className="text-sm text-neutral-500">{lastScanned.artist}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <h2
              className="text-4xl text-neutral-900 leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Your Journey
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-[260px]">
              Tap your phone on an artwork to add it to your collection.
            </p>
          </div>
        )}

        {status && (
          <p className="text-xs text-neutral-400 tracking-wide">{status}</p>
        )}

        {scannedArtworks.length > 0 && (
          <div className="flex flex-col gap-0 border-t border-neutral-200 mt-2">
            {scannedArtworks.map((artwork, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b border-neutral-200">
                <span className="text-xs text-neutral-300 w-6 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-neutral-900 text-sm">{artwork.title}</p>
                  <p className="text-neutral-400 text-xs">{artwork.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="flex justify-between items-end">
        <p className="text-xs text-neutral-300 leading-relaxed">
          Tap exit tag<br />to finish
        </p>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
      </div>

    </main>
  )
}

export default function Ready() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-xs text-neutral-600 tracking-widest uppercase">Loading...</p>
      </main>
    }>
      <ReadyContent />
    </Suspense>
  )
}