'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main>
      <h1>Welcome to the Exhibition</h1>
      <button onClick={() => router.push('/checkin')}>
        Check In
      </button>
    </main>
  )
}