'use client'

import { useState } from 'react'
import { useProjectStore } from '@/lib/store'
import type { FontFamily, FontStyle } from '@/lib/types'

interface Props {
  family: FontFamily
  style: FontStyle
}

export default function KerningTab({ family, style }: Props) {
  const { setKerningPair, removeKerningPair } = useProjectStore()
  const [pair, setPair] = useState('')
  const [value, setValue] = useState('0')
  const [filter, setFilter] = useState('')

  function handleAdd() {
    const chars = pair.replace(/\s/g, '')
    if (chars.length < 2) return
    const left = chars[0].codePointAt(0)!.toString(16).toUpperCase()
    const right = chars[1].codePointAt(0)!.toString(16).toUpperCase()
    setKerningPair(family.id, style.id, { left, right, value: Number(value) })
    setPair('')
    setValue('0')
  }

  const pairs = style.kerningPairs.filter((p) => {
    if (!filter) return true
    const leftChar = String.fromCodePoint(parseInt(p.left, 16))
    const rightChar = String.fromCodePoint(parseInt(p.right, 16))
    return `${leftChar}${rightChar}`.includes(filter)
  })

  return (
    <div className="space-y-6 max-w-lg">
      {/* Add pair */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>ADD PAIR</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Characters</label>
            <input
              value={pair}
              onChange={(e) => setPair(e.target.value.slice(0, 2))}
              placeholder="AV"
              maxLength={2}
              className="w-full rounded-md px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', letterSpacing: '0.15em' }}
            />
          </div>
          <div className="w-28">
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Value (units)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-xs outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={pair.length < 2}
            className="px-4 py-2 rounded-md text-xs font-medium disabled:opacity-40 transition-opacity shrink-0"
            style={{ background: 'var(--accent)', color: '#0c0c0c' }}
          >
            Add
          </button>
        </div>

        {pair.length >= 2 && (
          <div className="flex items-center gap-4 pt-1">
            <span className="text-3xl" style={{ color: 'var(--text)' }}>
              {pair[0]}<span style={{ letterSpacing: `${Number(value) / 20}px` }}>{pair[1]}</span>
            </span>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {Number(value) > 0 ? 'space added' : Number(value) < 0 ? 'tightened' : 'no change'}
            </p>
          </div>
        )}
      </div>

      {/* Pair table */}
      {style.kerningPairs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              {style.kerningPairs.length} PAIR{style.kerningPairs.length !== 1 ? 'S' : ''}
            </p>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="rounded-md px-2.5 py-1 text-xs outline-none w-32"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {pairs.map((p, i) => {
              const leftChar = String.fromCodePoint(parseInt(p.left, 16))
              const rightChar = String.fromCodePoint(parseInt(p.right, 16))
              return (
                <div
                  key={`${p.left}-${p.right}`}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    background: i % 2 === 0 ? 'var(--surface)' : 'transparent',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span className="text-base font-mono" style={{ color: 'var(--text)', letterSpacing: 2 }}>
                    {leftChar}{rightChar}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                      {p.value > 0 ? '+' : ''}{p.value}
                    </span>
                    <button
                      onClick={() => removeKerningPair(family.id, style.id, p.left, p.right)}
                      className="text-xs transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {style.kerningPairs.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>No kerning pairs yet.</p>
      )}
    </div>
  )
}
