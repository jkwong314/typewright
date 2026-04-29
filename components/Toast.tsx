'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ToastMessage {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastMessage['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  const icons = { error: '✕', success: '✓', info: '·' }
  const colors = {
    error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  text: '#fca5a5' },
    success: { bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.2)',   text: '#86efac' },
    info:    { bg: 'var(--surface2)',        border: 'var(--border2)',         text: 'var(--text)' },
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 space-y-2 z-[100]">
        {toasts.map((t) => {
          const c = colors[t.type]
          return (
            <div
              key={t.id}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs shadow-2xl"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, backdropFilter: 'blur(8px)' }}
            >
              <span className="font-semibold">{icons[t.type]}</span>
              {t.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
