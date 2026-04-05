'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function CheckIn() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCheckIn = async () => {
    if (!name.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('sessions')
      .insert({ name })
      .select()
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    localStorage.setItem('session_id', data.id)
    router.push('/ready')
  }

  return (
    <main>
      <h1>Welcome to the Exhibition</h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleCheckIn} disabled={loading}>
        {loading ? 'Checking in...' : 'Check In'}
      </button>
    </main>
  )
}