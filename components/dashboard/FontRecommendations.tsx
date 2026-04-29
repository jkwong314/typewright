'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectStore } from '@/lib/store'
import { saveFontBinary } from '@/lib/db'
import { parseFont } from '@/lib/font-parser'
import { useToast } from '@/components/Toast'
import type { GoogleFontResult } from '@/lib/types'

const CATEGORIES: { id: string; label: string }[] = [
  { id: '',            label: 'Popular'    },
  { id: 'sans-serif',  label: 'Sans Serif' },
  { id: 'serif',       label: 'Serif'      },
  { id: 'display',     label: 'Display'    },
  { id: 'monospace',   label: 'Mono'       },
]

export default function FontRecommendations() {
  const { project, addFamily, addStyle } = useProjectStore()
  const { showToast } = useToast()

  const [fonts,     setFonts]     = useState<GoogleFontResult[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)
  const [category,  setCategory]  = useState('')
  const [importing, setImporting] = useState<string | null>(null)

  // Names already in the project
  const existingNames = new Set(project.families.map((f) => f.name.toLowerCase()))

  useEffect(() => {
    setLoading(true)
    setError(false)
    const params = new URLSearchParams({ sort: 'popularity' })
    if (category) params.set('categories', category)
    fetch(`/api/google-fonts?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: GoogleFontResult[]) => {
        // Filter already-imported, show 9
        setFonts(data.filter((f) => !existingNames.has(f.family.toLowerCase())).slice(0, 9))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, project.families.length])

  async function importFont(font: GoogleFontResult) {
    setImporting(font.family)
    try {
      const fileUrl = font.files.regular ?? font.files[font.variants[0]]
      if (!fileUrl) throw new Error('No file')
      const res = await fetch(fileUrl.replace('http://', 'https://'))
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
        metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 700, xHeight: 500, lineGap: 0 },
      })
      showToast(`"${font.family}" imported`, 'success')
    } catch {
      showToast(`Failed to import ${font.family}`, 'error')
    } finally {
      setImporting(null)
    }
  }

  // Don't render the section at all if API key is missing
  if (error) return null

  return (
    <section className="mt-12">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Discover Fonts
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            From Google Fonts — import any to start editing
          </p>
        </div>
        <Link
          href="/library?tab=google"
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          Browse all
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={
              category === cat.id
                ? { background: 'var(--accent)', color: '#0c0c0c' }
                : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-5 h-32 animate-pulse"
              style={{ background: 'var(--surface)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fonts.map((font) => {
            const isImporting = importing === font.family
            return (
              <div
                key={font.family}
                className="rounded-xl p-5 flex flex-col gap-3 group transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {/* Load font for preview via Google Fonts CSS */}
                <style>{`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}&display=swap');`}</style>

                {/* Preview text */}
                <div
                  className="text-4xl leading-none tracking-tight truncate py-2"
                  style={{ fontFamily: `'${font.family}', serif`, color: 'var(--text)' }}
                >
                  Aa Bb Cc
                </div>

                {/* Footer */}
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {font.family}
                    </p>
                    <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--muted)' }}>
                      {font.category?.replace('-', ' ')} · {font.variants.length} style{font.variants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => importFont(font)}
                    disabled={isImporting}
                    className="text-xs px-3 py-1.5 rounded-md shrink-0 font-medium transition-all disabled:opacity-50"
                    style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border2)' }}
                  >
                    {isImporting ? '…' : '+ Import'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
