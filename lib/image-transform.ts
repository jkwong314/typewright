import type { ReferenceImage } from './types'

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export interface Pt { x: number; y: number }

const HANDLE_UNITS: Record<HandleId, Pt> = {
  nw: { x: 0,   y: 0 },
  n:  { x: 0.5, y: 0 },
  ne: { x: 1,   y: 0 },
  e:  { x: 1,   y: 0.5 },
  se: { x: 1,   y: 1 },
  s:  { x: 0.5, y: 1 },
  sw: { x: 0,   y: 1 },
  w:  { x: 0,   y: 0.5 },
}

const ANCHOR_OF: Record<HandleId, HandleId> = {
  nw: 'se', n: 's', ne: 'sw', e: 'w',
  se: 'nw', s: 'n', sw: 'ne', w: 'e',
}

const MIN_SIZE = 20

function rotatePt(p: Pt, rad: number): Pt {
  const c = Math.cos(rad), s = Math.sin(rad)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

export function imageCenter(img: ReferenceImage): Pt {
  return { x: img.x + img.width / 2, y: img.y + img.height / 2 }
}

// World coords for a given image-local point (0,0=top-left, w,h=bottom-right).
export function localToWorld(img: ReferenceImage, lx: number, ly: number): Pt {
  const c = imageCenter(img)
  const rad = (img.rotation * Math.PI) / 180
  const off = rotatePt({ x: lx - img.width / 2, y: ly - img.height / 2 }, rad)
  return { x: c.x + off.x, y: c.y + off.y }
}

export function handleWorldPos(img: ReferenceImage, h: HandleId): Pt {
  const u = HANDLE_UNITS[h]
  return localToWorld(img, u.x * img.width, u.y * img.height)
}

export function applyMove(start: ReferenceImage, deltaWorld: Pt): ReferenceImage {
  return { ...start, x: start.x + deltaWorld.x, y: start.y + deltaWorld.y }
}

export function applyResize(
  start: ReferenceImage,
  handle: HandleId,
  cursorWorld: Pt,
  keepAspect: boolean,
): ReferenceImage {
  const anchorH = ANCHOR_OF[handle]
  const anchorUnit = HANDLE_UNITS[anchorH]
  const handleUnit = HANDLE_UNITS[handle]
  const anchorWorld = handleWorldPos(start, anchorH)

  // Convert cursor delta from anchor (in world) into image-local frame:
  const invRad = (-start.rotation * Math.PI) / 180
  const dragLocal = rotatePt(
    { x: cursorWorld.x - anchorWorld.x, y: cursorWorld.y - anchorWorld.y },
    invRad,
  )

  // dragLocal = (handleUnit - anchorUnit) * (w_new, h_new)
  // → w_new = dragLocal.x / du   (if du ≠ 0)
  const du = handleUnit.x - anchorUnit.x
  const dv = handleUnit.y - anchorUnit.y
  let wNew = du !== 0 ? dragLocal.x / du : start.width
  let hNew = dv !== 0 ? dragLocal.y / dv : start.height

  // Clamp positive (don't allow drag-through-anchor flip):
  wNew = Math.max(MIN_SIZE, wNew)
  hNew = Math.max(MIN_SIZE, hNew)

  // Aspect preservation for corner handles (default behavior; shift breaks it).
  if (keepAspect && du !== 0 && dv !== 0) {
    const ratio = start.width / start.height
    if (wNew / start.width > hNew / start.height) {
      hNew = Math.max(MIN_SIZE, wNew / ratio)
    } else {
      wNew = Math.max(MIN_SIZE, hNew * ratio)
    }
  }

  // Recompute image position so the anchor stays put in world coords.
  const startRad = (start.rotation * Math.PI) / 180
  const offset = rotatePt(
    { x: (anchorUnit.x - 0.5) * wNew, y: (anchorUnit.y - 0.5) * hNew },
    startRad,
  )
  const newCenter = { x: anchorWorld.x - offset.x, y: anchorWorld.y - offset.y }

  return {
    ...start,
    x: newCenter.x - wNew / 2,
    y: newCenter.y - hNew / 2,
    width: wNew,
    height: hNew,
  }
}

export function applyRotate(
  start: ReferenceImage,
  startCursorWorld: Pt,
  cursorWorld: Pt,
  snap: boolean,
): ReferenceImage {
  const c = imageCenter(start)
  const a0 = Math.atan2(startCursorWorld.y - c.y, startCursorWorld.x - c.x)
  const a1 = Math.atan2(cursorWorld.y - c.y, cursorWorld.x - c.x)
  let next = start.rotation + ((a1 - a0) * 180) / Math.PI
  if (snap) next = Math.round(next / 15) * 15
  // Normalize to (-180, 180]:
  next = ((next + 180) % 360 + 360) % 360 - 180
  return { ...start, rotation: next }
}

// Length of the rotation handle stalk above the bounding box, in world units.
export const ROTATE_STALK_LEN = 28

export function rotateHandleWorldPos(img: ReferenceImage): Pt {
  // Top-edge midpoint, then offset outward perpendicular to the top edge.
  const topMid = localToWorld(img, img.width / 2, 0)
  // Outward direction = rotated up (-y in image-local), in world coords:
  const rad = (img.rotation * Math.PI) / 180
  const outward = rotatePt({ x: 0, y: -1 }, rad)
  return { x: topMid.x + outward.x * ROTATE_STALK_LEN, y: topMid.y + outward.y * ROTATE_STALK_LEN }
}
