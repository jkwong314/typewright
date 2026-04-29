'use client'

import { useState } from 'react'
import { useProjectStore } from '@/lib/store'
import { useToast } from '@/components/Toast'
import type { FontFamily, FontStyle } from '@/lib/types'

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
  500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
}

interface Props {
  family: FontFamily
  activeStyleId: string | null
  onSelectStyle: (id: string) => void
}

interface DuplicateModal {
  open: boolean
  name: string
  weight: number
}

export default function StylePanel({ family, activeStyleId, onSelectStyle }: Props) {
  const { updateStyleMeta, removeStyle, renameFamily, duplicateStyle, addStyle } = useProjectStore()
  const { showToast } = useToast()
  const [dup, setDup] = useState<DuplicateModal>({ open: false, name: '', weight: 700 })

  const activeStyle = family.styles.find((s) => s.id === activeStyleId)

  function handleDuplicate() {
    if (!activeStyle) return
    const trimmed = dup.name.trim()
    if (!trimmed) { showToast('Enter a name for the new style', 'error'); return }
    const id = duplicateStyle(family.id, activeStyle.id, trimmed, dup.weight)
    showToast(`"${trimmed}" created`, 'success')
    onSelectStyle(id)
    setDup({ open: false, name: '', weight: 700 })
  }

  function handleAddBlank() {
    const name = WEIGHT_NAMES[400]
    const id = addStyle(family.id, {
      name,
      weight: 400,
      italic: false,
      widthClass: 5,
      sourceFontId: '',
      metrics: {
        unitsPerEm: activeStyle?.metrics.unitsPerEm ?? 1000,
        ascender:   activeStyle?.metrics.ascender   ?? 800,
        descender:  activeStyle?.metrics.descender  ?? -200,
        capHeight:  activeStyle?.metrics.capHeight  ?? 700,
        xHeight:    activeStyle?.metrics.xHeight    ?? 500,
        lineGap:    0,
      },
    })
    showToast('Blank style added', 'success')
    onSelectStyle(id)
  }

  return (
    <>
      <div className="flex flex-col h-full" style={{ borderRight: '1px solid var(--border)' }}>
        {/* Family name */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            className="w-full bg-transparent text-sm font-semibold outline-none"
            style={{ color: 'var(--text)' }}
            defaultValue={family.name}
            onBlur={(e) => renameFamily(family.id, e.target.value.trim() || family.name)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {family.styles.length} style{family.styles.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Style list */}
        <div className="flex-1 overflow-y-auto py-2">
          {family.styles.length === 0 && (
            <p className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
              No styles yet.
            </p>
          )}
          {family.styles.map((style) => (
            <button
              key={style.id}
              onClick={() => onSelectStyle(style.id)}
              className="w-full text-left px-4 py-2.5 transition-colors"
              style={style.id === activeStyleId
                ? { background: 'var(--surface2)', color: 'var(--text)' }
                : { color: 'var(--muted)' }
              }
            >
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium">{style.name}</p>
                {!style.sourceFontId && (
                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(212,196,168,0.1)', color: 'var(--accent)' }}>scratch</span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)', fontWeight: 400 }}>
                {style.weight} · {style.italic ? 'Italic' : 'Upright'}
              </p>
            </button>
          ))}
        </div>

        {/* Add style buttons */}
        <div className="px-3 py-2 flex gap-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleAddBlank}
            className="flex-1 text-xs py-1.5 rounded-md transition-colors"
            style={{ color: 'var(--muted)', border: '1px dashed var(--border2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
            title="Add blank scratch style"
          >+ Blank</button>
          {activeStyle && (
            <button
              onClick={() => setDup({ open: true, name: `${activeStyle.name} Copy`, weight: activeStyle.weight === 400 ? 700 : 400 })}
              className="flex-1 text-xs py-1.5 rounded-md transition-colors"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
              title="Duplicate active style"
            >Duplicate</button>
          )}
        </div>

        {/* Active style metadata editor */}
        {activeStyle && (
          <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>STYLE SETTINGS</p>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Name</label>
              <input
                className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                defaultValue={activeStyle.name}
                onBlur={(e) => updateStyleMeta(family.id, activeStyle.id, { name: e.target.value.trim() || activeStyle.name })}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
              />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Weight</label>
              <select
                className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                value={activeStyle.weight}
                onChange={(e) => updateStyleMeta(family.id, activeStyle.id, { weight: Number(e.target.value) })}
              >
                {WEIGHTS.map((w) => <option key={w} value={w}>{w} — {WEIGHT_NAMES[w]}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeStyle.italic}
                onChange={(e) => updateStyleMeta(family.id, activeStyle.id, { italic: e.target.checked })}
              />
              <span className="text-xs" style={{ color: 'var(--text)' }}>Italic</span>
            </label>

            <button
              onClick={() => {
                if (confirm(`Remove "${activeStyle.name}" from this family?`)) {
                  removeStyle(family.id, activeStyle.id)
                  showToast(`"${activeStyle.name}" removed`, 'success')
                }
              }}
              className="text-xs px-3 py-1.5 rounded-md w-full transition-colors"
              style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Remove style
            </button>
          </div>
        )}
      </div>

      {/* Duplicate modal */}
      {dup.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDup((d) => ({ ...d, open: false })) }}
        >
          <div className="rounded-2xl w-80 overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Duplicate Style</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Copies all glyph overrides and ligatures.
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>New name</label>
                <input
                  autoFocus
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  value={dup.name}
                  onChange={(e) => setDup((d) => ({ ...d, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Weight</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  value={dup.weight}
                  onChange={(e) => setDup((d) => ({ ...d, weight: Number(e.target.value) }))}
                >
                  {WEIGHTS.map((w) => <option key={w} value={w}>{w} — {WEIGHT_NAMES[w]}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 py-3 flex justify-between" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setDup((d) => ({ ...d, open: false }))}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
              >Cancel</button>
              <button
                onClick={handleDuplicate}
                className="text-xs px-4 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--accent)', color: '#0c0c0c' }}
              >Duplicate</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
