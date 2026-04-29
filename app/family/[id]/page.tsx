'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/store'
import StylePanel from '@/components/family/StylePanel'
import MetricsTab from '@/components/family/MetricsTab'
import KerningTab from '@/components/family/KerningTab'
import GlyphsTab from '@/components/family/GlyphsTab'
import LigaturesTab from '@/components/family/LigaturesTab'

const TABS = ['Metrics', 'Kerning', 'Glyphs', 'Ligatures']

export default function FamilyEditorPage({ params }: { params: { id: string } }) {
  const { project } = useProjectStore()
  const family = project.families.find((f) => f.id === params.id)
  const [activeStyleId, setActiveStyleId] = useState<string | null>(
    () => family?.styles[0]?.id ?? null
  )
  const [tab, setTab] = useState(0)

  if (!family) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Family not found.</p>
        <Link href="/" className="text-xs mt-2 block" style={{ color: 'var(--accent)' }}>← Back to dashboard</Link>
      </div>
    )
  }

  const activeStyle = family.styles.find((s) => s.id === activeStyleId) ?? null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Style panel */}
      <div className="w-52 shrink-0 h-full overflow-y-auto" style={{ background: 'var(--surface)' }}>
        <StylePanel
          family={family}
          activeStyleId={activeStyleId}
          onSelectStyle={(id) => { setActiveStyleId(id); setTab(0) }}
        />
      </div>

      {/* Main editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb + tabs */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            <Link href="/" className="hover:text-[var(--text)] transition-colors">Dashboard</Link>
            <span>/</span>
            <span style={{ color: 'var(--text)' }}>{family.name}</span>
            {activeStyle && (
              <>
                <span>/</span>
                <span style={{ color: 'var(--text)' }}>{activeStyle.name}</span>
              </>
            )}
          </div>

          {activeStyle && (
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                  style={
                    tab === i
                      ? { background: 'var(--surface2)', color: 'var(--text)' }
                      : { color: 'var(--muted)' }
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab content — metrics fills full height; others scroll */}
        <div className={`flex-1 p-6 ${tab === 0 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {!activeStyle ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Select a style to start editing, or go to{' '}
              <Link href="/library" style={{ color: 'var(--accent)' }}>Font Library</Link> to import one.
            </p>
          ) : tab === 0 ? (
            <MetricsTab family={family} style={activeStyle} />
          ) : tab === 1 ? (
            <KerningTab family={family} style={activeStyle} />
          ) : tab === 2 ? (
            <GlyphsTab family={family} style={activeStyle} />
          ) : (
            <LigaturesTab family={family} style={activeStyle} />
          )}
        </div>
      </div>
    </div>
  )
}
