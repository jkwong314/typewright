'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { getFontBinary } from '@/lib/db'
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
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className="rounded-xl p-5 flex flex-col gap-4 cursor-pointer relative group transition-colors outline-none"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        // only reset if not hovering the delete button itself
      }}
    >
      {fontUrl && (
        <style>{`
          @font-face {
            font-family: '${fontFaceId}';
            src: url('${fontUrl}');
          }
        `}</style>
      )}

      {/* ── Remove button — top right, always visible ─────────────────── */}
      <button
        onClick={handleRemove}
        className="absolute top-3 right-3 rounded-md px-2 py-1 text-xs font-medium transition-all z-10"
        style={
          confirmDelete
            ? {
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
              }
            : {
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid transparent',
              }
        }
        title={confirmDelete ? 'Click again to confirm' : 'Remove family'}
        onMouseEnter={(e) => {
          if (!confirmDelete) {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
            e.currentTarget.style.color = '#f87171'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
          }
          e.stopPropagation()
        }}
        onMouseLeave={(e) => {
          if (!confirmDelete) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--muted)'
            e.currentTarget.style.borderColor = 'transparent'
          }
        }}
      >
        {confirmDelete ? 'Confirm?' : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        )}
      </button>

      {/* ── Font preview ──────────────────────────────────────────────── */}
      <div
        className="text-4xl leading-none tracking-tight truncate py-3"
        style={{
          fontFamily: fontUrl ? `'${fontFaceId}', serif` : 'serif',
          color: 'var(--text)',
        }}
      >
        Aa Bb Cc
      </div>

      {/* ── Footer row ────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
            {family.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {family.styles.length} style{family.styles.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Edit indicator — bottom right */}
        <div
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md shrink-0 pointer-events-none"
          style={{
            background: 'var(--surface2)',
            color: 'var(--accent)',
            border: '1px solid var(--border2)',
          }}
        >
          Edit
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
