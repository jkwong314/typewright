'use client'

export default function ExportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="rounded-xl p-6 w-96 shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
      >
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Export Fonts</h2>
        <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>Export pipeline coming soon.</p>
        <button
          onClick={onClose}
          className="text-xs px-4 py-2 rounded-lg transition-colors"
          style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
