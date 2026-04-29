'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { useProjectStore } from '@/lib/store'
import ExportModal from './ExportModal'
import type { Project } from '@/lib/types'

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
      <aside className="w-56 h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0 z-10">
        <div className="px-4 py-5 border-b border-gray-700">
          <span className="text-sm font-semibold tracking-widest uppercase text-gray-300">
            Typewright
          </span>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navLinks.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded text-sm transition-colors ${
                  active
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-2 py-4 border-t border-gray-700 space-y-1">
          <button
            onClick={() => setExportOpen(true)}
            className="w-full text-left px-3 py-2 rounded text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Export Fonts
          </button>
          <button
            onClick={handleSaveProject}
            className="w-full text-left px-3 py-2 rounded text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Save Project
          </button>
          <button
            onClick={() => loadRef.current?.click()}
            className="w-full text-left px-3 py-2 rounded text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Load Project
          </button>
          <input
            ref={loadRef}
            type="file"
            accept=".typproject"
            className="hidden"
            onChange={handleLoadProject}
          />
        </div>
      </aside>

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </>
  )
}
