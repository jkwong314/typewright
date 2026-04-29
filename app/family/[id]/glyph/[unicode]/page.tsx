'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/store'
import { useFontData } from '@/lib/hooks/useFontData'
import GlyphCanvas from '@/components/glyph-editor/GlyphCanvas'
import GlyphSidePanel from '@/components/glyph-editor/GlyphSidePanel'
import type { Contour } from '@/lib/types'

function glyphToContours(glyph: any): Contour[] {
  const contours: Contour[] = []
  if (!glyph?.path?.commands?.length) return contours
  let current: any[] = []
  for (const cmd of glyph.path.commands) {
    switch (cmd.type) {
      case 'M':
        if (current.length) contours.push({ points: current })
        current = [{ x: cmd.x, y: cmd.y, type: 'on' as const }]
        break
      case 'L':
        current.push({ x: cmd.x, y: cmd.y, type: 'on' as const })
        break
      case 'C':
        current.push({ x: cmd.x1, y: cmd.y1, type: 'off' as const })
        current.push({ x: cmd.x2, y: cmd.y2, type: 'off' as const })
        current.push({ x: cmd.x, y: cmd.y, type: 'on' as const })
        break
      case 'Q':
        current.push({ x: cmd.x1, y: cmd.y1, type: 'off' as const })
        current.push({ x: cmd.x, y: cmd.y, type: 'on' as const })
        break
      case 'Z':
        if (current.length) contours.push({ points: current })
        current = []
        break
    }
  }
  if (current.length) contours.push({ points: current })
  return contours
}

export default function GlyphEditorPage({ params }: { params: { id: string; unicode: string } }) {
  const { project, setGlyphOverride, removeGlyphOverride } = useProjectStore()
  const searchParams = useSearchParams()
  const styleId = searchParams.get('style')

  const family = project.families.find((f) => f.id === params.id)
  const style  = family?.styles.find((s) => s.id === styleId) ?? family?.styles[0]
  const isScratch = !style?.sourceFontId

  const { font, loading } = useFontData(style?.sourceFontId || undefined)

  const [contours,           setContours]           = useState<Contour[]>([])
  const [advanceWidth,       setAdvanceWidth]       = useState(500)
  const [glyphName,          setGlyphName]          = useState('')
  const [sourceContours,     setSourceContours]     = useState<Contour[]>([])
  const [sourceAdvanceWidth, setSourceAdvanceWidth] = useState(500)
  const [referenceImageUrl,  setReferenceImageUrl]  = useState<string | undefined>()

  const unicode   = params.unicode.toUpperCase()
  const codePoint = parseInt(unicode, 16)
  const isModified = !!(style?.glyphOverrides[unicode])

  // Load glyph from font or override
  useEffect(() => {
    if (!style) return

    // Scratch font: start from override or blank
    if (isScratch) {
      const override = style.glyphOverrides[unicode]
      if (override) {
        setContours(override.contours)
        setAdvanceWidth(override.advanceWidth)
        setReferenceImageUrl(override.referenceImageUrl)
      } else {
        setContours([])
        setAdvanceWidth(style.metrics.unitsPerEm / 2)
        // Check session storage for global family reference image
        try {
          const stored = sessionStorage.getItem(`refimg-${family?.id}`)
          if (stored) setReferenceImageUrl(stored)
        } catch {}
      }
      return
    }

    if (!font) return
    const glyph = font.charToGlyph(String.fromCodePoint(codePoint))
    const srcContours = glyphToContours(glyph)
    const srcAW = glyph?.advanceWidth ?? 500
    setSourceContours(srcContours)
    setSourceAdvanceWidth(srcAW)
    setGlyphName(glyph?.name ?? '')

    const override = style.glyphOverrides[unicode]
    if (override) {
      setContours(override.contours)
      setAdvanceWidth(override.advanceWidth)
      setReferenceImageUrl(override.referenceImageUrl)
    } else {
      setContours(srcContours)
      setAdvanceWidth(srcAW)
    }
  }, [font, style, unicode, codePoint, isScratch, family?.id])

  const handleChange = useCallback((newContours: Contour[]) => {
    if (!family || !style) return
    setContours(newContours)
    setGlyphOverride(family.id, style.id, {
      unicode,
      advanceWidth,
      contours: newContours,
      referenceImageUrl,
    })
  }, [family, style, unicode, advanceWidth, referenceImageUrl, setGlyphOverride])

  const handleAdvanceWidthChange = useCallback((val: number) => {
    if (!family || !style) return
    setAdvanceWidth(val)
    setGlyphOverride(family.id, style.id, { unicode, advanceWidth: val, contours, referenceImageUrl })
  }, [family, style, unicode, contours, referenceImageUrl, setGlyphOverride])

  const handleReferenceImageChange = useCallback((url: string | undefined) => {
    if (!family || !style) return
    setReferenceImageUrl(url)
    // Persist to current override
    setGlyphOverride(family.id, style.id, { unicode, advanceWidth, contours, referenceImageUrl: url })
  }, [family, style, unicode, advanceWidth, contours, setGlyphOverride])

  const handleReset = useCallback(() => {
    if (!family || !style) return
    if (isScratch) {
      if (!confirm('Clear all drawn paths for this glyph?')) return
      removeGlyphOverride(family.id, style.id, unicode)
      setContours([])
    } else {
      if (!confirm('Reset this glyph to the source font?')) return
      removeGlyphOverride(family.id, style.id, unicode)
      setContours(sourceContours)
      setAdvanceWidth(sourceAdvanceWidth)
    }
  }, [family, style, unicode, sourceContours, sourceAdvanceWidth, isScratch, removeGlyphOverride])

  if (!family || !style) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Family or style not found.</p>
        <Link href="/" style={{ color: 'var(--accent)' }} className="text-xs mt-2 block">← Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:text-[var(--text)] transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href={`/family/${family.id}`} className="hover:text-[var(--text)] transition-colors">{family.name}</Link>
          <span>/</span>
          <span style={{ color: 'var(--text)' }}>
            {isScratch ? String.fromCodePoint(codePoint) : `U+${unicode} ${String.fromCodePoint(codePoint)}`}
          </span>
          {isModified && (
            <span className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: 'rgba(212,196,168,0.12)', color: 'var(--accent)' }}>
              {isScratch ? 'drawn' : 'modified'}
            </span>
          )}
        </div>
      </div>

      {/* Canvas + side panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
          {!isScratch && loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Loading…</p>
            </div>
          ) : (
            <GlyphCanvas
              contours={contours}
              advanceWidth={advanceWidth}
              metrics={style.metrics}
              onChange={handleChange}
              referenceImageUrl={referenceImageUrl}
            />
          )}
        </div>

        <GlyphSidePanel
          unicode={unicode}
          glyphName={glyphName}
          advanceWidth={advanceWidth}
          contours={contours}
          style={style}
          referenceImageUrl={referenceImageUrl}
          onAdvanceWidthChange={handleAdvanceWidthChange}
          onReset={handleReset}
          onReferenceImageChange={handleReferenceImageChange}
          isModified={isModified}
          isScratch={isScratch}
        />
      </div>
    </div>
  )
}
