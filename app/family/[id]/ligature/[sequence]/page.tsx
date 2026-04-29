'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/store'
import GlyphCanvas from '@/components/glyph-editor/GlyphCanvas'
import GlyphSidePanel from '@/components/glyph-editor/GlyphSidePanel'
import type { Contour } from '@/lib/types'

export default function LigatureEditorPage({ params }: { params: { id: string; sequence: string } }) {
  const { project, setLigature } = useProjectStore()
  const searchParams = useSearchParams()
  const styleId  = searchParams.get('style')
  const sequence = decodeURIComponent(params.sequence)

  const family = project.families.find((f) => f.id === params.id)
  const style  = family?.styles.find((s) => s.id === styleId) ?? family?.styles[0]
  const ligature = style?.ligatures?.[sequence]

  const [contours,     setContours]     = useState<Contour[]>(ligature?.contours ?? [])
  const [advanceWidth, setAdvanceWidth] = useState(ligature?.advanceWidth ?? style?.metrics.unitsPerEm ?? 500)
  const [refImageUrl,  setRefImageUrl]  = useState<string | undefined>(ligature?.referenceImageUrl)

  useEffect(() => {
    if (ligature) {
      setContours(ligature.contours)
      setAdvanceWidth(ligature.advanceWidth)
      setRefImageUrl(ligature.referenceImageUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback((c: Contour[], aw: number, ref?: string) => {
    if (!family || !style) return
    setLigature(family.id, style.id, { unicode: sequence, advanceWidth: aw, contours: c, referenceImageUrl: ref })
  }, [family, style, sequence, setLigature])

  const handleChange = useCallback((newContours: Contour[]) => {
    setContours(newContours)
    save(newContours, advanceWidth, refImageUrl)
  }, [advanceWidth, refImageUrl, save])

  const handleAdvanceWidthChange = useCallback((val: number) => {
    setAdvanceWidth(val)
    save(contours, val, refImageUrl)
  }, [contours, refImageUrl, save])

  const handleRefImageChange = useCallback((url: string | undefined) => {
    setRefImageUrl(url)
    save(contours, advanceWidth, url)
  }, [contours, advanceWidth, save])

  if (!family || !style) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Not found.</p>
        <Link href="/" className="text-xs mt-2 block" style={{ color: 'var(--accent)' }}>← Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:text-[var(--text)] transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href={`/family/${family.id}`} className="hover:text-[var(--text)] transition-colors">{family.name}</Link>
          <span>/</span>
          <span>Ligatures</span>
          <span>/</span>
          <span className="font-serif italic text-sm" style={{ color: 'var(--text)' }}>{sequence}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: 'rgba(212,196,168,0.12)', color: 'var(--accent)' }}>ligature</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
          <GlyphCanvas
            contours={contours}
            advanceWidth={advanceWidth}
            metrics={style.metrics}
            onChange={handleChange}
            referenceImageUrl={refImageUrl}
          />
        </div>
        <GlyphSidePanel
          unicode={sequence}
          glyphName={`liga: ${sequence}`}
          advanceWidth={advanceWidth}
          contours={contours}
          style={style}
          referenceImageUrl={refImageUrl}
          onAdvanceWidthChange={handleAdvanceWidthChange}
          onReset={() => { setContours([]); save([], advanceWidth, refImageUrl) }}
          onReferenceImageChange={handleRefImageChange}
          isModified={contours.length > 0}
          isScratch
        />
      </div>
    </div>
  )
}
