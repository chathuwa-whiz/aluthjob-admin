import { ArrowRight, CheckCircle, Info, Warning, WarningOctagon } from '@phosphor-icons/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAudit, useOverview, useSystem } from '../api/queries'
import type { Overview as OverviewData, SystemInfo } from '../api/types'
import { actionLabel, formatNumber, plural, SOURCE_LABEL, timeAgo } from '../lib/format'
import { useNow, usePageTitle } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { ErrorState, PageHeader, Panel, Skeleton } from '../ui/Blocks'
import { DailyBars, ShareBar } from '../ui/Charts'
import { Segmented } from '../ui/Seg'

type Series = 'signups' | 'jobs' | 'matches' | 'sent'
const SERIES: { value: Series; label: string; noun: string }[] = [
  { value: 'jobs', label: 'New vacancies', noun: 'new vacancies' },
  { value: 'signups', label: 'Sign-ups', noun: 'sign-ups' },
  { value: 'matches', label: 'Matches', noun: 'matches created' },
  { value: 'sent', label: 'Sent', noun: 'applications sent' },
]

interface Attention {
  id: string
  tone: 'bad' | 'warn' | 'info'
  title: string
  detail: string
  to?: string
}

/** Everything the operator should look at, worst first. Built only from numbers the server already reports. */
function attentionFor(overview: OverviewData, system: SystemInfo | undefined, now: number): Attention[] {
  const items: Attention[] = []
  const failed = overview.applications.failed ?? 0
  const queued = overview.applications.queued ?? 0

  if (system && !system.database.ok) items.push({ id: 'db', tone: 'bad', title: 'The database cannot be reached', detail: system.database.error ?? 'Check the Oracle connection.', to: '/system' })
  if (system && !system.mail.applicationSecretSet) items.push({ id: 'secret', tone: 'bad', title: 'MAIL_SECRET is not set', detail: 'Users cannot connect mailboxes and nothing can be sent.', to: '/system' })
  if (system && queued > 0 && !system.mail.worker.running) items.push({ id: 'worker', tone: 'bad', title: `${plural(queued, 'application')} waiting, but the mail worker is not running`, detail: 'Nothing will be sent until it is started.', to: '/system' })
  if (failed > 0) items.push({ id: 'failed', tone: 'warn', title: `${plural(failed, 'failed application')}`, detail: 'Check the reason; some can be retried.', to: '/applications?status=failed' })

  if (system && system.model.keys.total > 0 && system.model.keys.usable === 0) {
    items.push({ id: 'keys', tone: 'warn', title: 'Every model API key is rate limited', detail: 'Reading CVs and writing letters falls back to the local model.', to: '/system' })
  }
  if (system && !system.mail.systemMailReady) items.push({ id: 'smtp', tone: 'warn', title: 'Account emails cannot be sent', detail: 'Set SYSTEM_SMTP_HOST so people can verify and reset.', to: '/system' })

  if (overview.jobs.total === 0) {
    items.push({ id: 'empty', tone: 'warn', title: 'There are no vacancies yet', detail: 'Run a collection.', to: '/collection' })
  } else {
    const stale = overview.sources.filter((source) => !source.lastSeenAt || now - new Date(source.lastSeenAt).getTime() > 36 * 3_600_000)
    if (stale.length > 0) {
      items.push({
        id: 'stale',
        tone: 'warn',
        title: `${stale.map((source) => SOURCE_LABEL[source.source] ?? source.source).join(', ')} not seen for over a day`,
        detail: 'The site may have changed or blocked the collector.',
        to: '/collection',
      })
    }
  }

  if (overview.jobs.unenriched > 50) items.push({ id: 'teasers', tone: 'info', title: `${formatNumber(overview.jobs.unenriched)} adverts are only teasers`, detail: 'They score low until the full advert is read.', to: '/collection' })
  if (overview.candidates.withoutOwner > 0) items.push({ id: 'orphans', tone: 'info', title: `${plural(overview.candidates.withoutOwner, 'resume')} without an owner`, detail: 'Give each one to an account or delete it.', to: '/resumes?orphaned=true' })

  const unverified = overview.users.total - overview.users.verified
  if (unverified > 0) items.push({ id: 'unverified', tone: 'info', title: `${plural(unverified, 'account')} not yet verified`, detail: 'Their owners have not followed the email link.', to: '/users?verified=false' })

  const order = { bad: 0, warn: 1, info: 2 } as const
  return items.sort((a, b) => order[a.tone] - order[b.tone])
}

const TONE_ICON = { bad: WarningOctagon, warn: Warning, info: Info } as const

function Stat({ label, value, note, to }: { label: string; value: ReactNode; note: ReactNode; to: string }) {
  return (
    <Link className="stat" to={to}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      <span className="stat__note">{note}</span>
    </Link>
  )
}

export function Overview() {
  usePageTitle('Overview')
  const now = useNow()
  const overview = useOverview()
  const system = useSystem()
  const audit = useAudit({ limit: 6 })
  const [series, setSeries] = useState<Series>('jobs')

  const data = overview.data
  const attention = useMemo(() => (data ? attentionFor(data, system.data, now) : []), [data, system.data, now])
  const chosen = SERIES.find((option) => option.value === series)!

  return (
    <div className="page">
      <PageHeader title="Overview" description="What the service is doing right now, and what needs you." />

      {overview.isError && !data && <ErrorState error={overview.error} retry={() => void overview.refetch()} />}

      <div className="stats" aria-busy={!data}>
        {data ? (
          <>
            <Stat label="Users" value={formatNumber(data.users.total)} note={`${formatNumber(data.users.last7Days)} joined this week`} to="/users" />
            <Stat label="Resumes" value={formatNumber(data.candidates.total)} note={`${formatNumber(data.candidates.mailboxes)} with a mailbox`} to="/resumes" />
            <Stat label="Open vacancies" value={formatNumber(data.jobs.open)} note={`${formatNumber(data.jobs.last24Hours)} new in 24 hours`} to="/jobs?state=open" />
            <Stat label="Matches" value={formatNumber(Object.values(data.matches).reduce((sum, count) => sum + (count ?? 0), 0))} note={`${formatNumber(data.matches.approved ?? 0)} approved`} to="/matches" />
            <Stat label="Applications sent" value={formatNumber(data.applications.sent ?? 0)} note={`${formatNumber(data.applications.queued ?? 0)} waiting in the queue`} to="/applications" />
          </>
        ) : (
          Array.from({ length: 5 }, (_, index) => (
            <div className="stat" key={index}>
              <Skeleton width="50%" />
              <Skeleton height="1.75rem" width="40%" />
              <Skeleton width="70%" />
            </div>
          ))
        )}
      </div>

      <div className="split">
        <div className="stack">
          <Panel
            title="Activity"
            description="Last 30 days, by day (UTC)"
            actions={<Segmented value={series} onChange={setSeries} options={SERIES.map(({ value, label }) => ({ value, label }))} label="Choose what to chart" />}
          >
            {data ? <DailyBars points={data.daily.map((day) => ({ date: day.date, value: day[series] }))} noun={chosen.noun} /> : <Skeleton height="11rem" />}
          </Panel>

          <Panel title="Vacancy sources" description="Click a source to see its vacancies" flush>
            {data ? (
              data.sources.length === 0 ? (
                <p className="muted small" style={{ padding: 'var(--s-4)' }}>
                  No vacancies have been collected yet.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="table" aria-label="Vacancies by source">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th className="col-num">Vacancies</th>
                        <th className="col-num">Open</th>
                        <th className="col-num">With email</th>
                        <th className="col-num">Teasers</th>
                        <th>Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sources.map((source) => {
                        const stale = !source.lastSeenAt || now - new Date(source.lastSeenAt).getTime() > 36 * 3_600_000
                        return (
                          <tr key={source.source}>
                            <td data-primary>
                              <Link className="cell-title" to={`/jobs?source=${source.source}`}>
                                {SOURCE_LABEL[source.source] ?? source.source}
                              </Link>
                            </td>
                            <td className="col-num" data-label="Vacancies">{formatNumber(source.total)}</td>
                            <td className="col-num" data-label="Open">{formatNumber(source.open)}</td>
                            <td className="col-num" data-label="With email">{formatNumber(source.withEmail)}</td>
                            <td className="col-num" data-label="Teasers">{formatNumber(source.unenriched)}</td>
                            <td data-label="Last seen">{stale ? <Badge tone="warn">{source.lastSeenAt ? timeAgo(source.lastSeenAt) : 'never'}</Badge> : timeAgo(source.lastSeenAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="skeleton-rows">
                <Skeleton height="1.5rem" />
                <Skeleton height="1.5rem" width="80%" />
                <Skeleton height="1.5rem" width="90%" />
              </div>
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Needs attention">
            {!data ? (
              <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
                <Skeleton height="2.5rem" />
                <Skeleton height="2.5rem" />
              </div>
            ) : attention.length === 0 ? (
              <p className="small" style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center', color: 'var(--ok-ink)' }}>
                <CheckCircle size={18} /> Nothing needs attention.
              </p>
            ) : (
              <ul className="rows">
                {attention.map((item) => {
                  const Icon = TONE_ICON[item.tone]
                  return (
                    <li key={item.id}>
                      <span style={{ color: `var(--${item.tone === 'info' ? 'info' : item.tone}-solid)`, flex: 'none' }}>
                        <Icon size={20} />
                      </span>
                      <div className="rows__main">
                        <span className="rows__title">{item.title}</span>
                        <span className="rows__sub">{item.detail}</span>
                      </div>
                      {item.to && (
                        <Link to={item.to} aria-label={`Open: ${item.title}`}>
                          <ArrowRight size={16} />
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Where things stand">
            {data ? (
              <div style={{ display: 'grid', gap: 'var(--s-5)' }}>
                <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
                  <h3 className="small">Matches</h3>
                  <ShareBar
                    label="Matches by status"
                    slices={[
                      { label: 'To review', value: data.matches.suggested ?? 0, tone: 'neutral' },
                      { label: 'Approved', value: data.matches.approved ?? 0, tone: 'ok' },
                      { label: 'Skipped', value: data.matches.rejected ?? 0, tone: 'warn' },
                    ]}
                  />
                </div>
                <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
                  <h3 className="small">Applications</h3>
                  <ShareBar
                    label="Applications by status"
                    slices={[
                      { label: 'Sent', value: data.applications.sent ?? 0, tone: 'ok' },
                      { label: 'Queued', value: (data.applications.queued ?? 0) + (data.applications.sending ?? 0), tone: 'info' },
                      { label: 'Failed', value: data.applications.failed ?? 0, tone: 'bad' },
                      { label: 'Cancelled', value: data.applications.cancelled ?? 0, tone: 'neutral' },
                    ]}
                  />
                </div>
              </div>
            ) : (
              <Skeleton height="6rem" />
            )}
          </Panel>

          <Panel title="Recent admin activity" actions={<Link to="/audit" className="small">All activity</Link>}>
            {audit.data ? (
              audit.data.items.length === 0 ? (
                <p className="muted small">Nothing has been changed from this console yet.</p>
              ) : (
                <ul className="rows">
                  {audit.data.items.map((entry) => (
                    <li key={entry.id}>
                      <div className="rows__main">
                        <span className="rows__title">{actionLabel(entry.action)}</span>
                        <span className="rows__sub">
                          {entry.adminEmail}
                          {entry.summary ? `, ${entry.summary}` : ''}
                        </span>
                      </div>
                      <span className="xsmall muted nowrap">{timeAgo(entry.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <Skeleton height="5rem" />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
