'use client'

import type { Contour, FontStyle } from '@/lib/types'

interface Props {
  unicode: string
  glyphName: string
  advanceWidth: number
  contours: Contour[]
  style: FontStyle
  onAdvanceWidthChange: (val: number) => void
  onReset: () => void
  isModified: boolean
}

export default function GlyphSidePanel({
  unicode, glyphName, advanceWidth, contours, style, onAdvanceWidthChange, onReset, isModified
}: Props) {
  const allPoints = contours.flatMap((c) => c.points)
  const onCurvePoints = allPoints.filter((p) => p.type === 'on')
  const minX = onCurvePoints.length ? Math.min(...onCurvePoints.map((p) => p.x)) : 0
  const maxX = onCurvePoints.length ? Math.max(...onCurvePoints.map((p) => p.x)) : advanceWidth
  const lsb = minX
  const rsb = advanceWidth - maxX

  const rows = [
    { label: 'Unicode', value: `U+${unicode}` },
    { label: 'Glyph name', value: glyphName || '—' },
    { label: 'Contours', value: contours.length },
    { label: 'Points', value: allPoints.length },
    { label: 'LSB', value: Math.round(lsb) },
    { label: 'RSB', value: Math.round(rsb) },
  ]

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

        {/* Style info */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>STYLE</p>
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{style.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {style.weight} · {style.italic ? 'Italic' : 'Upright'}
          </p>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          ↑ ↓ ← → nudge · Shift = ×10
        </p>
        {isModified && (
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
