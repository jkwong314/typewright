'use client'

import { useState } from 'react'
import { useProjectStore } from '@/lib/store'
import FamilyCard from '@/components/dashboard/FamilyCard'
import FontRecommendations from '@/components/dashboard/FontRecommendations'
import CreateFontModal from '@/components/CreateFontModal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function DashboardPage() {
  const { project } = useProjectStore()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="min-h-screen p-8 max-w-[1600px]">

      {/* ── Hero CTA ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-8 py-7 mb-10 flex items-center justify-between gap-6 relative overflow-hidden border border-[var(--accent-border)]"
        style={{ background: 'linear-gradient(135deg, rgba(212,196,168,0.12) 0%, rgba(212,196,168,0.04) 100%)' }}
      >
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none font-bold select-none pointer-events-none text-[rgba(212,196,168,0.06)]"
          style={{ fontFamily: 'serif' }}
          aria-hidden
        >Aa</div>

        <div className="relative z-10">
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 text-[var(--accent)]">
            Typewright
          </p>
          <h1 className="text-xl font-semibold tracking-tight mb-1.5 text-[var(--text)]">
            Create your own typeface
          </h1>
          <p className="text-xs max-w-sm leading-relaxed text-[var(--muted)]">
            Draw from scratch with the pen tool, trace from an image reference, define metrics, design ligatures, and export in WOFF2, TTF, or OTF.
          </p>
        </div>

        <Button variant="primary" size="lg" className="shrink-0 relative z-10" onClick={() => setCreateOpen(true)}>
          + Create New Font
        </Button>
      </div>

      {/* ── Your Library ─────────────────────────────────────────────────── */}
      {project.families.length > 0 && (
        <section className="mb-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Your Library</h2>
              <p className="text-xs mt-0.5 text-[var(--muted)]">
                {project.families.length} {project.families.length === 1 ? 'family' : 'families'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {project.families.map((family) => (
              <FamilyCard key={family.id} family={family} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no families yet */}
      {project.families.length === 0 && (
        <Card variant="dashed" className="flex flex-col items-center justify-center py-16 gap-3 mb-4">
          <p className="text-xs font-medium text-[var(--text)]">No fonts yet</p>
          <p className="text-xs text-center max-w-xs text-[var(--muted)]">
            Create your first font above, or import one from the Font Library.
          </p>
          <Button variant="ghost" size="sm" className="mt-2 text-[var(--accent)] border-[var(--border2)]" onClick={() => setCreateOpen(true)}>
            + Create New Font
          </Button>
        </Card>
      )}

      {/* ── Discover ─────────────────────────────────────────────────────── */}
      <FontRecommendations />

      {createOpen && <CreateFontModal onClose={() => setCreateOpen(false)} />}
    </div>
  )
}
