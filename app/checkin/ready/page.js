// app/checkin/ready/page.js

'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Nav from '../../components/nav.js'

// ─── Watercolor Journey Visualization ────────────────────────────────────────

const PALETTES = [
  ['#c8b4e0','#9b7ec8','#6a4c8c'],
  ['#f4c08a','#d4842a','#a05a10'],
  ['#8ecae6','#3a9abf','#1a6080'],
  ['#f4a0a0','#d45050','#a02020'],
  ['#a8d8a8','#5aaf5a','#2a7a2a'],
  ['#e0b4e0','#b060b0','#7a307a'],
  ['#f0e080','#c8aa20','#907010'],
  ['#a0b8d8','#4a72b0','#1a4880'],
  ['#f4b0c8','#d46090','#a02060'],
  ['#b0d8a0','#5aa060','#1a6030'],
]

const MINS_PER_DOT = 10
const W = 340
const MIN_SEG = 60
const MAX_SEG = 160

function qbez(ax, ay, cx, cy, bx, by, t) {
  const mt = 1 - t
  return {
    x: mt * mt * ax + 2 * mt * t * cx + t * t * bx,
    y: mt * mt * ay + 2 * mt * t * cy + t * t * by,
  }
}

function pseudoRand(seed, n) {
  const x = Math.sin(seed + n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

// ─── Artwork Modal ────────────────────────────────────────────────────────────

function ArtworkModal({ artwork, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!artwork) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(28,26,21,0.45)',
          zIndex: 40,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          zIndex: 50,
          background: 'var(--color-bg)',
          borderRadius: '16px 16px 0 0',
          padding: '0 0 40px',
          animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(28,26,21,0.15)' }} />
        </div>

        {artwork.image_url && (
          <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
            <img src={artwork.image_url} alt={artwork.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ padding: '24px 28px 0' }}>
          <p className="t-label" style={{ marginBottom: 6 }}>{artwork.artist}</p>
          <h2 className="t-heading" style={{ fontSize: 26, marginBottom: 20 }}>{artwork.title}</h2>
          {artwork.description && (
            <p className="t-body" style={{ marginBottom: 28 }}>{artwork.description}</p>
          )}
          <button
            onClick={onClose}
            className="t-label"
            style={{
              background: 'transparent',
              border: '0.5px solid rgba(28,26,21,0.25)',
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}

// ─── Journey Visualization ────────────────────────────────────────────────────

function JourneyViz({ scans }) {
  const svgRef = useRef(null)
  const [selectedArtwork, setSelectedArtwork] = useState(null)

  const safeScans = scans || []
  const seed = safeScans.length * 13

  // Build points: pts[0] = entrance, pts[1..n] = artwork positions
  const pts = [{ x: W / 2 + (pseudoRand(seed, 0) - 0.5) * 60, y: 50 }]
  let deltas = []

  if (safeScans.length >= 2) {
    const times = safeScans.map(s => new Date(s.scanned_at).getTime())
    deltas = times.slice(1).map((t, i) => (t - times[i]) / 60000)
    const maxDelta = Math.max(...deltas, 1)
    for (let i = 0; i < safeScans.length; i++) {
      const prev = pts[i]
      const d = deltas[i] ?? deltas[deltas.length - 1] ?? 1
      const segLen = MIN_SEG + (d / maxDelta) * (MAX_SEG - MIN_SEG)
      const angle = 88 + (pseudoRand(seed, i + 1) - 0.5) * 80
      const rad = (angle * Math.PI) / 180
      pts.push({
        x: Math.max(60, Math.min(W - 60, prev.x + segLen * Math.cos(rad))),
        y: prev.y + segLen * Math.sin(rad),
      })
    }
  } else if (safeScans.length === 1) {
    // Place first artwork at a fixed distance below entrance
    const angle = 90 + (pseudoRand(seed, 1) - 0.5) * 30
    const rad = (angle * Math.PI) / 180
    pts.push({
      x: Math.max(60, Math.min(W - 60, pts[0].x + 70 * Math.cos(rad))),
      y: pts[0].y + 70 * Math.sin(rad),
    })
    deltas = [0]
  }

  const totalH = Math.max(Math.max(...pts.map(p => p.y)) + 80, 600)
  const viewBox = `0 0 ${W} ${totalH}`

  const filterDefs = safeScans.map((_, i) => `
    <filter id="wc${i}" x="-60%" y="-60%" width="220%" height="220%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0${3 + (i % 4)}" numOctaves="4" seed="${i * 3 + 7}"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${6 + (i % 5)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="wc2${i}" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0${5 + (i % 3)}" numOctaves="3" seed="${i * 2 + 3}"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${4 + (i % 3)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `).join('')

  // Path segments only drawn once there are 2+ artworks
  const pathEls = []
  if (safeScans.length >= 2) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]
      const cpx = (a.x + b.x) / 2 + (pseudoRand(seed, i + 50) - 0.5) * 24
      const cpy = (a.y + b.y) / 2 + (pseudoRand(seed, i + 60) - 0.5) * 14
      const mins = deltas[i] || 0
      const numDots = Math.max(0, Math.floor(mins / MINS_PER_DOT) - 1)

      const dots = []
      for (let d = 1; d <= numDots; d++) {
        const t = d / (numDots + 1)
        const bp = qbez(a.x, a.y, cpx, cpy, b.x, b.y, t)
        dots.push(
          <circle key={d} cx={bp.x.toFixed(2)} cy={bp.y.toFixed(2)} r="4" fill="#1c1a15" opacity="0.45" />
        )
      }

      pathEls.push(
        <g key={i}>
          <path d={`M${a.x},${a.y} Q${cpx},${cpy} ${b.x},${b.y}`}
            fill="none" stroke="#1c1a15" strokeWidth="1.2" opacity="0.28" />
          {dots}
        </g>
      )
    }
  }

  const bubbles = safeScans.map((scan, i) => {
    const p = pts[i + 1]
    if (!p) return null
    const [c1, c2, c3] = PALETTES[i % PALETTES.length]
    const dwell = i < deltas.length ? Math.min(Math.max(deltas[i], 0), 35) : 10
    const r = 26 + dwell * 1.3
    const labelLeft = p.x > W * 0.6
    const lx = labelLeft ? p.x - r - 8 : p.x + r + 8
    const anchor = labelLeft ? 'end' : 'start'

    return (
      <g key={i} onClick={() => setSelectedArtwork(scan.artwork)} style={{ cursor: 'pointer' }}>
        <circle cx={p.x} cy={p.y} r={r * 2.2} fill="transparent" />
        {[1.9, 1.55, 1.25].map((scale, li) => (
          <circle key={li} cx={p.x} cy={p.y} r={r * scale}
            fill={c1} opacity={[0.04, 0.06, 0.10][li]} filter={`url(#wc${i})`} />
        ))}
        <circle cx={p.x} cy={p.y} r={r * 0.88} fill={c1} opacity="0.18" filter={`url(#wc2${i})`} />
        <circle cx={p.x} cy={p.y} r={r * 0.58} fill={c2} opacity="0.35" />
        <circle cx={p.x} cy={p.y} r={r * 0.3} fill={c3} opacity="0.55" />
        <circle cx={p.x - r * 0.06} cy={p.y - r * 0.06} r="3" fill="white" opacity="0.75" />
        <g style={{
          animation: `${labelLeft ? 'labelScrollRight' : 'labelScrollLeft'} 10s ease-in-out ${i * 1.8}s infinite`
        }}>
          <text x={lx} y={p.y - 4} textAnchor={anchor}
            fontSize="14" fill="#1c1a15" opacity="0.55"
            fontFamily="var(--font-serif)" fontStyle="italic">
            {scan.artwork?.title}
          </text>
          <text x={lx} y={p.y + 13} textAnchor={anchor}
            fontSize="12" fill="#1c1a15" opacity="0.28"
            fontFamily="var(--font-mono)">
            {scan.artwork?.short}
          </text>
        </g>
      </g>
    )
  })

  const allTimes = safeScans.length >= 2 ? safeScans.map(s => new Date(s.scanned_at).getTime()) : null
  const totalMins = allTimes ? Math.round((allTimes[allTimes.length - 1] - allTimes[0]) / 60000) : null

  return (
    <>
      <svg ref={svgRef} viewBox={viewBox} width="100%"
        xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible' }}>
        <defs dangerouslySetInnerHTML={{ __html: filterDefs }} />
        <style>{`
          @keyframes labelScrollLeft {
            0%, 20% { transform: translateX(0); }
            65%, 85% { transform: translateX(-70px); }
            100% { transform: translateX(0); }
          }
          @keyframes labelScrollRight {
            0%, 20% { transform: translateX(0); }
            65%, 85% { transform: translateX(70px); }
            100% { transform: translateX(0); }
          }
        `}</style>
        <rect width={W} height={totalH} fill="var(--color-bg)" />
        <circle cx={pts[0].x} cy={pts[0].y} r="7" fill="#1c1a15" opacity="0.3" />
        <text x={pts[0].x} y={pts[0].y - 18} textAnchor="middle"
          fontSize="17" fill="#1c1a15" opacity="0.35"
          fontFamily="var(--font-mono)" letterSpacing="0.08em">
          entrance
        </text>
        {pathEls}
        {bubbles}
        {totalMins !== null && (
          <text x={W / 2} y={totalH - 16} textAnchor="middle"
            fontSize="12" fill="#1c1a15" opacity="0.22"
            fontFamily="var(--font-mono)" letterSpacing="0.1em">
            {totalMins} min total · {safeScans.length} works
          </text>
        )}
      </svg>

      {selectedArtwork && (
        <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ReadyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scannedArtworks, setScannedArtworks] = useState([])
  const [scans, setScans] = useState([])
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nfcStatus, setNfcStatus] = useState(null)
  const [nfcSupported, setNfcSupported] = useState(false)

  useEffect(() => {
    const sessionId = localStorage.getItem('session_id')
    if (!sessionId) { router.push('/checkin'); return }
    if ('NDEFReader' in window) { setNfcSupported(true); startNfcScanning(sessionId) }
    loadScans(sessionId)
  }, [])

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
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            const decoder = new TextDecoder()
            const url = decoder.decode(record.data)
            const code = new URL(url).searchParams.get('code')
            if (code) await handleScan(code, sessionId)
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
      .select('scanned_at, artwork_id, artworks(id, title, artist, short, nfc_code, description, image_url)')
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: true })

    if (!error && data) {
      setScannedArtworks(data.map(s => s.artworks))
      setScans(data.map(s => ({ scanned_at: s.scanned_at, artwork: s.artworks })))
    }
    setLoading(false)
  }

  async function handleScan(code, sessionId) {
    const id = sessionId || localStorage.getItem('session_id')
    if (!id) return
    setNfcStatus('scanning')

    const alreadyScanned = scannedArtworks.find(a => a.nfc_code === code)
    if (alreadyScanned) {
      setNfcStatus('already')
      setTimeout(() => setNfcStatus('scanning'), 2000)
      return
    }

    const { data: artwork, error } = await supabase
      .from('artworks')
      .select('id, title, artist, short, nfc_code, description, image_url')
      .eq('nfc_code', code)
      .single()

    if (error || !artwork) {
      setNfcStatus('error')
      setTimeout(() => setNfcStatus('scanning'), 2000)
      return
    }

    const now = new Date().toISOString()
    const { error: scanError } = await supabase
      .from('scans')
      .insert({ session_id: id, artwork_id: artwork.id })

    if (scanError) {
      setNfcStatus('error')
      setTimeout(() => setNfcStatus('scanning'), 2000)
      return
    }

    setScannedArtworks(prev => [...prev, artwork])
    setScans(prev => [...prev, { scanned_at: now, artwork }])
    setNfcStatus('success')
    setTimeout(() => setNfcStatus('scanning'), 2000)
  }

  const nfcBadge = () => {
    if (!nfcSupported) return null
    const states = {
      scanning: { text: 'Ready to scan', dot: 'bg-green-400' },
      success:  { text: 'Artwork added!', dot: 'bg-green-400' },
      already:  { text: 'Already saved',  dot: 'bg-neutral-400' },
      error:    { text: 'Tag not found',  dot: 'bg-red-400' },
    }
    const state = states[nfcStatus]
    if (!state) return null
    return (
      <div className="flex items-center gap-2 bg-neutral-100 rounded px-3 py-2 w-fit">
        <div className={`w-1.5 h-1.5 rounded-full ${state.dot} ${nfcStatus === 'scanning' ? 'animate-pulse' : ''}`} />
        <span className="t-label">{state.text}</span>
      </div>
    )
  }

  // ── Finished view ─────────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex flex-col p-8 gap-12">
          <div className="flex flex-col gap-3">
            <p className="t-label">Your collection</p>
            <h1 className="t-heading">
              {scannedArtworks.length} work{scannedArtworks.length !== 1 ? 's' : ''}<br />explored
            </h1>
          </div>

          <div className="flex flex-col gap-0 border-t border-neutral-200">
            {scannedArtworks.map((artwork, i) => (
              <div key={i} className="flex items-start gap-4 py-5 border-b border-neutral-200">
                <span className="t-label w-6 pt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex flex-col gap-0.5">
                  <p className="t-body" style={{ color: 'var(--color-ink)' }}>{artwork.title}</p>
                  <p className="t-body">{artwork.artist}</p>
                </div>
              </div>
            ))}
          </div>

          <JourneyViz scans={scans} />

          <button
            onClick={() => { localStorage.removeItem('session_id'); router.push('/') }}
            className="w-fit flex items-center gap-3 group mt-auto"
          >
            <span className="t-label">Start over</span>
            <span className="t-label group-hover:translate-x-1 transition-transform duration-300">→</span>
          </button>
        </div>
      </main>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
            <p className="t-label">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  // ── Scanning view ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col p-8 pb-24 gap-8">
      <div className="flex justify-between items-center">
        <span className="t-label">Sehsüchte</span>
        <span className="t-label">{scannedArtworks.length} saved</span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="t-heading">Your Journey</h2>
        <p className="t-body">
          {scannedArtworks.length === 0
            ? 'Tap your phone on the signs next to the artworks to begin.'
            : 'Tap artworks to add them.'}
        </p>
      </div>

      {nfcBadge()}

      {!nfcSupported && (
        <p className="t-body">
          Tap an artwork tag → see confirmation → close that tab to return here
        </p>
      )}

      <JourneyViz scans={scans} />

      <div className="fixed bottom-10 left-10 right-0 flex justify-between items-end p-8 pb-10 pointer-events-none">
        <p className="t-body"> → Go to the Exit poster to finish your journey at the exhibition</p>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
      </div>
    </main>
  )
}

export default function Ready() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="t-label">Loading...</p>
      </main>
    }>
      <ReadyContent />
    </Suspense>
  )
}
