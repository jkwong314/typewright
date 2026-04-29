'use client'

import { useState } from 'react'
import UploadTab from '@/components/library/UploadTab'
import GoogleFontsTab from '@/components/library/GoogleFontsTab'

const tabs = ['Upload', 'Google Fonts']

export default function LibraryPage() {
  const [active, setActive] = useState(0)

  return (
    <div className="min-h-screen p-8 max-w-3xl">
      <h1 className="text-lg font-semibold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
        Font Library
      </h1>
      <p className="text-xs mb-8" style={{ color: 'var(--muted)' }}>
        Upload your own fonts or import from Google Fonts to use as a base.
      </p>

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--surface)' }}>
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            style={active === i
              ? { background: 'var(--surface2)', color: 'var(--text)' }
              : { color: 'var(--muted)' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {active === 0 ? <UploadTab /> : <GoogleFontsTab />}
    </div>
  )
}
