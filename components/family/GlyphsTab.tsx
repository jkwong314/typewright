'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFontData } from '@/lib/hooks/useFontData'
import type { FontFamily, FontStyle } from '@/lib/types'

const BLOCKS = [
  { label: 'Basic Latin',   start: 0x0020, end: 0x007E },
  { label: 'Latin Extended', start: 0x00C0, end: 0x024F },
  { label: 'Punctuation',   start: 0x2000, end: 0x206F },
  { label: 'Currency',      start: 0x20A0, end: 0x20CF },
  { label: 'Arrows',        start: 0x2190, end: 0x21FF },
]

interface Props {
  family: FontFamily
  style: FontStyle
}

export default function GlyphsTab({ family, style }: Props) {
  const [blockIdx, setBlockIdx] = useState(0)
  const { font, blobUrl, loading } = useFontData(style.sourceFontId)
  const [glyphUnicodes, setGlyphUnicodes] = useState<Set<number>>(new Set())

  const fontFaceId = `glyphtab-${style.id}`
  const block = BLOCKS[blockIdx]

  useEffect(() => {
    if (!font) return
    const set = new Set<number>()
    for (let i = 0; i < font.glyphs.length; i++) {
      const g = font.glyphs.get(i)
      if (g?.unicode !== undefined) set.add(g.unicode)
    }
    setGlyphUnicodes(set)
  }, [font])

  if (loading) return <p className="text-xs py-6" style={{ color: 'var(--muted)' }}>Loading glyphs…</p>

  const codepoints = Array.from({ length: block.end - block.start + 1 }, (_, i) => block.start + i)
    .filter((cp) => glyphUnicodes.has(cp))

  return (
    <div className="space-y-4">
      {blobUrl && (
        <style>{`@font-face { font-family: '${fontFaceId}'; src: url('${blobUrl}'); }`}</style>
      )}

      {/* Block selector */}
      <div className="flex gap-1 flex-wrap">
        {BLOCKS.map((b, i) => (
          <button
            key={b.label}
            onClick={() => setBlockIdx(i)}
            className="px-3 py-1.5 rounded-md text-xs transition-colors"
            style={
              blockIdx === i
                ? { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border2)' }
                : { color: 'var(--muted)', border: '1px solid var(--border)' }
            }
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Glyph grid */}
      {codepoints.length === 0 ? (
        <p className="text-xs py-4" style={{ color: 'var(--muted)' }}>No glyphs in this range.</p>
      ) : (
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
          {codepoints.map((cp) => {
            const hex = cp.toString(16).toUpperCase().padStart(4, '0')
            const char = String.fromCodePoint(cp)
            const isModified = !!style.glyphOverrides[hex]

            return (
              <Link
                key={cp}
                href={`/family/${family.id}/glyph/${hex}?style=${style.id}`}
                className="group rounded-lg flex flex-col items-center justify-center gap-1 py-3 transition-all"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isModified ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <span
                  className="text-2xl leading-none select-none"
                  style={{ fontFamily: `'${fontFaceId}', serif`, color: 'var(--text)' }}
                >
                  {char}
                </span>
                <span className="text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }}>
                  {hex}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
