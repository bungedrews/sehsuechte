'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Summary() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadSummary = async () => {
      const sessionId = localStorage.getItem('session_id')

      if (!sessionId) {
        router.push('/checkin')
        return
      }

      // Mark session as ended
      await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      // Fetch all scans for this session joined with artwork data
      const { data, error } = await supabase
        .from('scans')
        .select('artwork_id, artworks(title, artist, description, image_url)')
        .eq('session_id', sessionId)
        .order('scanned_at', { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      setArtworks(data.map(scan => scan.artworks))
      setLoading(false)
    }

    loadSummary()
  }, [])

  if (loading) return <p>Loading your collection...</p>

  return (
    <main>
      <h1>Your Collection</h1>
      {artworks.length === 0 ? (
        <p>You haven't scanned any artworks yet.</p>
      ) : (
        artworks.map((artwork, i) => (
          <div key={i}>
            {artwork.image_url && <img src={artwork.image_url} alt={artwork.title} />}
            <h2>{artwork.title}</h2>
            <p>{artwork.artist}</p>
            <p>{artwork.description}</p>
          </div>
        ))
      )}
    </main>
  )
}