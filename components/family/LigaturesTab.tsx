'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/lib/store'
import { useToast } from '@/components/Toast'
import type { FontFamily, FontStyle } from '@/lib/types'

const COMMON_LIGATURES = [
  { seq: 'fi',  label: 'fi'  },
  { seq: 'fl',  label: 'fl'  },
  { seq: 'ff',  label: 'ff'  },
  { seq: 'ffi', label: 'ffi' },
  { seq: 'ffl', label: 'ffl' },
  { seq: 'ft',  label: 'ft'  },
  { seq: 'st',  label: 'st'  },
  { seq: 'ct',  label: 'ct'  },
  { seq: 'Th',  label: 'Th'  },
  { seq: 'ae',  label: 'æ'   },
  { seq: 'oe',  label: 'œ'   },
]

interface Props {
  family: FontFamily
  style: FontStyle
}

export default function LigaturesTab({ family, style }: Props) {
  const { setLigature, removeLigature } = useProjectStore()
  const { showToast } = useToast()
  const router = useRouter()
  const [customSeq, setCustomSeq] = useState('')

  const ligatures = style.ligatures ?? {}

  function addLigature(seq: string) {
    const trimmed = seq.trim()
    if (!trimmed || trimmed.length < 2) { showToast('Sequence must be at least 2 characters', 'error'); return }
    if (ligatures[trimmed]) { showToast('Ligature already exists', 'error'); return }
    setLigature(family.id, style.id, {
      unicode: trimmed,
      advanceWidth: style.metrics.unitsPerEm / 2,
      contours: [],
    })
    showToast(`Ligature "${trimmed}" added`, 'success')
    setCustomSeq('')
  }

  function openEditor(seq: string) {
    router.push(`/family/${family.id}/ligature/${encodeURIComponent(seq)}?style=${style.id}`)
  }

  const allSeqs = Object.keys(ligatures)
  const commonMissing = COMMON_LIGATURES.filter((l) => !ligatures[l.seq])

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Existing ligatures */}
      {allSeqs.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-4" style={{ color: 'var(--muted)' }}>YOUR LIGATURES</p>
          <div className="grid grid-cols-3 gap-3">
            {allSeqs.map((seq) => {
              const lig = ligatures[seq]
              const hasContours = lig.contours.length > 0
              return (
                <div
                  key={seq}
                  className="rounded-xl p-4 flex flex-col gap-3 transition-all group"
                  style={{ background: 'var(--surface)', border: `1px solid ${hasContours ? 'var(--border2)' : 'var(--border)'}` }}
                >
                  <div className="text-3xl font-serif leading-none" style={{
                    color: hasContours ? 'var(--text)' : 'var(--muted)',
                    fontStyle: 'italic',
                  }}>
                    {seq}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{seq}</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                        {hasContours ? `${lig.contours.length} contour${lig.contours.length !== 1 ? 's' : ''}` : 'Not drawn'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditor(seq)}
                        className="text-xs px-2.5 py-1 rounded-md transition-colors"
                        style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border2)' }}
                      >Edit</button>
                      <button
                        onClick={() => { removeLigature(family.id, style.id, seq); showToast(`"${seq}" removed`, 'success') }}
                        className="text-xs px-2 py-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                      >✕</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Common suggestions */}
      {commonMissing.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>COMMON LIGATURES</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Click to add any of these standard OpenType ligatures.</p>
          <div className="flex flex-wrap gap-2">
            {commonMissing.map((l) => (
              <button
                key={l.seq}
                onClick={() => addLigature(l.seq)}
                className="px-4 py-2 rounded-lg text-sm font-serif transition-all"
                style={{
                  background: 'var(--bg)',
                  color: 'var(--muted)',
                  border: '1.5px dashed var(--border2)',
                  fontStyle: 'italic',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
              >
                {l.label}
                <span className="ml-2 text-[10px] not-italic align-middle" style={{ color: 'var(--muted)' }}>+ add</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom ligature */}
      <div>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>CUSTOM LIGATURE</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. gy, qu, tr…"
            value={customSeq}
            onChange={(e) => setCustomSeq(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLigature(customSeq)}
            maxLength={6}
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={() => addLigature(customSeq)}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--accent)', color: '#0c0c0c' }}
          >
            Add
          </button>
        </div>
      </div>

      {allSeqs.length === 0 && commonMissing.length === COMMON_LIGATURES.length && (
        <div className="text-center py-8">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            No ligatures yet. Add common ones above or define a custom sequence.
          </p>
        </div>
      )}
    </div>
  )
}
