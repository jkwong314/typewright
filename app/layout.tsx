import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'Typewright',
  description: 'Create and edit custom typefaces',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">
        <ToastProvider>
          <Sidebar />
          <main className="ml-56 min-h-screen">{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}
