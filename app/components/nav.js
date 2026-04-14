
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  const isOwn = pathname.startsWith('/checkin/ready')
  const isExplore = pathname.startsWith('/explore')

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: '#f5f2eb',
        borderBottom: '0.5px solid rgba(28,26,21,0.1)',
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        fontFamily: 'var(--font-mono)',
      }}
    >
      <Link
        href="/summary"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          padding: '14px 24px',
          color: isOwn ? '#1c1a15' : 'rgba(28,26,21,0.35)',
          borderBottom: isOwn
            ? '1px solid #1c1a15'
            : '1px solid transparent',
          transition: 'color 0.15s, border-color 0.15s',
        }}
      >
        Own Journey
      </Link>

      <Link
        href="/explore"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          padding: '14px 24px',
          color: isExplore ? '#1c1a15' : 'rgba(28,26,21,0.35)',
          borderBottom: isExplore
            ? '1px solid #1c1a15'
            : '1px solid transparent',
          transition: 'color 0.15s, border-color 0.15s',
        }}
      >
        Collection
      </Link>
    </nav>
  )
}