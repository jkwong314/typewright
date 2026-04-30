/**
 * Button primitive. Use this for every clickable action.
 *
 * Variants:
 *   primary  — accent fill, dark text, glow on hover. The main CTA on a screen.
 *   ghost    — transparent w/ border, muted text → text becomes accent on hover.
 *   subtle   — surface2 fill, accent text, soft border. Secondary action next to primary.
 *   danger   — red text + red border + soft red bg on hover. Destructive actions only.
 *   pill     — rounded-full filter chip; pair with `selected` prop for active state.
 *
 * Sizes:
 *   sm  — px-3 py-1.5  (toolbar/dense rows)
 *   md  — px-4 py-2    (default)
 *   lg  — px-6 py-3    (hero CTAs)
 *
 * All hover/focus is in CSS — never add onMouseEnter/Leave to a <Button>.
 */
import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'pill'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  selected?: boolean   // for pill variant
}

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-xs',
  lg: 'px-6 py-3 text-sm',
}

const VARIANT: Record<Variant, string> = {
  primary:
    'rounded-lg font-semibold ' +
    'bg-[var(--accent)] text-[#0c0c0c] shadow-[var(--accent-glow)] ' +
    'hover:bg-[var(--accent2)] hover:shadow-[var(--accent-glow-strong)]',
  ghost:
    'rounded-lg font-medium ' +
    'bg-transparent text-[var(--muted)] border border-[var(--border)] ' +
    'hover:text-[var(--text)] hover:border-[var(--accent)]',
  subtle:
    'rounded-md font-medium ' +
    'bg-[var(--surface2)] text-[var(--accent)] border border-[var(--border2)] ' +
    'hover:border-[var(--accent-border2)]',
  danger:
    'rounded-md font-medium ' +
    'bg-transparent text-[var(--danger)] border border-[var(--danger-border)] ' +
    'hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)] hover:border-[var(--danger-border2)]',
  pill:
    'rounded-full font-medium border',
}

const PILL_SELECTED   = 'bg-[var(--accent)] text-[#0c0c0c] border-[var(--accent)]'
const PILL_UNSELECTED = 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)]'

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', selected, className = '', ...rest },
  ref,
) {
  let cls = `${SIZE[size]} ${VARIANT[variant]} transition-all disabled:opacity-40 disabled:cursor-not-allowed`
  if (variant === 'pill') cls += ` ${selected ? PILL_SELECTED : PILL_UNSELECTED}`
  return <button ref={ref} className={`${cls} ${className}`.trim()} {...rest} />
})

export default Button
