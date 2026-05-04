import type { Contour, BezierPoint } from './types'

export interface Pt { x: number; y: number }

// ── Sibling handle lookup ────────────────────────────────────────────────
// When dragging an off-curve, returns the index of the OTHER off-curve handle
// at the adjacent on-curve point (so callers can mirror it). Null if no pair.
export interface SiblingInfo {
  onIdx: number
  siblingIdx: number
}

export function findSiblingHandle(c: Contour, draggedIdx: number): SiblingInfo | null {
  const pts = c.points
  if (pts[draggedIdx]?.type !== 'off') return null
  if (pts[draggedIdx - 1]?.type === 'on') {
    const onIdx = draggedIdx - 1
    if (pts[onIdx - 1]?.type === 'off') return { onIdx, siblingIdx: onIdx - 1 }
    return null
  }
  if (pts[draggedIdx + 1]?.type === 'on') {
    const onIdx = draggedIdx + 1
    if (pts[onIdx + 1]?.type === 'off') return { onIdx, siblingIdx: onIdx + 1 }
    return null
  }
  return null
}

// ── Cubic split (De Casteljau) ──────────────────────────────────────────
function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export interface CubicSplit {
  q0: Pt; r0: Pt; mid: Pt; r1: Pt; q2: Pt
}

export function splitCubic(p0: Pt, c0: Pt, c1: Pt, p1: Pt, t: number): CubicSplit {
  const q0 = lerp(p0, c0, t)
  const q1 = lerp(c0, c1, t)
  const q2 = lerp(c1, p1, t)
  const r0 = lerp(q0, q1, t)
  const r1 = lerp(q1, q2, t)
  const mid = lerp(r0, r1, t)
  return { q0, r0, mid, r1, q2 }
}

// ── Closest-point search on a single segment ────────────────────────────
function evalCubic(p0: Pt, c0: Pt, c1: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y,
  }
}

interface Hit { t: number; pt: Pt; dist: number }

function closestOnLine(p0: Pt, p1: Pt, cursor: Pt): Hit {
  const dx = p1.x - p0.x, dy = p1.y - p0.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return { t: 0, pt: p0, dist: Math.hypot(p0.x - cursor.x, p0.y - cursor.y) }
  let t = ((cursor.x - p0.x) * dx + (cursor.y - p0.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const pt = { x: p0.x + dx * t, y: p0.y + dy * t }
  return { t, pt, dist: Math.hypot(pt.x - cursor.x, pt.y - cursor.y) }
}

function closestOnCubic(p0: Pt, c0: Pt, c1: Pt, p1: Pt, cursor: Pt): Hit {
  let bestT = 0, bestDist = Infinity, bestPt = p0
  const N = 32
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const p = evalCubic(p0, c0, c1, p1, t)
    const d = Math.hypot(p.x - cursor.x, p.y - cursor.y)
    if (d < bestDist) { bestDist = d; bestT = t; bestPt = p }
  }
  // Refine
  let step = 1 / N
  for (let r = 0; r < 8; r++) {
    const tL = Math.max(0, bestT - step / 2)
    const tR = Math.min(1, bestT + step / 2)
    const pL = evalCubic(p0, c0, c1, p1, tL); const dL = Math.hypot(pL.x - cursor.x, pL.y - cursor.y)
    const pR = evalCubic(p0, c0, c1, p1, tR); const dR = Math.hypot(pR.x - cursor.x, pR.y - cursor.y)
    if (dL < bestDist) { bestDist = dL; bestT = tL; bestPt = pL }
    if (dR < bestDist) { bestDist = dR; bestT = tR; bestPt = pR }
    step /= 2
  }
  return { t: bestT, pt: bestPt, dist: bestDist }
}

// ── Segment iteration over a contour ────────────────────────────────────
// We enumerate consecutive on-curve pairs (with off-curves between them as
// cubic/quadratic handles) plus a "closure" line from last on → first on
// (matching contoursToPathD's `Z` semantics).
export interface SegmentHit {
  contourIdx: number
  segStart: number   // pts index of start on-curve
  segEnd: number     // pts index of end on-curve
  t: number
  pt: Pt
  dist: number
  isClosure: boolean
  isLine: boolean
}

export function closestSegmentHit(contours: Contour[], cursor: Pt): SegmentHit | null {
  let best: SegmentHit | null = null
  contours.forEach((c, ci) => {
    const pts = c.points
    const onIdxs: number[] = []
    pts.forEach((p, i) => { if (p.type === 'on') onIdxs.push(i) })
    if (onIdxs.length < 2) return

    for (let k = 0; k < onIdxs.length; k++) {
      const startIdx = onIdxs[k]
      const isWrap = k === onIdxs.length - 1
      const endIdx = onIdxs[(k + 1) % onIdxs.length]
      const p0 = pts[startIdx], p1 = pts[endIdx]

      let hit: Hit
      let isLine = true
      if (isWrap) {
        // Z closure: straight line.
        hit = closestOnLine(p0, p1, cursor)
      } else {
        // Off-curves between startIdx + 1 .. endIdx - 1
        const offs: number[] = []
        for (let i = startIdx + 1; i < endIdx; i++) {
          if (pts[i].type === 'off') offs.push(i)
        }
        if (offs.length === 0) {
          hit = closestOnLine(p0, p1, cursor)
        } else if (offs.length === 2) {
          isLine = false
          hit = closestOnCubic(p0, pts[offs[0]], pts[offs[1]], p1, cursor)
        } else if (offs.length === 1) {
          isLine = false
          const q = pts[offs[0]]
          const c0 = { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) }
          const c1 = { x: p1.x + (2 / 3) * (q.x - p1.x), y: p1.y + (2 / 3) * (q.y - p1.y) }
          hit = closestOnCubic(p0, c0, c1, p1, cursor)
        } else {
          continue
        }
      }
      if (!best || hit.dist < best.dist) {
        best = {
          contourIdx: ci, segStart: startIdx, segEnd: endIdx,
          t: hit.t, pt: hit.pt, dist: hit.dist, isClosure: isWrap, isLine,
        }
      }
    }
  })
  return best
}

// ── Insert a new on-curve point at a SegmentHit ─────────────────────────
const round = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) })

export function insertPointAtSegment(c: Contour, hit: SegmentHit): Contour {
  const pts = c.points
  const newPts: BezierPoint[] = [...pts]
  const p0 = pts[hit.segStart], p1 = pts[hit.segEnd]

  if (hit.isLine) {
    const nx = round({ x: p0.x + (p1.x - p0.x) * hit.t, y: p0.y + (p1.y - p0.y) * hit.t })
    const newOn: BezierPoint = { x: nx.x, y: nx.y, type: 'on' }
    if (hit.isClosure) {
      newPts.push(newOn)
    } else {
      newPts.splice(hit.segEnd, 0, newOn)
    }
    return { points: newPts }
  }

  // Curved segment: collect off-curve indices between segStart and segEnd.
  const offs: number[] = []
  for (let i = hit.segStart + 1; i < hit.segEnd; i++) {
    if (pts[i].type === 'off') offs.push(i)
  }

  let c0: Pt, c1: Pt, isQuad = false
  if (offs.length === 2) {
    c0 = pts[offs[0]]; c1 = pts[offs[1]]
  } else if (offs.length === 1) {
    isQuad = true
    const q = pts[offs[0]]
    c0 = { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) }
    c1 = { x: p1.x + (2 / 3) * (q.x - p1.x), y: p1.y + (2 / 3) * (q.y - p1.y) }
  } else {
    return c
  }

  const split = splitCubic(p0, c0, c1, p1, hit.t)
  const q0 = round(split.q0), r0 = round(split.r0), mid = round(split.mid)
  const r1 = round(split.r1), q2 = round(split.q2)

  if (isQuad) {
    // Replace the single quadratic handle with a cubic-cubic chain.
    newPts.splice(offs[0], 1,
      { x: q0.x, y: q0.y, type: 'off' },
      { x: r0.x, y: r0.y, type: 'off' },
      { x: mid.x, y: mid.y, type: 'on' },
      { x: r1.x, y: r1.y, type: 'off' },
      { x: q2.x, y: q2.y, type: 'off' },
    )
  } else {
    // Cubic: update existing c0 → q0, c1 → q2; insert [r0, mid, r1] between them.
    newPts[offs[0]] = { ...newPts[offs[0]], x: q0.x, y: q0.y }
    newPts[offs[1]] = { ...newPts[offs[1]], x: q2.x, y: q2.y }
    newPts.splice(offs[1], 0,
      { x: r0.x, y: r0.y, type: 'off' },
      { x: mid.x, y: mid.y, type: 'on' },
      { x: r1.x, y: r1.y, type: 'off' },
    )
  }
  return { points: newPts }
}

// ── Pen contour: remove the last placed point ───────────────────────────
// Walks back from the end: drop trailing off-curves, then drop the on-curve.
// If a NEW trailing off-curve is exposed, it becomes the pendingHandle for
// continued drawing.
export interface BackspaceResult {
  contour: BezierPoint[]
  pendingHandle: Pt | null
}

export function backspaceLastPenPoint(
  penContour: BezierPoint[],
  pendingHandle: Pt | null,
): BackspaceResult {
  // If there's a pendingHandle (the post-last-on outgoing handle), drop it first.
  if (pendingHandle) return { contour: penContour, pendingHandle: null }

  const next = [...penContour]
  // Drop trailing off-curve(s) (the incoming handles for the last on-curve).
  while (next.length && next[next.length - 1].type === 'off') next.pop()
  // Drop the last on-curve.
  if (next.length && next[next.length - 1].type === 'on') next.pop()
  // Expose the outgoing handle of the new last on-curve, if any.
  let newPending: Pt | null = null
  if (next.length && next[next.length - 1].type === 'off') {
    const tail = next.pop()!
    newPending = { x: tail.x, y: tail.y }
  }
  return { contour: next, pendingHandle: newPending }
}
