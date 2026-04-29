import { NextRequest, NextResponse } from 'next/server'

let cachedFonts: any[] | null = null

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')?.toLowerCase() ?? ''

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

  const fonts = cachedFonts!
  const results = query
    ? fonts.filter((f: any) => f.family.toLowerCase().includes(query)).slice(0, 24)
    : fonts.slice(0, 24)

  return NextResponse.json(
    results.map((f: any) => ({
      family: f.family,
      variants: f.variants,
      files: f.files,
      category: f.category,
    }))
  )
}
