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

  return <p>Finishing your journey...</p>
}