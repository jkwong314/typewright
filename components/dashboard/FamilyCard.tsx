'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { getFontBinary } from '@/lib/db'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { FontFamily } from '@/lib/types'

export default function FamilyCard({ family }: { family: FontFamily }) {
  const { removeFamily } = useProjectStore()
  const { showToast } = useToast()
  const router = useRouter()
  const [fontUrl, setFontUrl] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const regular = family.styles.find((s) => s.weight === 400 && !s.italic) ?? family.styles[0]
    if (!regular) return
    let url: string | null = null
    getFontBinary(regular.sourceFontId).then((buf) => {
      if (!buf) return
      const blob = new Blob([buf], { type: 'font/opentype' })
      url = URL.createObjectURL(blob)
      setFontUrl(url)
    })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [family])

  // Reset confirm state if user moves away
  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 2500)
    return () => clearTimeout(t)
  }, [confirmDelete])

  function handleCardClick() {
    showToast(`Editing ${family.name}`, 'success')
    router.push(`/family/${family.id}`)
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    removeFamily(family.id)
    showToast(`"${family.name}" removed`, 'success')
    setConfirmDelete(false)
  }

  const fontFaceId = `family-${family.id}`

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      interactive
      className="p-5 flex flex-col gap-4 relative group outline-none"
    >
      {fontUrl && (
        <style>{`
          @font-face {
            font-family: '${fontFaceId}';
            src: url('${fontUrl}');
          }
        `}</style>
      )}

      {/* ── "In Library" badge ───────────────────────────────────────────── */}
      <Badge className="absolute top-3 left-4">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        In Library
      </Badge>

      {/* ── Remove button ─────────────────────────────────────────────────── */}
      <button
        onClick={handleRemove}
        className={`absolute top-3 right-3 rounded-md px-2 py-1 text-xs font-medium transition-all z-10 border ${
          confirmDelete
            ? 'bg-[var(--danger-soft2)] text-[var(--danger-text)] border-[var(--danger-border2)]'
            : 'bg-transparent text-[var(--muted)] border-transparent hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)] hover:border-[var(--danger-border)]'
        }`}
        title={confirmDelete ? 'Click again to confirm' : 'Remove family'}
      >
        {confirmDelete ? 'Confirm?' : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        )}
      </button>

      {/* ── Font preview ──────────────────────────────────────────────── */}
      <div
        className="text-4xl leading-none tracking-tight truncate pt-7 pb-2 text-[var(--text)]"
        style={{ fontFamily: fontUrl ? `'${fontFaceId}', serif` : 'serif' }}
      >
        Aa Bb Cc
      </div>

      {/* ── Footer row ────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate text-[var(--text)]">{family.name}</p>
          <p className="text-xs mt-0.5 text-[var(--muted)]">
            {family.styles.length} style{family.styles.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Edit indicator */}
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md shrink-0 pointer-events-none bg-[var(--surface2)] text-[var(--accent)] border border-[var(--border2)]">
          Edit
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Card>
  )
}
