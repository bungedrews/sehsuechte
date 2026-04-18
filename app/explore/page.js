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
const MIN_SEG = 130
const MAX_SEG = 220

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
  const touchStartY = useRef(0)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    setDragging(true)
  }
  const onTouchMove = (e) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setDragY(delta)
  }
  const onTouchEnd = () => {
    setDragging(false)
    if (dragY > 80) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  if (!artwork) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: `rgba(28,26,21,${0.45 * (1 - dragY / 300)})`,
          zIndex: 40,
          animation: dragging ? 'none' : 'fadeIn 0.2s ease',
        }}
      />
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          zIndex: 50,
          background: 'var(--color-bg)',
          borderRadius: '16px 16px 0 0',
          padding: '0 0 48px',
          animation: dragging ? 'none' : 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '90vh',
          overflowY: dragY > 0 ? 'hidden' : 'auto',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          touchAction: 'pan-y',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(28,26,21,0.25)' }} />
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

function wrapTitle(title) {
  const words = (title || '').split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length * 7.5 > 160 && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function JourneyViz({ scans }) {
  const svgRef = useRef(null)
  const [selectedArtwork, setSelectedArtwork] = useState(null)

  const safeScans = scans || []
  const seed = safeScans.length * 13

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
    const angle = 90 + (pseudoRand(seed, 1) - 0.5) * 30
    const rad = (angle * Math.PI) / 180
    pts.push({
      x: Math.max(60, Math.min(W - 60, pts[0].x + 70 * Math.cos(rad))),
      y: pts[0].y + 70 * Math.sin(rad),
    })
    deltas = [0]
  }

  const totalH = Math.max(Math.max(...pts.map(p => p.y)) + 160, 600)
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
        dots.push(<circle key={d} cx={bp.x.toFixed(2)} cy={bp.y.toFixed(2)} r="4" fill="#1c1a15" opacity="0.45" />)
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

  const clipDefs = []
  const bubbles = safeScans.map((scan, i) => {
    const p = pts[i + 1]
    if (!p) return null
    const [c1, c2, c3] = PALETTES[i % PALETTES.length]
    const dwell = i < deltas.length ? Math.min(Math.max(deltas[i], 0), 35) : 10
    const r = 26 + dwell * 1.3
    const labelLeft = p.x > W * 0.6
    const lx = labelLeft ? p.x - r - 8 : p.x + r + 8
    const anchor = labelLeft ? 'end' : 'start'

    const titleLines = wrapTitle(scan.artwork?.title)
    const shortY = p.y - 4 + titleLines.length * 17 + 3
    const clipId = `cp${i}`
    const clipX = labelLeft ? lx - 120 : lx
    const dx = labelLeft ? 120 : -120
    clipDefs.push(`
      <clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">
        <rect x="${clipX}" y="${shortY - 14}" width="120" height="20"/>
      </clipPath>
    `)

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
        {titleLines.map((line, li) => (
          <text key={li} x={lx} y={p.y - 4 + li * 17} textAnchor={anchor}
            fontSize="14" fill="#1c1a15" opacity="0.55"
            fontFamily="var(--font-serif)" fontStyle="italic">
            {line}
          </text>
        ))}
        <g clipPath={`url(#${clipId})`}>
          <g>
            <animateTransform
              attributeName="transform" type="translate"
              values={`0,0; 0,0; ${dx},0; ${dx},0; 0,0`}
              keyTimes="0;0.25;0.65;0.82;1"
              calcMode="spline"
              keySplines="0 0 1 1;0.35 0 0.65 1;0 0 1 1;0 0 1 1"
              dur="9s" begin={`${i * 2.5}s`} repeatCount="indefinite"
            />
            <text x={lx} y={shortY} textAnchor={anchor}
              fontSize="12" fill="#1c1a15" opacity="0.28"
              fontFamily="var(--font-mono)">
              {scan.artwork?.short}
            </text>
          </g>
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
        <defs dangerouslySetInnerHTML={{ __html: filterDefs + clipDefs.join('') }} />
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
          <text x={W / 2} y={totalH - 100} textAnchor="middle"
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
      .select('session_id, scanned_at, artworks(id, title, artist, short, description, image_url)')
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

        <div className="px-8 pt-15 mb-6">
          <br/>
          <p className="t-label mb-1">{sessions.length} journey{sessions.length !== 1 ? 's' : ''}</p>
          <h1 className="t-heading mb-1">Exhibition journeys</h1>
          <br/>
        </div>

        <div className="px-8 mb-8">
          <p className="t-label mb-3">Select a journey</p>
          <br/>
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
<br/>
        <div className="px-8 mb-4 flex items-center gap-4">
          <span className="t-label">This person:</span>

          <span className="t-label">{active.scans.length} work{active.scans.length !== 1 ? 's' : ''} visited</span>
          {active.scans.length >= 2 && (() => {
            const times = active.scans.map(s => new Date(s.scanned_at).getTime())
            const mins = Math.round((times[times.length - 1] - times[0]) / 60000)
            return <><span className="t-label">·</span><span className="t-label">{mins} min</span></>
          })()}
        </div>

        <div className="mx-8 mb-6 border-t border-neutral-200" />

        <div className="px-8 pb-16">
          <JourneyViz key={active.id} scans={active.scans} />
        </div>
      </main>
    </div>
  )
}
