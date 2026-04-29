'use client'

export default function ExportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Export Fonts</h2>
        <p className="text-sm text-gray-500 mb-6">Export pipeline coming in Phase 8.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
