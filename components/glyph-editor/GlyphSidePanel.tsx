'use client'

import { useRef } from 'react'
import type { Contour, FontStyle } from '@/lib/types'

interface Props {
  unicode: string
  glyphName: string
  advanceWidth: number
  contours: Contour[]
  style: FontStyle
  referenceImageUrl?: string
  onAdvanceWidthChange: (val: number) => void
  onReset: () => void
  onReferenceImageChange: (url: string | undefined) => void
  isModified: boolean
  isScratch: boolean
}

export default function GlyphSidePanel({
  unicode, glyphName, advanceWidth, contours, style,
  referenceImageUrl, onAdvanceWidthChange, onReset,
  onReferenceImageChange, isModified, isScratch,
}: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null)

  const allPoints    = contours.flatMap((c) => c.points)
  const onCurvePts   = allPoints.filter((p) => p.type === 'on')
  const minX = onCurvePts.length ? Math.min(...onCurvePts.map((p) => p.x)) : 0
  const maxX = onCurvePts.length ? Math.max(...onCurvePts.map((p) => p.x)) : advanceWidth
  const lsb  = minX
  const rsb  = advanceWidth - maxX

  const rows = [
    { label: 'Unicode',   value: `U+${unicode}` },
    { label: 'Glyph',     value: glyphName || '—' },
    { label: 'Contours',  value: contours.length },
    { label: 'Points',    value: allPoints.length },
    { label: 'LSB',       value: Math.round(lsb) },
    { label: 'RSB',       value: Math.round(rsb) },
  ]

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 1200
        const scale = img.width > maxW ? maxW / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width  = img.width  * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        onReferenceImageChange(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div
      className="w-52 shrink-0 flex flex-col h-full"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>GLYPH INFO</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">

        {/* Advance width */}
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--muted)' }}>Advance width</label>
          <input
            type="number"
            value={advanceWidth}
            onChange={(e) => onAdvanceWidthChange(Number(e.target.value))}
            className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
        </div>

        {/* Info rows */}
        <div className="space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Reference image */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p className="text-xs mb-2 font-medium" style={{ color: 'var(--muted)' }}>REFERENCE IMAGE</p>
          {referenceImageUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={referenceImageUrl} alt="Reference" className="w-full rounded-md object-contain max-h-28"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
              <div className="flex gap-1.5">
                <button
                  onClick={() => imgInputRef.current?.click()}
                  className="flex-1 text-xs py-1 rounded-md transition-colors"
                  style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                >Replace</button>
                <button
                  onClick={() => onReferenceImageChange(undefined)}
                  className="text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >✕</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => imgInputRef.current?.click()}
              className="w-full py-3 rounded-md text-xs flex flex-col items-center gap-1.5 transition-colors"
              style={{ border: '1.5px dashed var(--border2)', color: 'var(--muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Add reference
            </button>
          )}
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        {/* Style info */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>STYLE</p>
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{style.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {style.weight} · {style.italic ? 'Italic' : 'Upright'}
            {isScratch && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,196,168,0.1)', color: 'var(--accent)' }}>Scratch</span>}
          </p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          <kbd className="font-mono">↑↓←→</kbd> nudge · <kbd className="font-mono">Shift</kbd> ×10
        </p>
        {isModified && !isScratch && (
          <button
            onClick={onReset}
            className="w-full text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Reset to source
          </button>
        )}
      </div>
    </div>
  )
}
