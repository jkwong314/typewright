export interface BezierPoint {
  x: number
  y: number
  type: 'on' | 'off'
}

export interface Contour {
  points: BezierPoint[]
}

export interface GlyphOverride {
  unicode: string
  advanceWidth: number
  contours: Contour[]
}

export interface KerningPair {
  left: string
  right: string
  value: number
}

export interface FontMetrics {
  unitsPerEm: number
  ascender: number
  descender: number
  capHeight: number
  xHeight: number
  lineGap: number
}

export interface FontStyle {
  id: string
  name: string
  weight: number
  italic: boolean
  widthClass: number
  sourceFontId: string
  metrics: FontMetrics
  kerningPairs: KerningPair[]
  glyphOverrides: Record<string, GlyphOverride>
}

export interface FontFamily {
  id: string
  name: string
  styles: FontStyle[]
}

export interface Project {
  families: FontFamily[]
}

export interface ParsedGlyph {
  unicode: string
  name: string
  advanceWidth: number
  contours: Contour[]
}

export interface ParsedFont {
  familyName: string
  styleName: string
  weight: number
  italic: boolean
  metrics: FontMetrics
  glyphs: ParsedGlyph[]
}

export interface GoogleFontResult {
  family: string
  variants: string[]
  files: Record<string, string>
}
