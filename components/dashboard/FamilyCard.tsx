'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectStore } from '@/lib/store'
import { getFontBinary } from '@/lib/db'
import type { FontFamily } from '@/lib/types'

export default function FamilyCard({ family }: { family: FontFamily }) {
  const { removeFamily } = useProjectStore()
  const [fontUrl, setFontUrl] = useState<string | null>(null)

  useEffect(() => {
    const regular = family.styles.find((s) => s.weight === 400 && !s.italic) ?? family.styles[0]
    if (!regular) return
    getFontBinary(regular.sourceFontId).then((buf) => {
      if (!buf) return
      const blob = new Blob([buf], { type: 'font/opentype' })
      const url = URL.createObjectURL(blob)
      setFontUrl(url)
    })
    return () => { if (fontUrl) URL.revokeObjectURL(fontUrl) }
  }, [family])

  const fontFaceId = `family-${family.id}`

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 group"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {fontUrl && (
        <style>{`
          @font-face {
            font-family: '${fontFaceId}';
            src: url('${fontUrl}');
          }
        `}</style>
      )}

      {/* Preview */}
      <div
        className="text-4xl leading-none tracking-tight truncate py-2"
        style={{
          fontFamily: fontUrl ? `'${fontFaceId}', serif` : 'serif',
          color: 'var(--text)',
        }}
      >
        Aa Bb Cc
      </div>

      {/* Meta */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/family/${family.id}`}>
            <p className="text-xs font-semibold truncate hover:underline" style={{ color: 'var(--text)' }}>
              {family.name}
            </p>
          </Link>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {family.styles.length} style{family.styles.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link
            href={`/family/${family.id}`}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            Edit
          </Link>
          <button
            onClick={() => {
              if (confirm(`Delete "${family.name}"?`)) removeFamily(family.id)
            }}
            className="text-xs px-3 py-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
