// app/checkin/ready/page.js

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function ReadyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scannedArtworks, setScannedArtworks] = useState([])
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nfcStatus, setNfcStatus] = useState(null) // null | 'scanning' | 'success' | 'error'
  const [nfcSupported, setNfcSupported] = useState(false)

  // On mount: check NFC support + load scans
  useEffect(() => {
    const sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      router.push('/checkin')
      return
    }

    // Check if Web NFC is supported (Android Chrome only)
    if ('NDEFReader' in window) {
      setNfcSupported(true)
      startNfcScanning(sessionId)
    }

    loadScans(sessionId)
  }, [])

  // iOS fallback: reload from Supabase when switching back to tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const sessionId = localStorage.getItem('session_id')
        if (sessionId) loadScans(sessionId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Handle ?exit param from summary page
  useEffect(() => {
    if (loading) return
    const exit = searchParams.get('exit')
    if (exit) {
      setIsFinished(true)
      window.history.replaceState({}, '', '/checkin/ready')
    }
  }, [loading, searchParams])

  async function startNfcScanning(sessionId) {
    try {
      const ndef = new window.NDEFReader()
      await ndef.scan()
      setNfcStatus('scanning')

      ndef.onreading = async (event) => {
        // Read the URL from the NFC tag
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            const decoder = new TextDecoder()
            const url = decoder.decode(record.data)

            // Extract code from URL e.g. https://sehsuechte.vercel.app/like?code=artwork-01
            const urlParams = new URL(url)
            const code = urlParams.searchParams.get('code')

            if (code) {
              await handleScan(code, sessionId)
            }
          }
        }
      }

      ndef.onreadingerror = () => {
        setNfcStatus('error')
        setTimeout(() => setNfcStatus('scanning'), 2000)
      }

    } catch (err) {
      console.error('NFC error:', err)
      setNfcStatus(null)
    }
  }

  async function loadScans(sessionId) {
    const { data, error } = await supabase
      .from('scans')
      .select('artwork_id, artworks(id, title, artist, nfc_code)')
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: true })

    if (!error && data) {
      setScannedArtworks(data.map(s => s.artworks))
    }
    setLoading(false)
  }

  async function handleScan(code, sessionId) {
    const id = sessionId || localStorage.getItem('session_id')
    if (!id) return

    setNfcStatus('scanning')

    // Check if already scanned
    const alreadyScanned = scannedArtworks.find(a => a.nfc_code === code)
    if (alreadyScanned) {
      setNfcStatus('already')
      setTimeout(() => setNfcStatus('scanning'), 2000)
      return
    }

    const { data: artwork, error } = await supabase
      .from('artworks')
      .select('id, title, artist, nfc_code')
      .eq('nfc_code', code)
      .single()

    if (error || !artwork) {
      setNfcStatus('error')
      setTimeout(() => setNfcStatus('scanning'), 2000)
      return
    }

    const { error: scanError } = await supabase
      .from('scans')
      .insert({ session_id: id, artwork_id: artwork.id })

    if (scanError) {
      setNfcStatus('error')
      setTimeout(() => setNfcStatus('scanning'), 2000)
      return
    }

    setScannedArtworks(prev => [...prev, artwork])
    setNfcStatus('success')
    setTimeout(() => setNfcStatus('scanning'), 2000)
  }

  // NFC status badge
  const nfcBadge = () => {
    if (!nfcSupported) return null

    const states = {
      scanning: { text: 'Ready to scan', dot: 'bg-green-400' },
      success:  { text: 'Artwork added!', dot: 'bg-green-400' },
      already:  { text: 'Already saved', dot: 'bg-neutral-400' },
      error:    { text: 'Tag not found', dot: 'bg-red-400' },
    }

    const state = states[nfcStatus]
    if (!state) return null

    return (
      <div className="flex items-center gap-2 bg-neutral-100 rounded px-3 py-2 w-fit">
        <div className={`w-1.5 h-1.5 rounded-full ${state.dot} ${nfcStatus === 'scanning' ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-neutral-500 tracking-wide">{state.text}</span>
      </div>
    )
  }

  // Finished view
  if (isFinished) {
    return (
      <main className="min-h-screen flex flex-col p-8 gap-12" style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}>
        <div className="flex justify-between items-center">
          <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Sehsüchte</span>
          <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Journey Complete</span>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-[0.25em] text-neutral-400 uppercase">Your collection</p>
          <h1 className="text-5xl text-neutral-900 leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            {scannedArtworks.length} work{scannedArtworks.length !== 1 ? 's' : ''}<br />explored
          </h1>
        </div>

        <div className="flex flex-col gap-0 border-t border-neutral-200">
          {scannedArtworks.map((artwork, i) => (
            <div key={i} className="flex items-start gap-4 py-5 border-b border-neutral-200">
              <span className="text-xs text-neutral-300 w-6 pt-0.5 shrink-0">
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
          onClick={() => { localStorage.removeItem('session_id'); router.push('/') }}
          className="w-fit flex items-center gap-3 group mt-auto"
        >
          <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase group-hover:text-neutral-900 transition-colors duration-300">Start over</span>
          <span className="text-neutral-300 group-hover:translate-x-1 transition-transform duration-300">→</span>
        </button>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
          <p className="text-xs text-neutral-400 tracking-[0.2em] uppercase">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col justify-between p-8" style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}>

      {/* Top bar */}
      <div className="flex justify-between items-center">
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">Sehsüchte</span>
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">{scannedArtworks.length} saved</span>
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-8">

        <div className="flex flex-col gap-2">
          <h2 className="text-4xl text-neutral-900 leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Your Journey
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed max-w-[260px]">
            {scannedArtworks.length === 0
              ? 'Tap your phone on an artwork to begin.'
              : 'Keep exploring. Tap artworks to add them.'}
          </p>
        </div>

        {/* NFC status — Android only */}
        {nfcBadge()}

        {/* iOS hint — shown only when NFC not supported */}
        {!nfcSupported && (
          <p className="text-xs text-neutral-300 leading-relaxed">
            Tap an artwork tag → see confirmation → close that tab to return here
          </p>
        )}

        {scannedArtworks.length > 0 && (
          <div className="flex flex-col gap-0 border-t border-neutral-200">
            {scannedArtworks.map((artwork, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b border-neutral-200">
                <span className="text-xs text-neutral-300 w-6 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-neutral-900 text-sm">{artwork.title}</p>
                  <p className="text-neutral-400 text-xs">{artwork.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="flex justify-between items-end">
        <p className="text-xs text-neutral-300 leading-relaxed">Tap exit tag<br />to finish</p>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
      </div>
    </main>
  )
}

export default function Ready() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#f5f2eb' }}>
        <p className="text-xs text-neutral-400 tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Loading...</p>
      </main>
    }>
      <ReadyContent />
    </Suspense>
  )
}