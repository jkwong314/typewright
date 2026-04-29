'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useProjectStore } from '@/lib/store'
import { saveFontBinary } from '@/lib/db'
import { parseFont } from '@/lib/font-parser'
import { useToast } from '@/components/Toast'
import type { GoogleFontResult } from '@/lib/types'

type SortOption = 'popularity' | 'trending' | 'alpha' | 'date'
type Category   = 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'sans-serif',  label: 'Sans Serif'  },
  { id: 'serif',       label: 'Serif'        },
  { id: 'display',     label: 'Display'      },
  { id: 'handwriting', label: 'Handwriting'  },
  { id: 'monospace',   label: 'Monospace'    },
]

const LANGUAGES = [
  { id: 'latin',                label: 'Latin'                },
  { id: 'latin-ext',            label: 'Latin Extended'       },
  { id: 'cyrillic',             label: 'Cyrillic'             },
  { id: 'cyrillic-ext',         label: 'Cyrillic Extended'    },
  { id: 'greek',                label: 'Greek'                },
  { id: 'greek-ext',            label: 'Greek Extended'       },
  { id: 'vietnamese',           label: 'Vietnamese'           },
  { id: 'arabic',               label: 'Arabic'               },
  { id: 'hebrew',               label: 'Hebrew'               },
  { id: 'thai',                 label: 'Thai'                 },
  { id: 'japanese',             label: 'Japanese'             },
  { id: 'korean',               label: 'Korean'               },
  { id: 'chinese-simplified',   label: 'Chinese Simplified'   },
  { id: 'chinese-traditional',  label: 'Chinese Traditional'  },
]

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'popularity', label: 'Most popular' },
  { id: 'trending',   label: 'Trending'     },
  { id: 'alpha',      label: 'Name (A–Z)'   },
  { id: 'date',       label: 'Newest'       },
]

// ── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--muted)' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// ── Collapsible filter section ────────────────────────────────────────────────
function FilterSection({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-xs font-medium"
        style={{ color: 'var(--text)' }}
      >
        {title}
        <Chevron open={open} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GoogleFontsTab() {
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<GoogleFontResult[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [importing,  setImporting]  = useState<string | null>(null)

  // Filters
  const [sort,       setSort]       = useState<SortOption>('popularity')
  const [categories, setCategories] = useState<Set<Category>>(new Set())
  const [subset,     setSubset]     = useState('')
  const [minStyles,  setMinStyles]  = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const { addFamily, addStyle } = useProjectStore()
  const { showToast } = useToast()

  const search = useCallback(async (
    q: string, sortVal: SortOption, cats: Set<Category>, sub: string, minS: number
  ) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ query: q, sort: sortVal })
      if (cats.size > 0) params.set('categories', Array.from(cats).join(','))
      if (sub)   params.set('subset',    sub)
      if (minS > 1) params.set('minStyles', String(minS))

      const res = await fetch(`/api/google-fonts?${params}`)
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
    debounceRef.current = setTimeout(
      () => search(query, sort, categories, subset, minStyles), 350
    )
    return () => clearTimeout(debounceRef.current)
  }, [query, sort, categories, subset, minStyles, search])

  function toggleCategory(cat: Category) {
    setCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function clearFilters() {
    setSort('popularity')
    setCategories(new Set())
    setSubset('')
    setMinStyles(1)
  }

  const activeFilterCount = categories.size + (subset ? 1 : 0) + (minStyles > 1 ? 1 : 0) + (sort !== 'popularity' ? 1 : 0)

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
    <div className="flex gap-7">
      {/* ── Filter sidebar ─────────────────────────────────────────────── */}
      <div className="w-48 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Filters
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-[10px] transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Sort */}
          <FilterSection title="Sort by">
            <div className="space-y-0.5">
              {SORT_OPTIONS.map(opt => (
                <label key={opt.id} className="flex items-center gap-2.5 px-1 py-1.5 rounded cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    checked={sort === opt.id}
                    onChange={() => setSort(opt.id)}
                    style={{ accentColor: 'var(--accent)', width: 12, height: 12 }}
                  />
                  <span className="text-xs" style={{ color: sort === opt.id ? 'var(--text)' : 'var(--muted)' }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Categories */}
          <FilterSection title="Category">
            <div className="space-y-0.5">
              {CATEGORIES.map(cat => (
                <label key={cat.id} className="flex items-center gap-2.5 px-1 py-1.5 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categories.has(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    style={{ accentColor: 'var(--accent)', width: 12, height: 12 }}
                  />
                  <span className="text-xs" style={{ color: categories.has(cat.id) ? 'var(--text)' : 'var(--muted)' }}>
                    {cat.label}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Language */}
          <FilterSection title="Language" defaultOpen={false}>
            <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
              {LANGUAGES.map(lang => (
                <label key={lang.id} className="flex items-center gap-2.5 px-1 py-1.5 rounded cursor-pointer">
                  <input
                    type="radio"
                    name="subset"
                    checked={subset === lang.id}
                    onChange={() => setSubset(subset === lang.id ? '' : lang.id)}
                    style={{ accentColor: 'var(--accent)', width: 12, height: 12 }}
                  />
                  <span className="text-xs" style={{ color: subset === lang.id ? 'var(--text)' : 'var(--muted)' }}>
                    {lang.label}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Properties */}
          <FilterSection title="Properties" defaultOpen={false}>
            <div className="px-1 space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Min. styles</span>
                <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                  {minStyles}{minStyles === 18 ? '+' : ''}
                </span>
              </div>
              <input
                type="range"
                min={1} max={18}
                value={minStyles}
                onChange={(e) => setMinStyles(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </FilterSection>
        </div>
      </div>

      {/* ── Results area ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Search bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--muted)' }}
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search fonts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-lg text-xs outline-none transition-colors"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={(e)  => (e.target.style.borderColor = 'var(--border2)')}
              onBlur={(e)   => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          {!loading && !error && (
            <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
              {results.length} font{results.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            {error === 'Google Fonts API key not configured'
              ? 'Add your Google Fonts API key to .env.local to enable this feature.'
              : error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-xs text-center py-12" style={{ color: 'var(--muted)' }}>Searching…</p>
        )}

        {/* Grid */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {results.map((font) => (
              <div
                key={font.family}
                className="rounded-xl p-4 flex flex-col gap-3 transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <style>{`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}&display=swap');`}</style>
                <div
                  className="text-3xl leading-tight truncate"
                  style={{ fontFamily: `'${font.family}', serif`, color: 'var(--text)' }}
                >
                  Aa
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{font.family}</p>
                    <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--muted)' }}>
                      {font.category?.replace('-', ' ')} · {font.variants.length} style{font.variants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => importFont(font)}
                    disabled={importing === font.family}
                    className="text-xs px-3 py-1.5 rounded-md shrink-0 transition-colors disabled:opacity-50"
                    style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border2)' }}
                  >
                    {importing === font.family ? '…' : 'Import'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No fonts match your filters.</p>
            <button
              onClick={clearFilters}
              className="text-xs mt-3 transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
