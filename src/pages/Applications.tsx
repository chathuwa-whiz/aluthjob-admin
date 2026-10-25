import { ArrowClockwise, HandPalm, Trash, XCircle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import * as api from '../api/endpoints'
import { useApplication, useApplications, useOverview } from '../api/queries'
import type { AdminApplication, ApplicationStatus } from '../api/types'
import { APPLICATION_STATUS, formatDate, formatFullDateTime, formatNumber, timeAgo } from '../lib/format'
import { useListParams, useOpenParam, usePageTitle, useUrlSearch } from '../lib/hooks'
import { ApplicationStatusBadge } from '../ui/Badge'
import { Alert, Empty, ErrorState, KeyValue, PageHeader, Section, SkeletonRows } from '../ui/Blocks'
import { Button } from '../ui/Button'
import type { Column } from '../ui/DataTable'
import { SearchInput } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'
import { Drawer, useConfirm } from '../ui/Overlay'
import { Segmented } from '../ui/Seg'
import { useAction } from '../ui/useAction'

type Filter = ApplicationStatus | 'all'
const ORDER: ApplicationStatus[] = ['queued', 'sending', 'sent', 'failed', 'cancelled']

export function Applications() {
  usePageTitle('Applications')
  const params = useListParams()
  const { id: openId, open } = useOpenParam()
  const [search, setSearch] = useUrlSearch(params)
  const overview = useOverview()
  const { ask, dialog } = useConfirm()
  const cancelQueued = useAction(api.applications.cancelQueued, { success: (result) => `${formatNumber(result.cancelled)} application(s) cancelled`, silent: true })

  const status = (params.get('status') || 'all') as Filter
  const candidateId = params.get('candidateId')
  const result = useApplications({ limit: params.limit, offset: params.offset, search: params.get('search'), status: status === 'all' ? undefined : status, candidateId })
  const counts = overview.data?.applications ?? {}
  const queued = counts.queued ?? 0

  const columns: Column<AdminApplication>[] = [
    { key: 'status', header: 'Status', cell: (item) => <ApplicationStatusBadge status={item.status} /> },
    {
      key: 'job',
      header: 'Vacancy',
      primary: true,
      cell: (item) => (
        <div className="cell-stack">
          <span className="cell-title wrap">{item.jobTitle}</span>
          <span className="cell-sub wrap">{item.company ?? 'Company not given'}</span>
        </div>
      ),
    },
    { key: 'to', header: 'Sent to', cell: (item) => <span className="wrap">{item.toEmail}</span> },
    { key: 'from', header: 'From', cell: (item) => (item.ownerEmail ? <span className="wrap">{item.ownerEmail}</span> : <span className="muted">No owner</span>) },
    { key: 'attempts', header: 'Tries', num: true, cell: (item) => item.attempts },
    {
      key: 'when',
      header: 'When',
      cell: (item) =>
        item.status === 'sent' ? (
          formatDate(item.sentAt)
        ) : item.status === 'queued' ? (
          <span title={formatFullDateTime(item.nextAttemptAt)}>Next try {timeAgo(item.nextAttemptAt)}</span>
        ) : (
          timeAgo(item.updatedAt)
        ),
    },
    { key: 'error', header: 'Problem', cell: (item) => (item.error ? <span className="wrap small" style={{ color: 'var(--bad-ink)' }}>{item.error.slice(0, 90)}{item.error.length > 90 ? '…' : ''}</span> : '') },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Applications"
        description="The send queue and everything sent. The worker sends one at a time, paced per applicant."
        actions={
          <Button
            variant="quiet-danger"
            icon={<HandPalm size={18} />}
            disabled={queued === 0}
            onClick={() =>
              ask({
                title: 'Stop everything in the queue?',
                body: `${formatNumber(queued)} queued application(s) are cancelled and will not be sent. Applications already being sent cannot be stopped. Applicants can queue them again.`,
                confirmLabel: 'Cancel all queued',
                danger: true,
                run: () => cancelQueued.runOrThrow(),
              })
            }
          >
            Stop all queued
          </Button>
        }
      />

      {candidateId && (
        <Alert tone="info" action={<button type="button" className="link-btn" onClick={() => params.set({ candidateId: '' })}>Show all applications</button>}>
          Showing the applications of resume {candidateId} only.
        </Alert>
      )}

      <div className="toolbar">
        <Segmented<Filter>
          label="Filter by status"
          value={status}
          onChange={(value) => params.set({ status: value === 'all' ? '' : value })}
          options={[{ value: 'all', label: 'All' }, ...ORDER.map((item) => ({ value: item, label: APPLICATION_STATUS[item].label, count: counts[item] ?? 0 }))]}
        />
      </div>
      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vacancy, company, recipient or sender" label="Search applications" />
      </div>

      <ListPanel
        result={result}
        columns={columns}
        rowId={(item) => item.id}
        label="Applications"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        onRowClick={(item) => open(item.id)}
        activeId={openId}
        empty={<Empty title="No applications">Applications appear when an applicant sends an approved match.</Empty>}
      />

      {openId !== null && <ApplicationDrawer id={openId} onClose={() => open(null)} />}
      {dialog}
    </div>
  )
}

function ApplicationDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useApplication(id)
  const { ask, dialog } = useConfirm()
  const cancel = useAction(api.applications.cancel, { success: 'Application cancelled' })
  const retry = useAction(api.applications.retry, { success: 'Queued to try again' })
  const remove = useAction(api.applications.remove, { success: 'Application deleted', onSuccess: onClose, silent: true })
  const item = query.data
  const interrupted = Boolean(item?.error?.startsWith('Interrupted'))

  return (
    <>
      <Drawer
        title={item?.jobTitle ?? 'Application'}
        subtitle={item ? <ApplicationStatusBadge status={item.status} /> : undefined}
        onClose={onClose}
        footer={
          item && (
            <>
              {item.status === 'queued' && (
                <Button icon={<XCircle size={18} />} loading={cancel.pending} onClick={() => cancel.run(item.id)}>
                  Cancel sending
                </Button>
              )}
              {item.status === 'failed' && (
                <Button
                  icon={<ArrowClockwise size={18} />}
                  loading={retry.pending}
                  onClick={() =>
                    interrupted
                      ? ask({
                          title: 'Retry an interrupted send?',
                          body: 'The server stopped while this was being sent, so the email may already have left. Check the applicant\'s Sent folder first; retrying can send a duplicate.',
                          confirmLabel: 'Retry anyway',
                          danger: true,
                          run: () => retry.runOrThrow(item.id),
                        })
                      : retry.run(item.id)
                  }
                >
                  Try again
                </Button>
              )}
              <Button
                variant="quiet-danger"
                icon={<Trash size={18} />}
                disabled={item.status === 'sending'}
                onClick={() =>
                  ask({
                    title: 'Delete this record?',
                    body: item.status === 'sent' ? 'The email stays sent, but the record of it is lost, and the match could be queued again.' : 'The record is removed.',
                    confirmLabel: 'Delete record',
                    danger: true,
                    run: () => remove.runOrThrow(item.id),
                  })
                }
              >
                Delete
              </Button>
            </>
          )
        }
      >
        {query.isError && <ErrorState error={query.error} retry={() => void query.refetch()} />}
        {!item && !query.isError && <SkeletonRows rows={5} />}
        {item && (
          <>
            {item.error && (
              <Alert tone={item.status === 'failed' ? 'bad' : 'warn'} title={item.status === 'failed' ? 'It failed' : 'Last problem'}>
                <span className="wrap">{item.error}</span>
              </Alert>
            )}

            <KeyValue
              items={[
                ['Vacancy', item.company ? `${item.jobTitle}, ${item.company}` : item.jobTitle],
                ['Sent to', <span className="wrap">{item.toEmail}</span>],
                ['Sent by', item.ownerEmail ?? 'No owner'],
                ['Queued', formatFullDateTime(item.queuedAt)],
                ['Tries', formatNumber(item.attempts)],
                ['Next try', item.status === 'queued' ? `${formatFullDateTime(item.nextAttemptAt)} (${timeAgo(item.nextAttemptAt)})` : null],
                ['Sent', item.sentAt ? formatFullDateTime(item.sentAt) : null],
                ['Message id', item.messageId ? <span className="mono wrap">{item.messageId}</span> : null],
                ['Match', <Link to={`/matches?open=${item.matchId}`}>Open match {item.matchId}</Link>],
                ['Resume', <Link to={`/resumes?open=${item.candidateId}`}>Open resume {item.candidateId}</Link>],
              ]}
            />

            {item.sentBody && (
              <Section title="Exactly what was sent">
                <p className="small">
                  <strong>Subject:</strong> <span className="wrap">{item.sentSubject}</span>
                </p>
                <div className="letter">{item.sentBody}</div>
              </Section>
            )}
          </>
        )}
      </Drawer>
      {dialog}
    </>
  )
}
