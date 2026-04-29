'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { useProjectStore } from '@/lib/store'
import ExportModal from './ExportModal'

export default function Sidebar() {
  const pathname = usePathname()
  const [exportOpen, setExportOpen] = useState(false)
  const loadRef = useRef<HTMLInputElement>(null)
  const { project, loadProject } = useProjectStore()

  function handleSaveProject() {
    const json = JSON.stringify({ project }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project.typproject'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleLoadProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.project) loadProject(data.project)
      } catch {
        alert('Invalid project file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/library', label: 'Font Library' },
  ]

  return (
    <>
      <aside
        className="w-52 h-screen fixed left-0 top-0 z-20 flex flex-col"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)' }}>
            Typewright
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center px-3 py-2 rounded-md text-xs transition-colors"
                style={active
                  ? { background: 'var(--surface2)', color: 'var(--text)' }
                  : { color: 'var(--muted)' }
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Export Fonts', action: () => setExportOpen(true) },
            { label: 'Save Project', action: handleSaveProject },
            { label: 'Load Project', action: () => loadRef.current?.click() },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full text-left px-3 py-2 rounded-md text-xs transition-colors hover:text-[var(--text)] hover:bg-[var(--surface2)]"
              style={{ color: 'var(--muted)' }}
            >
              {label}
            </button>
          ))}
          <input ref={loadRef} type="file" accept=".typproject" className="hidden" onChange={handleLoadProject} />
        </div>
      </aside>

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </>
  )
}
