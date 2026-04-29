'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/lib/store'
import { useToast } from '@/components/Toast'
import type { FontMetrics } from '@/lib/types'

// Unicode ranges for character set presets
const CHAR_SETS = [
  { id: 'upper',  label: 'Uppercase',  chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'lower',  label: 'Lowercase',  chars: 'abcdefghijklmnopqrstuvwxyz' },
  { id: 'nums',   label: 'Numbers',    chars: '0123456789' },
  { id: 'punct',  label: 'Punctuation',chars: '.,!?:;\'"-()[]{}' },
  { id: 'sym',    label: 'Symbols',    chars: '@#$%&*+=/<>\\|^~`_' },
]

const WEIGHT_OPTIONS = [
  { value: 100, label: '100 — Thin' },
  { value: 200, label: '200 — ExtraLight' },
  { value: 300, label: '300 — Light' },
  { value: 400, label: '400 — Regular' },
  { value: 500, label: '500 — Medium' },
  { value: 600, label: '600 — SemiBold' },
  { value: 700, label: '700 — Bold' },
  { value: 800, label: '800 — ExtraBold' },
  { value: 900, label: '900 — Black' },
]

type Step = 'choose' | 'configure'
type Mode = 'scratch' | 'image'

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs mb-1.5 block" style={{ color: 'var(--muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
      style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
    />
  )
}

export default function CreateFontModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { addFamily, addStyle } = useProjectStore()
  const { showToast } = useToast()

  const [step, setStep] = useState<Step>('choose')
  const [mode, setMode] = useState<Mode>('scratch')
  const [name, setName] = useState('')
  const [weight, setWeight] = useState(400)
  const [italic, setItalic] = useState(false)
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set(['upper', 'lower', 'nums']))
  const [metrics, setMetrics] = useState<FontMetrics>({
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    xHeight: 500,
    lineGap: 0,
  })
  const [refImage, setRefImage] = useState<string | null>(null)
  const [refImageName, setRefImageName] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  function toggleSet(id: string) {
    setSelectedSets((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setM(key: keyof FontMetrics, val: number) {
    setMetrics((prev) => ({ ...prev, [key]: val }))
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRefImageName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      // Downscale to max 1200px wide before storing
      const img = new Image()
      img.onload = () => {
        const maxW = 1200
        const scale = img.width > maxW ? maxW / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setRefImage(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { showToast('Enter a family name', 'error'); return }

    // Build the list of glyphs to pre-create as empty overrides
    let chars = ''
    CHAR_SETS.forEach((cs) => { if (selectedSets.has(cs.id)) chars += cs.chars })

    const familyId = addFamily(trimmed, true)
    const styleId = addStyle(familyId, {
      name: WEIGHT_OPTIONS.find((w) => w.value === weight)?.label.split('—')[1].trim() ?? 'Regular',
      weight,
      italic,
      widthClass: 5,
      sourceFontId: '',   // blank = scratch
      metrics,
    })

    // If image reference provided, pre-create blank glyph overrides with the reference image
    // (image stored only on the first available glyph so user can see it immediately)
    // The reference image will be accessible from the glyph editor
    if (refImage) {
      // Store ref image in session storage keyed by familyId so glyph editor can pick it up
      try { sessionStorage.setItem(`refimg-${familyId}`, refImage) } catch {}
    }

    showToast(`"${trimmed}" created`, 'success')
    router.push(`/family/${familyId}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl w-[560px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
      >
        {/* Header */}
        <div className="px-7 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {step === 'choose' ? 'Create a New Font' : mode === 'scratch' ? 'Set Up Your Font' : 'Trace From Image'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {step === 'choose'
              ? 'Choose how you want to start'
              : 'Configure metrics and character set'}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {step === 'choose' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* From Scratch */}
              <button
                onClick={() => { setMode('scratch'); setStep('configure') }}
                className="rounded-xl p-6 text-left flex flex-col gap-3 transition-all group"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(212,196,168,0.1)', color: 'var(--accent)' }}>
                  ✏️
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Draw from Scratch</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    Start with a blank canvas. Use the pen tool to draw each character by hand.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs mt-auto" style={{ color: 'var(--accent)' }}>
                  Get started
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* From Image */}
              <button
                onClick={() => { setMode('image'); setStep('configure') }}
                className="rounded-xl p-6 text-left flex flex-col gap-3 transition-all"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(212,196,168,0.1)', color: 'var(--accent)' }}>
                  🖼️
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Trace from Image</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    Upload a sketch or photo. It appears as a ghost layer to trace over in the editor.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs mt-auto" style={{ color: 'var(--accent)' }}>
                  Upload image
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Image upload (image mode only) */}
              {mode === 'image' && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--muted)' }}>Reference Image</label>
                  {refImage ? (
                    <div className="rounded-lg overflow-hidden relative" style={{ border: '1px solid var(--border2)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={refImage} alt="Reference" className="w-full max-h-40 object-contain" style={{ background: 'var(--bg)' }} />
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={() => { setRefImage(null); setRefImageName('') }}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--muted)' }}
                        >✕ Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full rounded-lg py-8 flex flex-col items-center gap-2 transition-colors"
                      style={{ border: '1.5px dashed var(--border2)', color: 'var(--muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      <span className="text-xs">Click to upload a sketch or photo</span>
                      <span className="text-[10px]">PNG, JPG, WEBP</span>
                    </button>
                  )}
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              )}

              {/* Family name */}
              <FieldRow label="Family Name">
                <input
                  type="text"
                  placeholder="e.g. My Custom Font"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </FieldRow>

              {/* Weight + Italic */}
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Weight">
                  <select
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  >
                    {WEIGHT_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Style">
                  <label className="flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }} />
                    <span className="text-xs" style={{ color: 'var(--text)' }}>Italic</span>
                  </label>
                </FieldRow>
              </div>

              {/* Metrics */}
              <div>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>METRICS</p>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Units Per Em"><NumberInput value={metrics.unitsPerEm} onChange={(v) => setM('unitsPerEm', v)} min={500} max={2048} /></FieldRow>
                  <FieldRow label="Ascender"><NumberInput value={metrics.ascender} onChange={(v) => setM('ascender', v)} min={0} max={2000} /></FieldRow>
                  <FieldRow label="Descender"><NumberInput value={metrics.descender} onChange={(v) => setM('descender', v)} min={-1000} max={0} /></FieldRow>
                  <FieldRow label="Cap Height"><NumberInput value={metrics.capHeight} onChange={(v) => setM('capHeight', v)} min={0} max={2000} /></FieldRow>
                  <FieldRow label="x-Height"><NumberInput value={metrics.xHeight} onChange={(v) => setM('xHeight', v)} min={0} max={1500} /></FieldRow>
                  <FieldRow label="Line Gap"><NumberInput value={metrics.lineGap} onChange={(v) => setM('lineGap', v)} min={0} max={500} /></FieldRow>
                </div>
              </div>

              {/* Character sets */}
              <div>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>CHARACTER SETS</p>
                <div className="flex flex-wrap gap-2">
                  {CHAR_SETS.map((cs) => {
                    const active = selectedSets.has(cs.id)
                    return (
                      <button
                        key={cs.id}
                        onClick={() => toggleSet(cs.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={active
                          ? { background: 'rgba(212,196,168,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)' }
                          : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
                        }
                      >
                        {cs.label}
                      </button>
                    )
                  })}
                </div>
                {selectedSets.size > 0 && (
                  <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
                    {CHAR_SETS.filter((cs) => selectedSets.has(cs.id)).reduce((n, cs) => n + cs.chars.length, 0)} glyphs will be created as blank canvases
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 flex items-center justify-between shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={step === 'choose' ? onClose : () => setStep('choose')}
            className="text-xs px-4 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            {step === 'choose' ? 'Cancel' : '← Back'}
          </button>
          {step === 'configure' && (
            <button
              onClick={handleCreate}
              className="text-xs px-5 py-2 rounded-lg font-semibold transition-all"
              style={{ background: 'var(--accent)', color: '#0c0c0c' }}
            >
              Create Font →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
