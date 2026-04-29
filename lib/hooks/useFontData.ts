'use client'

import { useState, useEffect } from 'react'
import { getFontBinary } from '@/lib/db'

export function useFontData(sourceFontId: string | undefined) {
  const [font, setFont] = useState<any>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sourceFontId) { setLoading(false); return }
    let cancelled = false
    let url: string | null = null

    getFontBinary(sourceFontId).then(async (buf) => {
      if (cancelled || !buf) { setLoading(false); return }
      try {
        const opentype = await import('opentype.js')
        const ot = (opentype as any).default ?? opentype
        const parsed = ot.parse(buf)
        if (!cancelled) {
          setFont(parsed)
          const blob = new Blob([buf], { type: 'font/opentype' })
          url = URL.createObjectURL(blob)
          setBlobUrl(url)
        }
      } catch {
        if (!cancelled) setError('Failed to parse font')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [sourceFontId])

  return { font, blobUrl, loading, error }
}
