'use client'

import { useProjectStore } from '@/lib/store'
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

export default function StylePanel({ family, activeStyleId, onSelectStyle }: Props) {
  const { updateStyleMeta, removeStyle, renameFamily } = useProjectStore()

  const activeStyle = family.styles.find((s) => s.id === activeStyleId)

  return (
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
            No styles yet. Go to Font Library to import a font.
          </p>
        )}
        {family.styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelectStyle(style.id)}
            className="w-full text-left px-4 py-2.5 transition-colors"
            style={
              style.id === activeStyleId
                ? { background: 'var(--surface2)', color: 'var(--text)' }
                : { color: 'var(--muted)' }
            }
          >
            <p className="text-xs font-medium">{style.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)', fontWeight: 400 }}>
              {style.weight} · {style.italic ? 'Italic' : 'Upright'}
            </p>
          </button>
        ))}
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
              onBlur={(e) =>
                updateStyleMeta(family.id, activeStyle.id, { name: e.target.value.trim() || activeStyle.name })
              }
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
              {WEIGHTS.map((w) => (
                <option key={w} value={w}>{w} — {WEIGHT_NAMES[w]}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeStyle.italic}
              onChange={(e) => updateStyleMeta(family.id, activeStyle.id, { italic: e.target.checked })}
              className="rounded"
            />
            <span className="text-xs" style={{ color: 'var(--text)' }}>Italic</span>
          </label>

          <button
            onClick={() => {
              if (confirm(`Remove "${activeStyle.name}" from this family?`)) {
                removeStyle(family.id, activeStyle.id)
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
  )
}
