'use client'

import { useState, useRef, useCallback } from 'react'
import { useProjectStore } from '@/lib/store'
import { saveFontBinary } from '@/lib/db'
import { parseFont } from '@/lib/font-parser'
import { useToast } from '@/components/Toast'

interface StagedFont {
  id: string
  familyName: string
  styleName: string
  weight: number
  italic: boolean
  glyphCount: number
  buffer: ArrayBuffer
}

export default function UploadTab() {
  const [staged, setStaged] = useState<StagedFont[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { project, addFamily, addStyle } = useProjectStore()
  const { showToast } = useToast()

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true)
    const accepted = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2',
      'application/x-font-ttf', 'application/x-font-opentype', '']
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext ?? '')) {
        showToast(`Unsupported format: ${file.name}`, 'error')
        continue
      }
      try {
        const buffer = await file.arrayBuffer()
        const parsed = await parseFont(buffer)
        const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
        setStaged((prev) => [...prev, {
          id,
          familyName: parsed.familyName,
          styleName: parsed.styleName,
          weight: parsed.weight,
          italic: parsed.italic,
          glyphCount: parsed.glyphs.length,
          buffer,
        }])
      } catch {
        showToast(`Could not parse ${file.name}`, 'error')
      }
    }
    setLoading(false)
  }, [showToast])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  async function addToFamily(font: StagedFont, familyId?: string) {
    const id = familyId ?? addFamily(font.familyName)
    const sourceFontId = font.id
    await saveFontBinary(sourceFontId, font.buffer)
    addStyle(id, {
      name: font.styleName,
      weight: font.weight,
      italic: font.italic,
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
    setStaged((prev) => prev.filter((f) => f.id !== font.id))
    showToast(`Added ${font.styleName} to ${font.familyName}`, 'success')
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all py-14"
        style={{
          border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
          background: dragging ? 'rgba(212,196,168,0.04)' : 'var(--surface)',
        }}
      >
        <div className="text-2xl" style={{ color: 'var(--muted)' }}>↑</div>
        <div className="text-center">
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Drop font files here</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>TTF · OTF · WOFF · WOFF2</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {loading && (
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>Parsing fonts…</p>
      )}

      {/* Staged fonts */}
      {staged.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>READY TO ADD</p>
          {staged.map((font) => {
            const matchingFamily = project.families.find(
              (f) => f.name.toLowerCase() === font.familyName.toLowerCase()
            )
            return (
              <div
                key={font.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between gap-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
                    {font.familyName} — {font.styleName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {font.weight} · {font.glyphCount} glyphs
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {matchingFamily && (
                    <button
                      onClick={() => addToFamily(font, matchingFamily.id)}
                      className="text-xs px-3 py-1.5 rounded-md transition-colors"
                      style={{ background: 'var(--surface2)', color: 'var(--accent)' }}
                    >
                      Add to {matchingFamily.name}
                    </button>
                  )}
                  <button
                    onClick={() => addToFamily(font)}
                    className="text-xs px-3 py-1.5 rounded-md transition-colors"
                    style={{ background: 'var(--accent)', color: '#0c0c0c' }}
                  >
                    New family
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
