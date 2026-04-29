'use client'

import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/lib/store'
import FamilyCard from '@/components/dashboard/FamilyCard'

export default function DashboardPage() {
  const { project, addFamily } = useProjectStore()
  const router = useRouter()

  function handleNewFamily() {
    const name = prompt('Family name:')
    if (!name?.trim()) return
    const id = addFamily(name.trim())
    router.push(`/family/${id}`)
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {project.families.length} {project.families.length === 1 ? 'family' : 'families'}
          </p>
        </div>
        <button
          onClick={handleNewFamily}
          className="text-xs px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#0c0c0c' }}
        >
          + New Family
        </button>
      </div>

      {/* Family grid */}
      {project.families.length === 0 ? (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-24 gap-4"
          style={{ border: '1.5px dashed var(--border2)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>No families yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Go to Font Library to import a font, or create a new family above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.families.map((family) => (
            <FamilyCard key={family.id} family={family} />
          ))}
        </div>
      )}
    </div>
  )
}
