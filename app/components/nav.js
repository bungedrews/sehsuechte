'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  const isOwn     = pathname.startsWith('/checkin/ready')
  const isExplore = pathname.startsWith('/explore')

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--color-bg)',
        borderBottom: '0.5px solid rgba(28,26,21,0.1)',
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
      }}
    >
      <Link
        href="/summary"
        className={`nav-link ${isOwn ? 'nav-link-active' : 'nav-link-inactive'}`}
      >
        Own Journey
      </Link>

      <Link
        href="/explore"
        className={`nav-link ${isExplore ? 'nav-link-active' : 'nav-link-inactive'}`}
      >
        Collection
      </Link>
    </nav>
  )
}
