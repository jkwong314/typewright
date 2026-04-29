'use client'

import { useProjectStore } from '@/lib/store'
import type { FontFamily, FontStyle, FontMetrics } from '@/lib/types'

const FIELDS: { key: keyof FontMetrics; label: string; min: number; max: number }[] = [
  { key: 'unitsPerEm', label: 'Units Per Em', min: 500, max: 2048 },
  { key: 'ascender',   label: 'Ascender',     min: 0,   max: 2000 },
  { key: 'descender',  label: 'Descender',    min: -1000, max: 0 },
  { key: 'capHeight',  label: 'Cap Height',   min: 0,   max: 2000 },
  { key: 'xHeight',    label: 'x-Height',     min: 0,   max: 1500 },
  { key: 'lineGap',    label: 'Line Gap',     min: 0,   max: 500  },
]

interface Props {
  family: FontFamily
  style: FontStyle
}

export default function MetricsTab({ family, style }: Props) {
  const { updateMetrics } = useProjectStore()
  const m = style.metrics

  function set(key: keyof FontMetrics, val: number) {
    updateMetrics(family.id, style.id, { [key]: val })
  }

  return (
    <div className="space-y-5 max-w-lg">
      {FIELDS.map(({ key, label, min, max }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs" style={{ color: 'var(--muted)' }}>{label}</label>
            <input
              type="number"
              value={m[key]}
              min={min}
              max={max}
              onChange={(e) => set(key, Number(e.target.value))}
              className="w-20 text-right rounded-md px-2 py-1 text-xs outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={m[key]}
            onChange={(e) => set(key, Number(e.target.value))}
            className="w-full accent-[var(--accent)] h-1"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>
      ))}

      <div
        className="rounded-lg p-4 mt-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs mb-2 font-medium" style={{ color: 'var(--muted)' }}>PREVIEW</p>
        <div className="relative" style={{ height: 80 }}>
          {/* Baseline */}
          <div className="absolute left-0 right-0" style={{ bottom: '20%', borderTop: '1px solid rgba(212,196,168,0.2)' }} />
          {/* x-height */}
          <div className="absolute left-0 right-0" style={{
            bottom: `${20 + (m.xHeight / m.unitsPerEm) * 60}%`,
            borderTop: '1px dashed rgba(212,196,168,0.1)',
          }} />
          {/* Cap height */}
          <div className="absolute left-0 right-0" style={{
            bottom: `${20 + (m.capHeight / m.unitsPerEm) * 60}%`,
            borderTop: '1px dashed rgba(212,196,168,0.15)',
          }} />
          <span className="absolute bottom-[20%] left-0 text-4xl leading-none" style={{ color: 'var(--text)', transform: 'translateY(50%)' }}>
            Hx
          </span>
        </div>
      </div>
    </div>
  )
}
