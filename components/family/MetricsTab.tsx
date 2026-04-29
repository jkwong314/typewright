'use client'

import { useRef, useState, useEffect } from 'react'
import { useProjectStore } from '@/lib/store'
import { useFontData } from '@/lib/hooks/useFontData'
import type { FontFamily, FontStyle, FontMetrics } from '@/lib/types'

const FIELDS: { key: keyof FontMetrics; label: string; min: number; max: number }[] = [
  { key: 'unitsPerEm', label: 'Units Per Em', min: 500,   max: 2048 },
  { key: 'ascender',   label: 'Ascender',     min: 0,     max: 2000 },
  { key: 'descender',  label: 'Descender',    min: -1000, max: 0    },
  { key: 'capHeight',  label: 'Cap Height',   min: 0,     max: 2000 },
  { key: 'xHeight',    label: 'x-Height',     min: 0,     max: 1500 },
  { key: 'lineGap',    label: 'Line Gap',     min: 0,     max: 500  },
]

interface Props {
  family: FontFamily
  style: FontStyle
}

// Guide line row with label
function GuideLine({
  label, color, dash = false, fromBottom,
}: { label: string; color: string; dash?: boolean; fromBottom: string }) {
  return (
    <div
      className="absolute left-0 right-0 flex items-center gap-2 pointer-events-none"
      style={{ bottom: fromBottom }}
    >
      <div
        className="flex-1 h-px"
        style={{
          background: dash ? 'none' : color,
          borderTop: dash ? `1px dashed ${color}` : 'none',
        }}
      />
      <span
        className="text-[9px] shrink-0 pr-3 uppercase tracking-wider font-medium"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

export default function MetricsTab({ family, style }: Props) {
  const { updateMetrics } = useProjectStore()
  const { blobUrl } = useFontData(style.sourceFontId)
  const previewRef = useRef<HTMLDivElement>(null)
  const [containerH, setContainerH] = useState(600)
  const m = style.metrics

  // Track container height for responsive font sizing
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setContainerH(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function set(key: keyof FontMetrics, val: number) {
    updateMetrics(family.id, style.id, { [key]: val })
  }

  // ── Preview geometry ──────────────────────────────────────────────────────
  const totalUnits = m.ascender + Math.abs(m.descender)

  // Leave 10% padding top and bottom; the usable band is 80% of container
  const bottomPadPct = 10
  const usablePct    = 80

  // For a given font-unit value measured from the descender,
  // returns its percentage from the bottom of the container
  function unitToBottom(u: number) {
    return `${bottomPadPct + (u / totalUnits) * usablePct}%`
  }

  const baselinePct  = bottomPadPct + (Math.abs(m.descender) / totalUnits) * usablePct
  const ascenderPct  = bottomPadPct + usablePct

  // Font size so that one em square spans the full usable band
  const fontSize = (containerH * (usablePct / 100) * (m.unitsPerEm / totalUnits))
  // Text baseline distance from bottom of preview container
  const baselinePx = (containerH * baselinePct) / 100
  // Preview font ID (stable across re-renders as long as blobUrl doesn't change)
  const fontFaceId = `preview-${style.id}`

  return (
    <div className="flex gap-8 h-full">
      {/* ── Left: sliders ────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 overflow-y-auto space-y-5 pb-6 pr-1">
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
                style={{
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={m[key]}
              onChange={(e) => set(key, Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>
        ))}
      </div>

      {/* ── Right: large preview ─────────────────────────────────────────── */}
      <div
        ref={previewRef}
        className="flex-1 rounded-2xl overflow-hidden relative select-none"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        {blobUrl && (
          <style>{`
            @font-face {
              font-family: '${fontFaceId}';
              src: url('${blobUrl}');
            }
          `}</style>
        )}

        {/* Guide lines (bottom → up order so labels don't overlap) */}
        <GuideLine
          label="descender"
          color="rgba(212,196,168,0.15)"
          dash
          fromBottom={unitToBottom(0)}
        />
        <GuideLine
          label="baseline"
          color="rgba(212,196,168,0.35)"
          fromBottom={unitToBottom(Math.abs(m.descender))}
        />
        <GuideLine
          label="x-height"
          color="rgba(212,196,168,0.18)"
          dash
          fromBottom={unitToBottom(Math.abs(m.descender) + m.xHeight)}
        />
        <GuideLine
          label="cap height"
          color="rgba(212,196,168,0.22)"
          dash
          fromBottom={unitToBottom(Math.abs(m.descender) + m.capHeight)}
        />
        <GuideLine
          label="ascender"
          color="rgba(212,196,168,0.15)"
          dash
          fromBottom={`${ascenderPct}%`}
        />

        {/* Preview text — positioned so its baseline sits exactly on the baseline guide */}
        <div
          className="absolute left-8 whitespace-nowrap leading-none"
          style={{
            bottom: baselinePx,
            fontSize: fontSize,
            fontFamily: blobUrl ? `'${fontFaceId}', serif` : 'serif',
            color: 'var(--text)',
            lineHeight: 1,
          }}
        >
          Hx
        </div>

        {/* Label overlay */}
        <div
          className="absolute top-4 left-6 text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--muted)' }}
        >
          Preview
        </div>

        {/* Metrics readout */}
        <div
          className="absolute bottom-4 right-5 text-right space-y-0.5"
          style={{ color: 'var(--muted)' }}
        >
          <p className="text-[10px]">{m.unitsPerEm} UPM</p>
          <p className="text-[10px]">{m.ascender} / {m.descender}</p>
        </div>
      </div>
    </div>
  )
}
