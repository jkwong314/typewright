'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { useProjectStore } from '@/lib/store'
import { getFontBinary, saveFontBinary } from '@/lib/db'
import ExportModal from './ExportModal'
import { useToast } from '@/components/Toast'

export default function Sidebar() {
  const pathname = usePathname()
  const [exportOpen, setExportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const loadRef = useRef<HTMLInputElement>(null)
  const { project, loadProject } = useProjectStore()
  const { showToast } = useToast()

  async function handleSaveProject() {
    setSaving(true)
    try {
      // Embed font binaries as base64 so the .typproject file is fully portable
      const familiesWithFonts = await Promise.all(
        project.families.map(async (family) => ({
          ...family,
          styles: await Promise.all(
            family.styles.map(async (style) => {
              const buf = await getFontBinary(style.sourceFontId)
              const fontData = buf
                ? btoa(Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(''))
                : null
              return { ...style, _fontData: fontData }
            })
          ),
        }))
      )

      const json = JSON.stringify({ project: { ...project, families: familiesWithFonts } }, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const name = project.families[0]?.name ?? 'project'
      a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.typproject`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Project saved', 'success')
    } catch {
      showToast('Failed to save project', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLoadProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.project) throw new Error('Invalid project file')

      const restoredFamilies = await Promise.all(
        data.project.families.map(async (family: any) => ({
          ...family,
          styles: await Promise.all(
            family.styles.map(async (style: any) => {
              const { _fontData, ...rest } = style
              if (_fontData) {
                const binary = Uint8Array.from(atob(_fontData), (c) => c.charCodeAt(0))
                await saveFontBinary(style.sourceFontId, binary.buffer)
              }
              return rest
            })
          ),
        }))
      )

      loadProject({ families: restoredFamilies })
      showToast('Project loaded', 'success')
    } catch {
      showToast('Failed to load project file', 'error')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/library', label: 'Font Library' },
  ]

  const bottomActions = [
    { label: 'Export Fonts', action: () => setExportOpen(true), loading: false },
    { label: saving ? 'Saving…' : 'Save Project', action: handleSaveProject, loading: saving },
    { label: loading ? 'Loading…' : 'Load Project', action: () => loadRef.current?.click(), loading },
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
          {bottomActions.map(({ label, action, loading: isLoading }) => (
            <button
              key={label}
              onClick={action}
              disabled={isLoading}
              className="w-full text-left px-3 py-2 rounded-md text-xs transition-colors disabled:opacity-50 hover:text-[var(--text)] hover:bg-[var(--surface2)]"
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
