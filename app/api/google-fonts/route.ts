import { NextRequest, NextResponse } from 'next/server'

let cachedFonts: any[] | null = null

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query      = searchParams.get('query')?.toLowerCase() ?? ''
  const sort       = searchParams.get('sort') ?? 'popularity'
  const categories = searchParams.get('categories') ?? ''
  const subset     = searchParams.get('subset') ?? ''
  const minStyles  = parseInt(searchParams.get('minStyles') ?? '1', 10)

  if (!cachedFonts) {
    const key = process.env.GOOGLE_FONTS_API_KEY
    if (!key || key === 'your_key_here') {
      return NextResponse.json({ error: 'Google Fonts API key not configured' }, { status: 503 })
    }
    const res = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${key}&sort=popularity`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch fonts' }, { status: 502 })
    const data = await res.json()
    cachedFonts = data.items ?? []
  }

  let fonts: any[] = [...cachedFonts!]

  // Text search
  if (query) {
    fonts = fonts.filter((f) => f.family.toLowerCase().includes(query))
  }

  // Category filter (comma-separated list)
  if (categories) {
    const cats = categories.split(',').filter(Boolean)
    if (cats.length > 0) fonts = fonts.filter((f) => cats.includes(f.category))
  }

  // Subset / language filter
  if (subset) {
    fonts = fonts.filter((f) => Array.isArray(f.subsets) && f.subsets.includes(subset))
  }

  // Minimum number of styles
  if (minStyles > 1) {
    fonts = fonts.filter((f) => f.variants.length >= minStyles)
  }

  // Sort (cached list is already popularity order)
  if (sort === 'alpha') {
    fonts = [...fonts].sort((a, b) => a.family.localeCompare(b.family))
  } else if (sort === 'date') {
    fonts = [...fonts].sort((a, b) =>
      (b.lastModified ?? '').localeCompare(a.lastModified ?? '')
    )
  }
  // 'popularity' and 'trending' use the default cached order

  return NextResponse.json(
    fonts.slice(0, 48).map((f) => ({
      family:   f.family,
      variants: f.variants,
      files:    f.files,
      category: f.category,
      subsets:  f.subsets,
    }))
  )
}
