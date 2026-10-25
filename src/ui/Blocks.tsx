import { CheckCircle, Info, TrayArrowDown, Warning, WarningOctagon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { ApiError, messageOf } from '../api/client'
import { cx } from '../lib/cx'

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page__head">
      <div className="page__title">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page__actions">{actions}</div>}
    </header>
  )
}

export function Panel({ title, description, actions, children, flush, className }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section className={cx('panel', flush && 'panel--flush', className)}>
      {(title || actions) && (
        <div className="panel__head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cx('panel__body', title && !flush && 'panel__body--tight')}>{children}</div>
    </section>
  )
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__title">
        <h3>{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([label, value]) => (
        <div key={label} style={{ display: 'contents' }}>
          <dt>{label}</dt>
          <dd>{value === null || value === undefined || value === '' ? <span className="muted">Not set</span> : value}</dd>
        </div>
      ))}
    </dl>
  )
}

const ALERT_ICON = { ok: CheckCircle, info: Info, warn: Warning, bad: WarningOctagon } as const

export function Alert({ tone = 'info', title, children, action }: { tone?: keyof typeof ALERT_ICON; title?: string; children?: ReactNode; action?: ReactNode }) {
  const Icon = ALERT_ICON[tone]
  return (
    <div className={cx('alert', `alert--${tone}`)} role={tone === 'bad' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden="true" />
      <div className="alert__body">
        {title && <span className="alert__title">{title}</span>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  )
}

/** The failure of a query, with a way to try again. */
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403
  return (
    <Alert
      tone="bad"
      title={forbidden ? 'Not allowed' : 'Could not load this'}
      action={
        retry && !forbidden ? (
          <button type="button" className="link-btn" onClick={retry}>
            Try again
          </button>
        ) : undefined
      }
    >
      {messageOf(error)}
    </Alert>
  )
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon ?? <TrayArrowDown size={40} aria-hidden="true" />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Skeleton({ height = '1rem', width = '100%' }: { height?: string; width?: string }) {
  return <span className="skeleton" style={{ height, width }} aria-hidden="true" />
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-rows" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height="1.5rem" width={`${90 - (index % 3) * 12}%`} />
      ))}
    </div>
  )
}
