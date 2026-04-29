'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useProjectStore } from '@/lib/store'
import { saveFontBinary } from '@/lib/db'
import { parseFont } from '@/lib/font-parser'
import { useToast } from '@/components/Toast'
import type { GoogleFontResult } from '@/lib/types'

export default function GoogleFontsTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GoogleFontResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const { addFamily, addStyle } = useProjectStore()
  const { showToast } = useToast()

  const search = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/google-fonts?query=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to fetch')
      }
      setResults(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  async function importFont(font: GoogleFontResult) {
    setImporting(font.family)
    try {
      const fileUrl = font.files.regular ?? font.files[font.variants[0]]
      if (!fileUrl) throw new Error('No font file URL found')
      const httpsUrl = fileUrl.replace('http://', 'https://')
      const res = await fetch(httpsUrl)
      if (!res.ok) throw new Error('Download failed')
      const buffer = await res.arrayBuffer()
      const parsed = await parseFont(buffer)
      const sourceFontId = Math.random().toString(36).slice(2) + Date.now().toString(36)
      await saveFontBinary(sourceFontId, buffer)
      const familyId = addFamily(parsed.familyName)
      addStyle(familyId, {
        name: parsed.styleName,
        weight: parsed.weight,
        italic: parsed.italic,
        widthClass: 5,
        sourceFontId,
        metrics: {
          unitsPerEm: 1000,
          ascender: 800,
          descender: -200,
          capHeight: 700,
          xHeight: 500,
          lineGap: 0,
        },
      })
      showToast(`Imported ${font.family}`, 'success')
    } catch (e: any) {
      showToast(`Failed to import ${font.family}: ${e.message}`, 'error')
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="space-y-5">
      <input
        type="text"
        placeholder="Search Google Fonts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg text-xs outline-none transition-colors"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {error && (
        <div className="rounded-lg px-4 py-3 text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
          {error === 'Google Fonts API key not configured'
            ? 'Add your Google Fonts API key to .env.local to enable this feature.'
            : error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-center py-8" style={{ color: 'var(--muted)' }}>Searching…</p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3">
          {results.map((font) => (
            <div
              key={font.family}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {/* Preview using Google Fonts CSS */}
              <style>{`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}&display=swap');`}</style>
              <div
                className="text-2xl leading-tight truncate"
                style={{ fontFamily: `'${font.family}', serif`, color: 'var(--text)' }}
              >
                Aa Bb Cc
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{font.family}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {font.variants.length} variant{font.variants.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => importFont(font)}
                  disabled={importing === font.family}
                  className="text-xs px-3 py-1.5 rounded-md shrink-0 transition-colors disabled:opacity-50"
                  style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                >
                  {importing === font.family ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
