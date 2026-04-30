'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectStore } from '@/lib/store'
import { saveFontBinary } from '@/lib/db'
import { parseFont } from '@/lib/font-parser'
import { useToast } from '@/components/Toast'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
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
        setFonts(data.filter((f) => !existingNames.has(f.family.toLowerCase())).slice(0, 12))
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

  if (error) return null

  return (
    <section className="mt-12 pt-10 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Discover Fonts</h2>
          <p className="text-xs mt-0.5 text-[var(--muted)]">From Google Fonts — import any to start editing</p>
        </div>
        <Link href="/library?tab=google" className="text-xs flex items-center gap-1 text-[var(--accent)] transition-colors">
          Browse all
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="flex gap-1.5 mb-5">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant="pill"
            size="sm"
            selected={category === cat.id}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} variant="dashed" className="p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {fonts.map((font) => {
            const isImporting = importing === font.family
            return (
              <Card key={font.family} variant="dashed" className="p-5 flex flex-col gap-3 transition-all hover:border-[var(--accent-border2)]">
                <style>{`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}&display=swap');`}</style>

                <div
                  className="text-4xl leading-none tracking-tight truncate py-2"
                  style={{ fontFamily: `'${font.family}', serif`, color: 'rgba(240,236,230,0.5)' }}
                >
                  Aa Bb Cc
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-[var(--text)]">{font.family}</p>
                    <p className="text-[10px] mt-0.5 capitalize text-[var(--muted)]">
                      {font.category?.replace('-', ' ')} · {font.variants.length} style{font.variants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" disabled={isImporting} onClick={() => importFont(font)}>
                    {isImporting ? '…' : '+ Import'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
