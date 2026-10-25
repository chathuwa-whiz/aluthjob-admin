import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../lib/cx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet-danger'
  size?: 'md' | 'sm'
  icon?: ReactNode
  loading?: boolean
  block?: boolean
  ref?: Ref<HTMLButtonElement>
}

/** A button with an optional leading icon. `loading` shows a spinner and blocks repeat clicks. */
export function Button({ variant = 'secondary', size = 'md', icon, loading, block, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  const iconOnly = !children && Boolean(icon)

  return (
    <button
      type={type}
      className={cx('btn', variant !== 'secondary' && `btn--${variant}`, size === 'sm' && 'btn--sm', iconOnly && 'btn--icon', block && 'btn--block', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}
