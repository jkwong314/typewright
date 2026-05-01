'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/lib/store'
import { useToast } from '@/components/Toast'
import Button from '@/components/ui/Button'
import { newReferenceImage } from '@/lib/reference-image'
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
  const { addFamily, addStyle, setGlyphOverride } = useProjectStore()
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
  const [isDragging, setIsDragging] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

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

  // Shared file processor: validates, downscales, stores as data URL
  function processImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('That file is not an image', 'error')
      return
    }
    setRefImageName(file.name || 'pasted-image')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 1200
        const scale = img.width > maxW ? maxW / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width  = img.width  * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        setRefImage(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processImageFile(file)
    e.target.value = ''
  }

  // ── Drag & drop ─────────────────────────────────────────────────────
  function onDragEnter(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) { setIsDragging(false); dragCounter.current = 0 }
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    const file = e.dataTransfer.files?.[0]
    if (file) processImageFile(file)
  }

  // ── Clipboard paste (only while modal is open + image step) ─────────
  useEffect(() => {
    if (mode !== 'image' || step !== 'configure') return
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            processImageFile(file)
            showToast('Image pasted from clipboard', 'success')
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [mode, step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pick the natural "first" character from the selected sets
  function pickFirstChar(): string {
    if (selectedSets.has('upper')) return 'A'
    if (selectedSets.has('lower')) return 'a'
    if (selectedSets.has('nums'))  return '0'
    if (selectedSets.has('punct')) return '.'
    if (selectedSets.has('sym'))   return '@'
    return 'A'
  }

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { showToast('Enter a family name', 'error'); return }

    const familyId = addFamily(trimmed, true)
    const styleId = addStyle(familyId, {
      name: WEIGHT_OPTIONS.find((w) => w.value === weight)?.label.split('—')[1].trim() ?? 'Regular',
      weight,
      italic,
      widthClass: 5,
      sourceFontId: '',   // blank = scratch
      metrics,
    })

    // Trace-from-image flow: drop user straight into glyph editor with image loaded
    if (mode === 'image' && refImage) {
      const firstChar = pickFirstChar()
      const hex = firstChar.codePointAt(0)!.toString(16).toUpperCase()

      // Save image at family level so other glyphs in same session inherit it
      try { sessionStorage.setItem(`refimg-${familyId}`, refImage) } catch {}

      // Pre-create the override on the first glyph so the editor has it immediately
      const aw = metrics.unitsPerEm / 2
      setGlyphOverride(familyId, styleId, {
        unicode: hex,
        advanceWidth: aw,
        contours: [],
        referenceImages: [newReferenceImage(refImage, aw, metrics)],
      })

      showToast(`"${trimmed}" created — start tracing!`, 'success')
      router.push(`/family/${familyId}/glyph/${hex}?style=${styleId}`)
    } else {
      showToast(`"${trimmed}" created`, 'success')
      router.push(`/family/${familyId}`)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--overlay)' }}
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
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
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
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
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
                    <div
                      className="rounded-lg overflow-hidden relative"
                      style={{
                        border: isDragging ? '1.5px solid var(--accent)' : '1px solid var(--border2)',
                        boxShadow: isDragging ? '0 0 0 4px rgba(212,196,168,0.15)' : 'none',
                      }}
                      onDragEnter={onDragEnter}
                      onDragLeave={onDragLeave}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={refImage} alt="Reference" className="w-full max-h-40 object-contain" style={{ background: 'var(--bg)' }} />
                      {isDragging && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium pointer-events-none"
                          style={{ background: 'rgba(0,0,0,0.65)', color: 'var(--accent)' }}>
                          Drop to replace
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--muted)' }}
                        >Replace</button>
                        <button
                          onClick={() => { setRefImage(null); setRefImageName('') }}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--muted)' }}
                        >✕</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      onDragEnter={onDragEnter}
                      onDragLeave={onDragLeave}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      role="button"
                      tabIndex={0}
                      className="w-full rounded-lg py-8 flex flex-col items-center gap-2 transition-all cursor-pointer outline-none"
                      style={{
                        border: isDragging ? '1.5px solid var(--accent)' : '1.5px dashed var(--border2)',
                        background: isDragging ? 'var(--accent-soft)' : 'transparent',
                        color: isDragging ? 'var(--accent)' : 'var(--muted)',
                        boxShadow: isDragging ? '0 0 0 4px rgba(212,196,168,0.1)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (isDragging) return
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        if (isDragging) return
                        e.currentTarget.style.borderColor = 'var(--border2)'
                        e.currentTarget.style.color = 'var(--muted)'
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      <span className="text-xs font-medium">
                        {isDragging ? 'Drop image here' : 'Drag, paste, or click to upload'}
                      </span>
                      <span className="text-[10px]">
                        PNG, JPG, WEBP · or paste with <kbd className="font-mono px-1 py-0.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>⌘V</kbd>
                      </span>
                    </div>
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
                          ? { background: 'var(--accent-soft2)', color: 'var(--accent)', border: '1px solid var(--accent)' }
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
        <div className="px-7 py-4 flex items-center justify-between shrink-0 border-t border-[var(--border)]">
          <Button variant="ghost" size="md" onClick={step === 'choose' ? onClose : () => setStep('choose')}>
            {step === 'choose' ? 'Cancel' : '← Back'}
          </Button>
          {step === 'configure' && (
            <Button variant="primary" size="md" onClick={handleCreate}>
              Create Font →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
