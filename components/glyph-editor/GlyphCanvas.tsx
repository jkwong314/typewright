'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { contoursToPathD } from '@/lib/font-parser'
import type { Contour, BezierPoint } from '@/lib/types'

type EditorMode = 'select' | 'pen'

interface Props {
  contours: Contour[]
  advanceWidth: number
  metrics: { ascender: number; descender: number; unitsPerEm: number; capHeight: number; xHeight: number }
  onChange: (contours: Contour[]) => void
  referenceImageUrl?: string
  defaultMode?: EditorMode
}

interface DragState {
  contourIdx: number
  pointIdx: number
  startFontX: number
  startFontY: number
  pointStartX: number
  pointStartY: number
}

// Distance in font units below which we snap to the first pen point to close a contour
const CLOSE_SNAP = 14

export default function GlyphCanvas({ contours, advanceWidth, metrics, onChange, referenceImageUrl, defaultMode }: Props) {
  const svgRef        = useRef<SVGSVGElement>(null)
  const contoursRef   = useRef<Contour[]>(contours)
  const dragRef       = useRef<DragState | null>(null)
  const penDownRef    = useRef<{ x: number; y: number } | null>(null)

  const [selected,       setSelected]       = useState<{ ci: number; pi: number } | null>(null)
  const [localContours,  setLocalContours]  = useState<Contour[]>(contours)
  const [zoom,           setZoom]           = useState(1)
  const [mode,           setMode]           = useState<EditorMode>(defaultMode ?? 'select')
  const [imageOpacity,   setImageOpacity]   = useState(0.4)

  // Pen tool state
  const [penContour,   setPenContour]   = useState<BezierPoint[]>([])   // points placed so far
  const [pendingHandle, setPendingHandle] = useState<{ x: number; y: number } | null>(null) // outgoing handle from last placed pt
  const [penMouse,     setPenMouse]     = useState<{ x: number; y: number } | null>(null)   // live cursor
  const [penDragH,     setPenDragH]     = useState<{ x: number; y: number } | null>(null)   // drag-in-progress handle

  useEffect(() => {
    contoursRef.current = contours
    setLocalContours(contours)
  }, [contours])

  // ── Coordinate conversion ────────────────────────────────────────────────
  function toFontCoords(e: PointerEvent | MouseEvent): { x: number; y: number } | null {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: svgPt.x, y: -svgPt.y }
  }

  // ── Select mode – drag points ────────────────────────────────────────────
  const onPointPointerDown = useCallback((e: React.PointerEvent, ci: number, pi: number) => {
    if (mode !== 'select') return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const fc = toFontCoords(e.nativeEvent)
    if (!fc) return
    const pt = contoursRef.current[ci].points[pi]
    dragRef.current = { contourIdx: ci, pointIdx: pi, startFontX: fc.x, startFontY: fc.y, pointStartX: pt.x, pointStartY: pt.y }
    setSelected({ ci, pi })
  }, [mode])

  const onSVGPointerMove = useCallback((e: React.PointerEvent) => {
    // ── Select drag ──
    const drag = dragRef.current
    if (drag) {
      const fc = toFontCoords(e.nativeEvent)
      if (!fc) return
      let dx = fc.x - drag.startFontX
      let dy = fc.y - drag.startFontY
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0 }
      const newX = Math.round(drag.pointStartX + dx)
      const newY = Math.round(drag.pointStartY + dy)
      const updated = contoursRef.current.map((c, ci) =>
        ci !== drag.contourIdx ? c : { points: c.points.map((p, pi) => pi !== drag.pointIdx ? p : { ...p, x: newX, y: newY }) }
      )
      contoursRef.current = updated
      setLocalContours([...updated])
      return
    }

    // ── Pen mouse tracking ──
    if (mode === 'pen') {
      const fc = toFontCoords(e.nativeEvent)
      if (!fc) return
      setPenMouse(fc)
      if (penDownRef.current && e.buttons === 1) {
        setPenDragH(fc)
      }
    }
  }, [mode])

  const onSVGPointerUp = useCallback((e: React.PointerEvent) => {
    // ── Select up ──
    if (dragRef.current) {
      dragRef.current = null
      onChange(contoursRef.current)
      return
    }

    // ── Pen up ──
    if (mode === 'pen') {
      const fc = toFontCoords(e.nativeEvent)
      const down = penDownRef.current
      penDownRef.current = null
      setPenDragH(null)
      if (!fc || !down) return

      const dragDist = Math.hypot(fc.x - down.x, fc.y - down.y)
      const isDrag = dragDist > 8

      if (!isDrag) {
        // Simple click → corner point
        addPenPoint(down, null)
      } else {
        // Drag → smooth point: forward handle = fc, backward handle = mirror
        addPenPoint(down, fc)
      }
    }
  }, [mode, penContour, pendingHandle]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSVGPointerDown = useCallback((e: React.PointerEvent) => {
    if (mode !== 'pen') return
    e.preventDefault()
    const fc = toFontCoords(e.nativeEvent)
    if (!fc) return

    // Check if clicking near first point → close contour
    if (penContour.length >= 2) {
      const firstOn = penContour.find((p) => p.type === 'on')
      if (firstOn) {
        const dist = Math.hypot(fc.x - firstOn.x, fc.y - firstOn.y)
        if (dist < CLOSE_SNAP) {
          commitPenContour()
          return
        }
      }
    }

    penDownRef.current = { x: fc.x, y: fc.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [mode, penContour]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pen helpers ──────────────────────────────────────────────────────────
  function addPenPoint(anchor: { x: number; y: number }, dragHandle: { x: number; y: number } | null) {
    const ax = Math.round(anchor.x), ay = Math.round(anchor.y)
    const newPts: BezierPoint[] = []

    if (dragHandle) {
      const hx = Math.round(dragHandle.x), hy = Math.round(dragHandle.y)
      const mx = 2 * ax - hx, my = 2 * ay - hy  // mirror handle (incoming)

      if (pendingHandle) {
        newPts.push({ x: Math.round(pendingHandle.x), y: Math.round(pendingHandle.y), type: 'off' })
        newPts.push({ x: mx, y: my, type: 'off' })
      } else if (penContour.length > 0) {
        newPts.push({ x: mx, y: my, type: 'off' })
      }
      newPts.push({ x: ax, y: ay, type: 'on' })
      setPenContour((prev) => [...prev, ...newPts])
      setPendingHandle({ x: hx, y: hy })
    } else {
      // Corner point
      if (pendingHandle) {
        newPts.push({ x: Math.round(pendingHandle.x), y: Math.round(pendingHandle.y), type: 'off' })
      }
      newPts.push({ x: ax, y: ay, type: 'on' })
      setPenContour((prev) => [...prev, ...newPts])
      setPendingHandle(null)
    }
  }

  function commitPenContour() {
    const pts = pendingHandle
      ? [...penContour, { x: Math.round(pendingHandle.x), y: Math.round(pendingHandle.y), type: 'off' as const }]
      : penContour
    if (pts.filter((p) => p.type === 'on').length < 2) {
      setPenContour([]); setPendingHandle(null); return
    }
    const newContours = [...contoursRef.current, { points: pts }]
    contoursRef.current = newContours
    setLocalContours(newContours)
    onChange(newContours)
    setPenContour([])
    setPendingHandle(null)
  }

  function endPenOpen() {
    if (penContour.length < 2) { setPenContour([]); setPendingHandle(null); return }
    commitPenContour()
  }

  function deleteLastContour() {
    if (localContours.length === 0) return
    const updated = localContours.slice(0, -1)
    contoursRef.current = updated
    setLocalContours(updated)
    onChange(updated)
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (mode === 'pen' && penContour.length > 0) { endPenOpen(); return }
      if (mode === 'pen') { setMode('select'); return }
    }
    if (e.key === 'p' || e.key === 'P') { setMode((m) => m === 'pen' ? 'select' : 'pen'); return }
    if (e.key === 'v' || e.key === 'V') { setMode('select'); return }
    if ((e.key === 'Delete' || e.key === 'Backspace') && mode === 'pen') {
      deleteLastContour(); return
    }

    // Arrow nudge (select mode)
    if (!selected || mode !== 'select') return
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
    }
    const delta = arrows[e.key]
    if (!delta) return
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    const [dx, dy] = delta
    const updated = contoursRef.current.map((c, ci) =>
      ci !== selected.ci ? c : { points: c.points.map((p, pi) => pi !== selected.pi ? p : { ...p, x: p.x + dx * step, y: p.y + dy * step }) }
    )
    contoursRef.current = updated
    setLocalContours([...updated])
    onChange(updated)
  }, [selected, mode, penContour, pendingHandle]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Geometry ─────────────────────────────────────────────────────────────
  const { ascender, descender } = metrics
  const margin  = 80
  const totalH  = ascender - descender
  const viewBox = `${-margin} ${descender - margin} ${advanceWidth + margin * 2} ${totalH + margin * 2}`

  // Handle lines for existing contours
  const handleLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  localContours.forEach((c) => {
    c.points.forEach((pt, pi) => {
      if (pt.type !== 'off') return
      const prev = c.points[pi - 1]; const next = c.points[pi + 1]
      if (prev?.type === 'on') handleLines.push({ x1: prev.x, y1: prev.y, x2: pt.x, y2: pt.y })
      if (next?.type === 'on') handleLines.push({ x1: pt.x, y1: pt.y, x2: next.x, y2: next.y })
    })
  })

  // Handle lines for in-progress pen contour
  const penHandleLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  penContour.forEach((pt, pi) => {
    if (pt.type !== 'off') return
    const prev = penContour[pi - 1]; const next = penContour[pi + 1]
    if (prev?.type === 'on') penHandleLines.push({ x1: prev.x, y1: prev.y, x2: pt.x, y2: pt.y })
    if (next?.type === 'on') penHandleLines.push({ x1: pt.x, y1: pt.y, x2: next.x, y2: next.y })
  })

  const pathD    = contoursToPathD(localContours)
  const penPathD = contoursToPathD(penContour.length > 0 ? [{ points: penContour }] : [])

  // First on-curve point of current pen contour (for close-snap indicator)
  const penFirstOn = penContour.find((p) => p.type === 'on')
  const nearClose = penFirstOn && penMouse && penContour.length >= 2 &&
    Math.hypot(penMouse.x - penFirstOn.x, penMouse.y - penFirstOn.y) < CLOSE_SNAP

  return (
    <div
      className="relative w-full h-full flex items-center justify-center outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ cursor: mode === 'pen' ? 'crosshair' : 'default' }}
    >
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 flex gap-1 z-10">
        {/* Select tool */}
        <button
          onClick={() => setMode('select')}
          title="Select (V)"
          className="w-8 h-8 rounded-md flex items-center justify-center text-xs transition-all"
          style={mode === 'select'
            ? { background: 'var(--accent)', color: '#0c0c0c' }
            : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 2l16 9.5-7.5 1.5L9 21z" />
          </svg>
        </button>
        {/* Pen tool */}
        <button
          onClick={() => setMode(mode === 'pen' ? 'select' : 'pen')}
          title="Pen (P)"
          className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
          style={mode === 'pen'
            ? { background: 'var(--accent)', color: '#0c0c0c' }
            : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>
          </svg>
        </button>

        {/* Pen actions (only when drawing) */}
        {mode === 'pen' && penContour.length > 0 && (
          <>
            <div className="w-px mx-0.5" style={{ background: 'var(--border)' }} />
            <button
              onClick={commitPenContour}
              title="Close contour"
              className="px-2 h-8 rounded-md text-xs transition-all"
              style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
            >Close</button>
            <button
              onClick={endPenOpen}
              title="End open contour (Esc)"
              className="px-2 h-8 rounded-md text-xs transition-all"
              style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            >End</button>
          </>
        )}

        {/* Delete last contour */}
        {localContours.length > 0 && mode === 'select' && (
          <>
            <div className="w-px mx-0.5" style={{ background: 'var(--border)' }} />
            <button
              onClick={deleteLastContour}
              title="Delete last contour"
              className="w-8 h-8 rounded-md flex items-center justify-center text-xs transition-all"
              style={{ background: 'var(--surface2)', color: '#ef4444', border: '1px solid var(--border)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Zoom + image opacity controls ─────────────────────────────── */}
      <div className="absolute top-4 right-4 flex gap-1 z-10">
        {referenceImageUrl && (
          <div className="flex items-center gap-1.5 mr-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
            </svg>
            <input
              type="range" min={0.05} max={0.6} step={0.05}
              value={imageOpacity}
              onChange={(e) => setImageOpacity(Number(e.target.value))}
              className="w-20"
              title="Reference image opacity"
            />
          </div>
        )}
        {[{ label: '−', action: () => setZoom((z) => Math.max(0.3, z - 0.15)) },
          { label: '+', action: () => setZoom((z) => Math.min(3, z + 0.15)) }
        ].map(({ label, action }) => (
          <button key={label} onClick={action}
            className="w-7 h-7 rounded-md text-sm flex items-center justify-center"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >{label}</button>
        ))}
        <span className="text-xs self-center ml-1" style={{ color: 'var(--muted)' }}>{Math.round(zoom * 100)}%</span>
      </div>

      {/* ── Shortcut hint ─────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 text-[10px] space-y-0.5 pointer-events-none" style={{ color: 'var(--muted)' }}>
        <p><kbd className="font-mono">P</kbd> Pen &nbsp;<kbd className="font-mono">V</kbd> Select &nbsp;<kbd className="font-mono">Esc</kbd> End path</p>
        {mode === 'select' && <p>Arrow keys nudge · Shift ×10</p>}
        {mode === 'pen' && penContour.length > 0 && <p>Click first point to close · Drag for curves</p>}
      </div>

      {/* ── SVG canvas ────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        onPointerDown={onSVGPointerDown}
        onPointerMove={onSVGPointerMove}
        onPointerUp={onSVGPointerUp}
        onPointerLeave={(e) => { if (dragRef.current) { dragRef.current = null; onChange(contoursRef.current) }; setPenMouse(null); setPenDragH(null) }}
        style={{
          width: `${Math.min(100, 60 * zoom)}%`,
          height: `${Math.min(100, 60 * zoom)}%`,
          maxWidth: '100%', maxHeight: '100%',
          userSelect: 'none',
        }}
      >
        <g transform="scale(1,-1)">
          {/* ── Reference image overlay — fills entire canvas viewBox ── */}
          {referenceImageUrl && (
            <image
              href={referenceImageUrl}
              x={-margin}
              y={descender - margin}
              width={advanceWidth + margin * 2}
              height={totalH + margin * 2}
              preserveAspectRatio="xMidYMid meet"
              opacity={imageOpacity}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* ── Guide lines ─────────────────────────────────────────── */}
          <rect x={0} y={-ascender} width={advanceWidth} height={totalH} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          <line x1={-margin} y1={0} x2={advanceWidth + margin} y2={0} stroke="rgba(212,196,168,0.25)" strokeWidth={0.8} />
          <line x1={-margin} y1={metrics.xHeight} x2={advanceWidth + margin} y2={metrics.xHeight} stroke="rgba(212,196,168,0.1)" strokeWidth={0.6} strokeDasharray="6 4" />
          <line x1={-margin} y1={metrics.capHeight} x2={advanceWidth + margin} y2={metrics.capHeight} stroke="rgba(212,196,168,0.12)" strokeWidth={0.6} strokeDasharray="6 4" />
          <line x1={-margin} y1={ascender} x2={advanceWidth + margin} y2={ascender} stroke="rgba(212,196,168,0.08)" strokeWidth={0.6} />
          <line x1={-margin} y1={descender} x2={advanceWidth + margin} y2={descender} stroke="rgba(212,196,168,0.08)" strokeWidth={0.6} />
          <line x1={advanceWidth} y1={descender - margin} x2={advanceWidth} y2={ascender + margin} stroke="rgba(212,196,168,0.15)" strokeWidth={0.8} strokeDasharray="4 4" />

          {/* ── Committed glyph ─────────────────────────────────────── */}
          {pathD && <path d={pathD} fill="rgba(240,236,230,0.08)" stroke="none" />}
          {pathD && <path d={pathD} fill="none" stroke="rgba(240,236,230,0.5)" strokeWidth={1.5} />}

          {/* Handle lines */}
          {handleLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(212,196,168,0.3)" strokeWidth={1} />
          ))}

          {/* Points */}
          {localContours.map((c, ci) =>
            c.points.map((pt, pi) => {
              const isSel = selected?.ci === ci && selected?.pi === pi
              if (pt.type === 'on') {
                return (
                  <circle key={`${ci}-${pi}`} cx={pt.x} cy={pt.y} r={5}
                    fill={isSel ? 'var(--accent)' : 'var(--surface)'}
                    stroke={isSel ? 'var(--accent2)' : 'rgba(212,196,168,0.7)'} strokeWidth={1.5}
                    style={{ cursor: mode === 'select' ? 'grab' : 'default' }}
                    onPointerDown={(e) => onPointPointerDown(e, ci, pi)} />
                )
              }
              return (
                <rect key={`${ci}-${pi}`} x={pt.x - 4} y={pt.y - 4} width={8} height={8}
                  fill={isSel ? 'var(--accent)' : 'transparent'}
                  stroke={isSel ? 'var(--accent2)' : 'rgba(212,196,168,0.5)'} strokeWidth={1.2}
                  style={{ cursor: mode === 'select' ? 'grab' : 'default' }}
                  onPointerDown={(e) => onPointPointerDown(e, ci, pi)} />
              )
            })
          )}

          {/* ── In-progress pen contour ─────────────────────────────── */}
          {penPathD && <path d={penPathD} fill="none" stroke="rgba(212,196,168,0.6)" strokeWidth={1.5} strokeDasharray="5 3" />}

          {/* Ghost line from last placed point to cursor */}
          {penContour.length > 0 && penMouse && (() => {
            const lastOn = [...penContour].reverse().find((p) => p.type === 'on')
            if (!lastOn) return null
            const endPt = pendingHandle ?? lastOn
            return (
              <line x1={endPt.x} y1={endPt.y} x2={penMouse.x} y2={penMouse.y}
                stroke="rgba(212,196,168,0.35)" strokeWidth={1} strokeDasharray="3 3" />
            )
          })()}

          {/* Drag handle preview */}
          {penDownRef.current && penDragH && (
            <>
              <line
                x1={penDownRef.current.x} y1={penDownRef.current.y}
                x2={penDragH.x} y2={penDragH.y}
                stroke="rgba(212,196,168,0.4)" strokeWidth={1}
              />
              {/* Mirror handle */}
              <line
                x1={penDownRef.current.x} y1={penDownRef.current.y}
                x2={2 * penDownRef.current.x - penDragH.x} y2={2 * penDownRef.current.y - penDragH.y}
                stroke="rgba(212,196,168,0.4)" strokeWidth={1}
              />
              <circle cx={penDragH.x} cy={penDragH.y} r={4} fill="none" stroke="rgba(212,196,168,0.6)" strokeWidth={1.2} />
              <circle cx={2 * penDownRef.current.x - penDragH.x} cy={2 * penDownRef.current.y - penDragH.y} r={4}
                fill="none" stroke="rgba(212,196,168,0.6)" strokeWidth={1.2} />
            </>
          )}

          {/* Pen handle lines for in-progress contour */}
          {penHandleLines.map((l, i) => (
            <line key={`ph-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(212,196,168,0.25)" strokeWidth={1} />
          ))}

          {/* Pen points */}
          {penContour.map((pt, i) => {
            const isFirst = i === 0 && pt.type === 'on'
            if (pt.type === 'on') {
              return (
                <circle key={`pp-${i}`} cx={pt.x} cy={pt.y} r={isFirst && nearClose ? 7 : 5}
                  fill={nearClose && isFirst ? 'rgba(212,196,168,0.4)' : 'var(--surface)'}
                  stroke="rgba(212,196,168,0.9)" strokeWidth={1.5} style={{ cursor: 'pointer' }} />
              )
            }
            return (
              <rect key={`pp-${i}`} x={pt.x - 4} y={pt.y - 4} width={8} height={8}
                fill="transparent" stroke="rgba(212,196,168,0.5)" strokeWidth={1.2} />
            )
          })}

          {/* Pending handle preview (outgoing from last point) */}
          {pendingHandle && penContour.length > 0 && (() => {
            const lastOn = [...penContour].reverse().find((p) => p.type === 'on')
            if (!lastOn) return null
            return (
              <>
                <line x1={lastOn.x} y1={lastOn.y} x2={pendingHandle.x} y2={pendingHandle.y}
                  stroke="rgba(212,196,168,0.3)" strokeWidth={1} />
                <circle cx={pendingHandle.x} cy={pendingHandle.y} r={3}
                  fill="none" stroke="rgba(212,196,168,0.5)" strokeWidth={1} />
              </>
            )
          })()}
        </g>
      </svg>

      {localContours.length === 0 && penContour.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {mode === 'pen' ? 'Click to place points · Drag for curves' : 'No contours — press P to start drawing'}
          </p>
        </div>
      )}
    </div>
  )
}
