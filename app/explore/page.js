// app/explore/page.js

'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Nav from '../components/nav.js'

// ─── Constants ────────────────────────────────────────────────────────────────

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
const MIN_SEG = 38
const MAX_SEG = 100

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function shortId(id) {
  return '#' + String(id).slice(-4)
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
          padding: '0 0 48px',
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

  if (!scans || scans.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p className="t-label">Only one artwork scanned — no path to draw yet</p>
      </div>
    )
  }

  const times = scans.map(s => new Date(s.scanned_at).getTime())
  const deltas = times.slice(1).map((t, i) => (t - times[i]) / 60000)
  const maxDelta = Math.max(...deltas, 1)
  const segLens = deltas.map(d => MIN_SEG + (d / maxDelta) * (MAX_SEG - MIN_SEG))

  const seed = scans.length * 13
  const pts = [{ x: W / 2 + (pseudoRand(seed, 0) - 0.5) * 60, y: 50 }]
  for (let i = 0; i < segLens.length; i++) {
    const prev = pts[i]
    const angle = 88 + (pseudoRand(seed, i + 1) - 0.5) * 80
    const rad = (angle * Math.PI) / 180
    const nx = Math.max(60, Math.min(W - 60, prev.x + segLens[i] * Math.cos(rad)))
    const ny = prev.y + segLens[i] * Math.sin(rad)
    pts.push({ x: nx, y: ny })
  }

  const totalH = Math.max(...pts.map(p => p.y)) + 80
  const viewBox = `0 0 ${W} ${totalH}`

  const filterDefs = scans.map((_, i) => `
    <filter id="wc${i}" x="-60%" y="-60%" width="220%" height="220%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0${3 + (i % 4)}" numOctaves="4" seed="${i * 3 + 7}"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${6 + (i % 5)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="wc2${i}" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0${5 + (i % 3)}" numOctaves="3" seed="${i * 2 + 3}"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${4 + (i % 3)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `).join('')

  const pathEls = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const cpx = (a.x + b.x) / 2 + (pseudoRand(seed, i + 50) - 0.5) * 24
    const cpy = (a.y + b.y) / 2 + (pseudoRand(seed, i + 60) - 0.5) * 14
    const mins = deltas[i]
    const numDots = Math.max(0, Math.floor(mins / MINS_PER_DOT) - 1)

    const dots = []
    for (let d = 1; d <= numDots; d++) {
      const t = d / (numDots + 1)
      const bp = qbez(a.x, a.y, cpx, cpy, b.x, b.y, t)
      dots.push(
        <circle key={d} cx={bp.x.toFixed(2)} cy={bp.y.toFixed(2)}
          r="2" fill="#1c1a15" opacity="0.45" />
      )
    }

    pathEls.push(
      <g key={i}>
        <path d={`M${a.x},${a.y} Q${cpx},${cpy} ${b.x},${b.y}`}
          fill="none" stroke="#1c1a15" strokeWidth="0.55" opacity="0.28" />
        {dots}
      </g>
    )
  }

  const bubbles = scans.map((scan, i) => {
    const p = pts[i + 1]
    if (!p) return null
    const [c1, c2, c3] = PALETTES[i % PALETTES.length]
    const dwell = i < deltas.length ? Math.min(deltas[i], 35) : 10
    const r = 11 + dwell * 0.85
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
        <circle cx={p.x - r * 0.06} cy={p.y - r * 0.06} r="1.8" fill="white" opacity="0.75" />
        <text x={lx} y={p.y - 2} textAnchor={anchor}
          fontSize="9" fill="#1c1a15" opacity="0.55"
          fontFamily="var(--font-serif)" fontStyle="italic">
          {scan.artwork?.title}
        </text>
        <text x={lx} y={p.y + 9} textAnchor={anchor}
          fontSize="8" fill="#1c1a15" opacity="0.28"
          fontFamily="var(--font-mono)">
          {scan.artwork?.artist}
        </text>
      </g>
    )
  })

  const totalMins = Math.round((times[times.length - 1] - times[0]) / 60000)

  return (
    <>
      <svg ref={svgRef} viewBox={viewBox} width="100%"
        xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs dangerouslySetInnerHTML={{ __html: filterDefs }} />
        <rect width={W} height={totalH} fill="var(--color-bg)" />
        <circle cx={pts[0].x} cy={pts[0].y} r="3" fill="#1c1a15" opacity="0.3" />
        <text x={pts[0].x} y={pts[0].y - 10} textAnchor="middle"
          fontSize="8" fill="#1c1a15" opacity="0.35"
          fontFamily="var(--font-mono)" letterSpacing="0.08em">
          entrance
        </text>
        {pathEls}
        {bubbles}
        <text x={W / 2} y={totalH - 16} textAnchor="middle"
          fontSize="8" fill="#1c1a15" opacity="0.22"
          fontFamily="var(--font-mono)" letterSpacing="0.1em">
          {totalMins} min total · {scans.length} works
        </text>
      </svg>

      {selectedArtwork && (
        <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Explore() {
  const [sessions, setSessions] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadAllSessions() }, [])

  async function loadAllSessions() {
    setLoading(true)
    setError(null)

    const { data: sessionRows, error: sessErr } = await supabase
      .from('sessions')
      .select('id')
      .order('created_at', { ascending: false })

    if (sessErr || !sessionRows?.length) {
      setError('No journeys found yet.')
      setLoading(false)
      return
    }

    const sessionIds = sessionRows.map(s => s.id)
    const { data: scanRows, error: scanErr } = await supabase
      .from('scans')
      .select('session_id, scanned_at, artworks(id, title, artist, description, image_url)')
      .in('session_id', sessionIds)
      .order('scanned_at', { ascending: true })

    if (scanErr) {
      setError('Could not load journeys.')
      setLoading(false)
      return
    }

    const grouped = sessionRows.reduce((acc, s) => {
      const scans = (scanRows || [])
        .filter(r => r.session_id === s.id)
        .map(r => ({ scanned_at: r.scanned_at, artwork: r.artworks }))
      if (scans.length > 0) acc.push({ id: s.id, scans })
      return acc
    }, [])

    if (!grouped.length) {
      setError('No journeys found yet.')
      setLoading(false)
      return
    }

    setSessions(grouped)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Nav />
        <main className="flex items-center justify-center" style={{ paddingTop: 80 }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
            <p className="t-label">Loading journeys...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Nav />
        <main className="flex items-center justify-center" style={{ paddingTop: 80 }}>
          <p className="t-label">{error}</p>
        </main>
      </div>
    )
  }

  const active = sessions[activeIdx]

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <main className="flex flex-col">

        <div className="px-8 pt-8 mb-6">
          <p className="t-label mb-1">{sessions.length} journey{sessions.length !== 1 ? 's' : ''}</p>
          <h1 className="t-heading mb-1">What's Left?</h1>
          <p className="t-label">Exhibition journeys</p>
        </div>

        <div className="px-8 mb-8">
          <p className="t-label mb-3">Select a journey</p>
          <div className="flex flex-wrap gap-2">
            {sessions.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                className="t-label"
                style={{
                  padding: '6px 14px',
                  border: activeIdx === i ? '0.5px solid var(--color-ink)' : '0.5px solid rgba(28,26,21,0.2)',
                  background: activeIdx === i ? 'var(--color-ink)' : 'transparent',
                  color: activeIdx === i ? 'var(--color-bg)' : undefined,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {shortId(s.id)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 mb-4 flex items-center gap-4">
          <span className="t-label">{active.scans.length} work{active.scans.length !== 1 ? 's' : ''} visited</span>
          <span className="t-label">·</span>
          <span className="t-label">Tap a bubble to explore</span>
        </div>

        <div className="mx-8 mb-6 border-t border-neutral-200" />

        <div className="px-8 pb-16">
          <JourneyViz key={active.id} scans={active.scans} />
        </div>
      </main>
    </div>
  )
}
