'use client'

export default function GlyphEditorPage({
  params,
}: {
  params: { id: string; unicode: string }
}) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Glyph Editor</h1>
      <p className="text-gray-500 mt-1 text-sm">
        Family: {params.id} — Glyph: U+{params.unicode}
      </p>
    </div>
  )
}
