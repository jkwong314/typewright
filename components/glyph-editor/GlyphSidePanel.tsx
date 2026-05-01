'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { Contour, FontStyle, ReferenceImage } from '@/lib/types'
import { newReferenceImage, REFERENCE_IMAGE_MAX } from '@/lib/reference-image'

interface Props {
  unicode: string
  glyphName: string
  advanceWidth: number
  contours: Contour[]
  style: FontStyle
  referenceImages: ReferenceImage[]
  onAdvanceWidthChange: (val: number) => void
  onReset: () => void
  onReferenceImagesChange: (images: ReferenceImage[]) => void
  isModified: boolean
  isScratch: boolean
}

export default function GlyphSidePanel({
  unicode, glyphName, advanceWidth, contours, style,
  referenceImages, onAdvanceWidthChange, onReset,
  onReferenceImagesChange, isModified, isScratch,
}: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const atMax = referenceImages.length >= REFERENCE_IMAGE_MAX

  const addFromDataUrl = useCallback((url: string) => {
    onReferenceImagesChange([
      ...referenceImages,
      newReferenceImage(url, advanceWidth, style.metrics),
    ])
  }, [referenceImages, advanceWidth, style.metrics, onReferenceImagesChange])

  const processFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) return
    const remaining = REFERENCE_IMAGE_MAX - referenceImages.length
    if (remaining <= 0) return
    const toRead = list.slice(0, remaining)

    let pending = toRead.length
    const collected: string[] = []

    toRead.forEach((file) => {
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
          collected.push(canvas.toDataURL('image/jpeg', 0.82))
          pending -= 1
          if (pending === 0) {
            const next = collected.map((url) => newReferenceImage(url, advanceWidth, style.metrics))
            onReferenceImagesChange([...referenceImages, ...next])
          }
        }
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }, [referenceImages, advanceWidth, style.metrics, onReferenceImagesChange])

  // Clipboard paste
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) files.push(file)
        }
      }
      if (files.length > 0) {
        e.preventDefault()
        processFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [processFiles])

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) { setIsDragging(false); dragCounter.current = 0 }
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.stopPropagation() }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false); dragCounter.current = 0
    const files = e.dataTransfer.files
    if (files && files.length > 0) processFiles(files)
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) processFiles(files)
    e.target.value = ''
  }

  function updateImage(id: string, patch: Partial<ReferenceImage>) {
    onReferenceImagesChange(referenceImages.map((img) => img.id === id ? { ...img, ...patch } : img))
  }
  function removeImage(id: string) {
    onReferenceImagesChange(referenceImages.filter((img) => img.id !== id))
  }
  function moveImage(id: string, dir: -1 | 1) {
    const i = referenceImages.findIndex((img) => img.id === id)
    if (i < 0) return
    const j = i + dir
    if (j < 0 || j >= referenceImages.length) return
    const next = [...referenceImages]
    const [moved] = next.splice(i, 1)
    next.splice(j, 0, moved)
    onReferenceImagesChange(next)
  }

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

  return (
    <div
      className="w-52 shrink-0 flex flex-col h-full"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
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

        {/* Reference images */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>REFERENCE IMAGES</p>
            <p className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
              {referenceImages.length}/{REFERENCE_IMAGE_MAX}
            </p>
          </div>

          {/* Add zone */}
          <button
            onClick={() => !atMax && imgInputRef.current?.click()}
            disabled={atMax}
            className="w-full py-2.5 px-2 rounded-md text-[11px] flex flex-col items-center gap-1 transition-all outline-none disabled:cursor-not-allowed"
            style={{
              border: isDragging ? '1.5px solid var(--accent)' : '1.5px dashed var(--border2)',
              background: isDragging ? 'var(--accent-soft)' : 'transparent',
              color: isDragging ? 'var(--accent)' : 'var(--muted)',
              opacity: atMax && !isDragging ? 0.5 : 1,
              cursor: atMax ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (atMax || isDragging) return
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              if (atMax || isDragging) return
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = 'var(--muted)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span className="text-center leading-tight">
              {isDragging ? 'Drop here' : atMax ? `Max ${REFERENCE_IMAGE_MAX} reached` : 'Drop, paste, or click'}
            </span>
          </button>

          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* List — top of stack rendered first */}
          {referenceImages.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {[...referenceImages].reverse().map((img, displayIdx) => {
                const idx = referenceImages.length - 1 - displayIdx
                const canMoveUp = idx < referenceImages.length - 1
                const canMoveDown = idx > 0
                return (
                  <li
                    key={img.id}
                    className="rounded-md p-2"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="w-9 h-9 rounded object-cover shrink-0"
                        style={{ background: 'var(--bg)', opacity: img.visible ? 1 : 0.3 }}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateImage(img.id, { visible: !img.visible })}
                            title={img.visible ? 'Hide' : 'Show'}
                            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg)]"
                            style={{ color: img.visible ? 'var(--text)' : 'var(--muted)' }}
                          >
                            {img.visible ? (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            ) : (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
                              </svg>
                            )}
                          </button>
                          <input
                            type="range"
                            min={0.05}
                            max={1}
                            step={0.05}
                            value={img.opacity}
                            onChange={(e) => updateImage(img.id, { opacity: Number(e.target.value) })}
                            className="flex-1 min-w-0"
                            title={`Opacity ${Math.round(img.opacity * 100)}%`}
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveImage(img.id, 1)}
                            disabled={!canMoveUp}
                            title="Bring forward"
                            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--muted)' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                          </button>
                          <button
                            onClick={() => moveImage(img.id, -1)}
                            disabled={!canMoveDown}
                            title="Send backward"
                            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--muted)' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => removeImage(img.id)}
                            title="Remove"
                            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]"
                            style={{ color: 'var(--muted)' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Style info */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>STYLE</p>
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{style.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {style.weight} · {style.italic ? 'Italic' : 'Upright'}
            {isScratch && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                Scratch
              </span>
            )}
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
            style={{ color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
          >
            Reset to source
          </button>
        )}
      </div>
    </div>
  )
}
