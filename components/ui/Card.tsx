/**
 * Card primitive. Use for any boxed container with surface bg + border.
 *
 * Variants:
 *   surface  — solid surface bg + soft border (the default — for static panels).
 *   dashed   — transparent bg + dashed border (for empty states / drop zones).
 *
 * Props:
 *   interactive — adds clickable styling: cursor + hover ring (border becomes accent).
 *                 Use this for cards that are buttons (e.g. FamilyCard).
 *   active      — for dashed variant: shows the "drop active" / selected state.
 *
 * Hover behavior is in CSS — do not attach onMouseEnter/Leave to a <Card>.
 * If you need a non-card clickable, use <Button>; if you need exotic styling,
 * compose with `className` (Tailwind classes win — never inline `style` for color).
 */
import type { HTMLAttributes } from 'react'

type Variant = 'surface' | 'dashed'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  interactive?: boolean
  active?: boolean
  as?: 'div' | 'section' | 'article'
}

const BASE = 'rounded-xl'

const VARIANT: Record<Variant, string> = {
  surface: 'bg-[var(--surface)] border border-[var(--border2)]',
  dashed:  'bg-transparent border-[1.5px] border-dashed border-[var(--border2)]',
}

const INTERACTIVE = 'cursor-pointer transition-all hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_var(--accent)]'

const ACTIVE_DASHED = 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_4px_var(--accent-soft2)]'

export default function Card({
  variant = 'surface',
  interactive = false,
  active = false,
  as = 'div',
  className = '',
  ...rest
}: CardProps) {
  const Tag = as
  let cls = `${BASE} ${VARIANT[variant]}`
  if (interactive)             cls += ` ${INTERACTIVE}`
  if (active && variant === 'dashed') cls += ` ${ACTIVE_DASHED}`
  return <Tag className={`${cls} ${className}`.trim()} {...rest} />
}
