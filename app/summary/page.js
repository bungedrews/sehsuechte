'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Summary() {
  const router = useRouter()

  useEffect(() => {
    const endSession = async () => {
      const sessionId = localStorage.getItem('session_id')

      if (!sessionId) {
        router.push('/checkin')
        return
      }

      await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      router.push('/checkin/ready?exit=true')
    }

    endSession()
  }, [])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ fontFamily: 'var(--font-mono)', background: '#f5f2eb' }}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
      <p className="text-xs text-neutral-400 tracking-[0.2em] uppercase">Finishing your journey...</p>
    </main>
  )
}