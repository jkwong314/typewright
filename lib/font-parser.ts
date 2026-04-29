import type { Contour, BezierPoint, ParsedFont, ParsedGlyph, FontMetrics } from './types'

// opentype.js is loaded dynamically to avoid SSR issues
async function getOpentype() {
  const opentype = await import('opentype.js')
  return opentype.default ?? opentype
}

export async function parseFont(buffer: ArrayBuffer): Promise<ParsedFont> {
  const opentype = await getOpentype()
  const font = opentype.parse(buffer)

  const os2 = font.tables.os2
  const metrics: FontMetrics = {
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    capHeight: os2?.sCapHeight ?? Math.round(font.unitsPerEm * 0.7),
    xHeight: os2?.sxHeight ?? Math.round(font.unitsPerEm * 0.5),
    lineGap: font.tables.hhea?.lineGap ?? 0,
  }

  const glyphs: ParsedGlyph[] = []

  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i)
    if (!glyph || glyph.unicode === undefined) continue

    const unicode = glyph.unicode.toString(16).padStart(4, '0').toUpperCase()
    glyphs.push({
      unicode,
      name: glyph.name ?? '',
      advanceWidth: glyph.advanceWidth ?? 0,
      contours: glyphToContours(glyph),
    })
  }

  const nameTable = font.names as any
  const familyName =
    nameTable.preferredFamily?.en ??
    nameTable.fontFamily?.en ??
    'Unknown Family'
  const styleName =
    nameTable.preferredSubfamily?.en ??
    nameTable.fontSubfamily?.en ??
    'Regular'

  const weight = os2?.usWeightClass ?? inferWeight(styleName)
  const italic =
    (os2?.fsSelection & 1) === 1 ||
    styleName.toLowerCase().includes('italic') ||
    styleName.toLowerCase().includes('oblique')

  return { familyName, styleName, weight, italic, metrics, glyphs }
}

function glyphToContours(glyph: any): Contour[] {
  const contours: Contour[] = []
  if (!glyph.path?.commands?.length) return contours

  let current: BezierPoint[] = []

  for (const cmd of glyph.path.commands) {
    switch (cmd.type) {
      case 'M':
        if (current.length) contours.push({ points: current })
        current = [{ x: cmd.x, y: cmd.y, type: 'on' }]
        break
      case 'L':
        current.push({ x: cmd.x, y: cmd.y, type: 'on' })
        break
      case 'C':
        // cubic bezier: two off-curve handles then on-curve
        current.push({ x: cmd.x1, y: cmd.y1, type: 'off' })
        current.push({ x: cmd.x2, y: cmd.y2, type: 'off' })
        current.push({ x: cmd.x, y: cmd.y, type: 'on' })
        break
      case 'Q':
        // quadratic bezier: one off-curve handle then on-curve
        current.push({ x: cmd.x1, y: cmd.y1, type: 'off' })
        current.push({ x: cmd.x, y: cmd.y, type: 'on' })
        break
      case 'Z':
        if (current.length) contours.push({ points: current })
        current = []
        break
    }
  }

  if (current.length) contours.push({ points: current })
  return contours
}

export function contoursToPathD(contours: Contour[]): string {
  if (!contours.length) return ''

  const parts: string[] = []

  for (const contour of contours) {
    const pts = contour.points
    if (!pts.length) continue

    let i = 0
    // find first on-curve point to start
    const start = pts.find((p) => p.type === 'on') ?? pts[0]
    parts.push(`M ${start.x} ${start.y}`)

    while (i < pts.length) {
      const pt = pts[i]
      if (pt.type === 'on') {
        if (i > 0) parts.push(`L ${pt.x} ${pt.y}`)
        i++
      } else if (pt.type === 'off') {
        const next = pts[i + 1]
        const after = pts[i + 2]
        if (next?.type === 'off' && after) {
          // cubic
          parts.push(`C ${pt.x} ${pt.y} ${next.x} ${next.y} ${after.x} ${after.y}`)
          i += 3
        } else if (next) {
          // quadratic
          parts.push(`Q ${pt.x} ${pt.y} ${next.x} ${next.y}`)
          i += 2
        } else {
          i++
        }
      } else {
        i++
      }
    }

    parts.push('Z')
  }

  return parts.join(' ')
}

function inferWeight(styleName: string): number {
  const s = styleName.toLowerCase()
  if (s.includes('thin')) return 100
  if (s.includes('extralight') || s.includes('extra light')) return 200
  if (s.includes('light')) return 300
  if (s.includes('medium')) return 500
  if (s.includes('semibold') || s.includes('semi bold')) return 600
  if (s.includes('extrabold') || s.includes('extra bold')) return 800
  if (s.includes('black') || s.includes('heavy')) return 900
  if (s.includes('bold')) return 700
  return 400
}
