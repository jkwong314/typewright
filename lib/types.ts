export interface BezierPoint {
  x: number
  y: number
  type: 'on' | 'off'
}

export interface Contour {
  points: BezierPoint[]
}

export interface ReferenceImage {
  id: string
  url: string                  // data URL
  visible: boolean
  opacity: number              // 0..1
  x: number                    // top-left in font units
  y: number                    // top-left in font units
  width: number                // in font units
  height: number               // in font units
  rotation: number             // degrees, clockwise in screen space
}

export interface GlyphOverride {
  unicode: string
  advanceWidth: number
  contours: Contour[]
  referenceImages?: ReferenceImage[]
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
  sourceFontId: string          // empty string = created from scratch
  metrics: FontMetrics
  kerningPairs: KerningPair[]
  glyphOverrides: Record<string, GlyphOverride>
  ligatures: Record<string, GlyphOverride>   // keyed by sequence e.g. "fi"
}

export interface FontFamily {
  id: string
  name: string
  styles: FontStyle[]
  createdFromScratch?: boolean
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
  category?: string
  subsets?: string[]
}
