'use client'

import { useState } from 'react'
import { useProjectStore } from '@/lib/store'
import { getFontBinary } from '@/lib/db'
import { useToast } from '@/components/Toast'

const FORMATS = [
  { id: 'woff2', label: 'WOFF2', hint: 'Modern web' },
  { id: 'woff',  label: 'WOFF',  hint: 'Legacy web' },
  { id: 'ttf',   label: 'TTF',   hint: 'Universal' },
  { id: 'otf',   label: 'OTF',   hint: 'Professional' },
]

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const { project } = useProjectStore()
  const { showToast } = useToast()

  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(
    () => new Set(project.families.map((f) => f.id))
  )
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(
    () => new Set(['woff2', 'ttf'])
  )
  const [exporting, setExporting] = useState(false)

  function toggleFamily(id: string) {
    setSelectedFamilies((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleFormat(id: string) {
    setSelectedFormats((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleExport() {
    if (selectedFamilies.size === 0 || selectedFormats.size === 0) {
      showToast('Select at least one family and one format.', 'error')
      return
    }
    setExporting(true)
    try {
      const families = await Promise.all(
        project.families
          .filter((f) => selectedFamilies.has(f.id))
          .map(async (family) => ({
            name: family.name,
            styles: await Promise.all(
              family.styles.map(async (style) => {
                const buf = await getFontBinary(style.sourceFontId)
                const fontData = buf
                  ? btoa(Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(''))
                  : null
                return {
                  name: style.name,
                  fontData,
                  metrics: style.metrics,
                  glyphOverrides: style.glyphOverrides,
                  kerningPairs: style.kerningPairs,
                }
              })
            ),
          }))
      )

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ families, formats: Array.from(selectedFormats) }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'Export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'typewright-export.zip'
      a.click()
      URL.revokeObjectURL(url)
      showToast('Exported successfully!', 'success')
      onClose()
    } catch (e: any) {
      showToast(`Export failed: ${e.message}`, 'error')
    } finally {
      setExporting(false)
    }
  }

  const familyCount = selectedFamilies.size
  const styleCount = project.families
    .filter((f) => selectedFamilies.has(f.id))
    .reduce((n, f) => n + f.styles.length, 0)
  const fileCount = styleCount * selectedFormats.size

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl w-[480px] shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
      >
        {/* Header */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Export Fonts</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {fileCount} file{fileCount !== 1 ? 's' : ''} across {familyCount} {familyCount === 1 ? 'family' : 'families'}
          </p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Families */}
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>FAMILIES</p>
            {project.families.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No families to export.</p>
            ) : (
              <div className="space-y-1.5">
                {project.families.map((family) => (
                  <label
                    key={family.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      background: selectedFamilies.has(family.id) ? 'var(--surface2)' : 'transparent',
                      border: `1px solid ${selectedFamilies.has(family.id) ? 'var(--border2)' : 'var(--border)'}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFamilies.has(family.id)}
                        onChange={() => toggleFamily(family.id)}
                        className="rounded"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{family.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {family.styles.length} style{family.styles.length !== 1 ? 's' : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Formats */}
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>FORMATS</p>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map((fmt) => {
                const active = selectedFormats.has(fmt.id)
                return (
                  <button
                    key={fmt.id}
                    onClick={() => toggleFormat(fmt.id)}
                    className="rounded-lg py-3 flex flex-col items-center gap-1 transition-all"
                    style={{
                      background: active ? 'var(--surface2)' : 'transparent',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    <span className="text-xs font-semibold" style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}>
                      {fmt.label}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{fmt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || project.families.length === 0 || selectedFamilies.size === 0 || selectedFormats.size === 0}
            className="text-xs px-5 py-2 rounded-lg font-medium transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0c0c0c' }}
          >
            {exporting ? 'Compiling…' : `Download .zip`}
          </button>
        </div>
      </div>
    </div>
  )
}
