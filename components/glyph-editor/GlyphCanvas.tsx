'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { contoursToPathD } from '@/lib/font-parser'
import type { Contour, BezierPoint } from '@/lib/types'

interface Props {
  contours: Contour[]
  advanceWidth: number
  metrics: { ascender: number; descender: number; unitsPerEm: number; capHeight: number; xHeight: number }
  onChange: (contours: Contour[]) => void
}

interface DragState {
  contourIdx: number
  pointIdx: number
  startFontX: number
  startFontY: number
  pointStartX: number
  pointStartY: number
}

export default function GlyphCanvas({ contours, advanceWidth, metrics, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const contoursRef = useRef<Contour[]>(contours)
  const dragRef = useRef<DragState | null>(null)
  const [selected, setSelected] = useState<{ ci: number; pi: number } | null>(null)
  const [localContours, setLocalContours] = useState<Contour[]>(contours)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    contoursRef.current = contours
    setLocalContours(contours)
  }, [contours])

  const { ascender, descender, unitsPerEm } = metrics
  const margin = 80
  const totalH = ascender - descender
  const viewBox = `${-margin} ${descender - margin} ${advanceWidth + margin * 2} ${totalH + margin * 2}`

  // Convert screen coords → font coords (accounting for viewBox + scale(1,-1) group)
  function toFontCoords(e: PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    // The content group uses scale(1,-1), so font Y = -svgY
    return { x: svgPt.x, y: -svgPt.y }
  }

  const onPointPointerDown = useCallback((
    e: React.PointerEvent,
    ci: number,
    pi: number
  ) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const fc = toFontCoords(e.nativeEvent)
    if (!fc) return
    const pt = contoursRef.current[ci].points[pi]
    dragRef.current = { contourIdx: ci, pointIdx: pi, startFontX: fc.x, startFontY: fc.y, pointStartX: pt.x, pointStartY: pt.y }
    setSelected({ ci, pi })
  }, [])

  const onSVGPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const fc = toFontCoords(e.nativeEvent)
    if (!fc) return

    let dx = fc.x - drag.startFontX
    let dy = fc.y - drag.startFontY
    if (e.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0
    }

    const newX = Math.round(drag.pointStartX + dx)
    const newY = Math.round(drag.pointStartY + dy)

    // Mutate ref directly for performance
    const updated = contoursRef.current.map((c, ci) =>
      ci !== drag.contourIdx ? c : {
        points: c.points.map((p, pi) =>
          pi !== drag.pointIdx ? p : { ...p, x: newX, y: newY }
        )
      }
    )
    contoursRef.current = updated
    setLocalContours([...updated])
  }, [])

  const onSVGPointerUp = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    onChange(contoursRef.current)
  }, [onChange])

  // Keyboard nudge
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selected) return
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]
    }
    const delta = arrows[e.key]
    if (!delta) return
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    const [dx, dy] = delta
    const updated = contoursRef.current.map((c, ci) =>
      ci !== selected.ci ? c : {
        points: c.points.map((p, pi) =>
          pi !== selected.pi ? p : { ...p, x: p.x + dx * step, y: p.y + dy * step }
        )
      }
    )
    contoursRef.current = updated
    setLocalContours([...updated])
    onChange(updated)
  }, [selected, onChange])

  // Build handle lines: each 'off' point connects to adjacent 'on' points
  const handleLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  localContours.forEach((c) => {
    c.points.forEach((pt, pi) => {
      if (pt.type !== 'off') return
      const prev = c.points[pi - 1]
      const next = c.points[pi + 1]
      if (prev?.type === 'on') handleLines.push({ x1: prev.x, y1: prev.y, x2: pt.x, y2: pt.y })
      if (next?.type === 'on') handleLines.push({ x1: pt.x, y1: pt.y, x2: next.x, y2: next.y })
    })
  })

  const pathD = contoursToPathD(localContours)

  return (
    <div className="relative w-full h-full flex items-center justify-center outline-none" tabIndex={0} onKeyDown={onKeyDown}>
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex gap-1 z-10">
        {[
          { label: '−', action: () => setZoom((z) => Math.max(0.3, z - 0.15)) },
          { label: '+', action: () => setZoom((z) => Math.min(3, z + 0.15)) },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-7 h-7 rounded-md text-sm flex items-center justify-center"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {label}
          </button>
        ))}
        <span className="text-xs self-center ml-1" style={{ color: 'var(--muted)' }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        onPointerMove={onSVGPointerMove}
        onPointerUp={onSVGPointerUp}
        onPointerLeave={onSVGPointerUp}
        style={{
          width: `${Math.min(100, 60 * zoom)}%`,
          height: `${Math.min(100, 60 * zoom)}%`,
          maxWidth: '100%',
          maxHeight: '100%',
          cursor: dragRef.current ? 'crosshair' : 'default',
        }}
      >
        {/* Guide lines (in font coords, inside scale group) */}
        <g transform="scale(1,-1)">
          {/* Em box */}
          <rect x={0} y={-ascender} width={advanceWidth} height={totalH}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          {/* Baseline */}
          <line x1={-margin} y1={0} x2={advanceWidth + margin} y2={0}
            stroke="rgba(212,196,168,0.25)" strokeWidth={0.8} />
          {/* x-height */}
          <line x1={-margin} y1={metrics.xHeight} x2={advanceWidth + margin} y2={metrics.xHeight}
            stroke="rgba(212,196,168,0.1)" strokeWidth={0.6} strokeDasharray="6 4" />
          {/* Cap height */}
          <line x1={-margin} y1={metrics.capHeight} x2={advanceWidth + margin} y2={metrics.capHeight}
            stroke="rgba(212,196,168,0.12)" strokeWidth={0.6} strokeDasharray="6 4" />
          {/* Ascender */}
          <line x1={-margin} y1={ascender} x2={advanceWidth + margin} y2={ascender}
            stroke="rgba(212,196,168,0.08)" strokeWidth={0.6} />
          {/* Descender */}
          <line x1={-margin} y1={descender} x2={advanceWidth + margin} y2={descender}
            stroke="rgba(212,196,168,0.08)" strokeWidth={0.6} />
          {/* Advance width */}
          <line x1={advanceWidth} y1={descender - margin} x2={advanceWidth} y2={ascender + margin}
            stroke="rgba(212,196,168,0.15)" strokeWidth={0.8} strokeDasharray="4 4" />

          {/* Glyph fill */}
          {pathD && (
            <path d={pathD} fill="rgba(240,236,230,0.08)" stroke="none" />
          )}
          {/* Glyph outline */}
          {pathD && (
            <path d={pathD} fill="none" stroke="rgba(240,236,230,0.5)" strokeWidth={1.5} />
          )}

          {/* Handle lines */}
          {handleLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="rgba(212,196,168,0.3)" strokeWidth={1} />
          ))}

          {/* Points */}
          {localContours.map((c, ci) =>
            c.points.map((pt, pi) => {
              const isSel = selected?.ci === ci && selected?.pi === pi
              if (pt.type === 'on') {
                return (
                  <circle
                    key={`${ci}-${pi}`}
                    cx={pt.x} cy={pt.y} r={5}
                    fill={isSel ? 'var(--accent)' : 'var(--surface)'}
                    stroke={isSel ? 'var(--accent2)' : 'rgba(212,196,168,0.7)'}
                    strokeWidth={1.5}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => onPointPointerDown(e, ci, pi)}
                  />
                )
              } else {
                return (
                  <rect
                    key={`${ci}-${pi}`}
                    x={pt.x - 4} y={pt.y - 4} width={8} height={8}
                    fill={isSel ? 'var(--accent)' : 'transparent'}
                    stroke={isSel ? 'var(--accent2)' : 'rgba(212,196,168,0.5)'}
                    strokeWidth={1.2}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => onPointPointerDown(e, ci, pi)}
                  />
                )
              }
            })
          )}
        </g>
      </svg>

      {localContours.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>No contours — this glyph has no outline.</p>
        </div>
      )}
    </div>
  )
}
