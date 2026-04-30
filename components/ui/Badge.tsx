/**
 * Badge primitive — small pill labels like "In Library" or "scratch".
 *
 * Variants:
 *   accent  — accent-soft bg, accent text, accent border. Default.
 *   muted   — subtle surface2 bg, muted text. For metadata tags.
 */
import type { HTMLAttributes } from 'react'

type Variant = 'accent' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

const VARIANT: Record<Variant, string> = {
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)]',
  muted:  'bg-[var(--surface2)]    text-[var(--muted)]  border-[var(--border)]',
}

export default function Badge({ variant = 'accent', className = '', ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${VARIANT[variant]} ${className}`.trim()}
      {...rest}
    />
  )
}
