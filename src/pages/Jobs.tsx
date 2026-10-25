import { ArrowSquareOut, ArrowsClockwise, Broom, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { messageOf } from '../api/client'
import * as api from '../api/endpoints'
import { useJob, useJobs } from '../api/queries'
import type { AdminJob, AdminJobDetail, JobEdit, JobSource } from '../api/types'
import { dateInputValue, formatDate, formatFullDateTime, formatNumber, safeHref, SOURCE_LABEL, SOURCES, timeAgo } from '../lib/format'
import { useListParams, useOpenParam, usePageTitle, useUrlSearch } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { Alert, Empty, ErrorState, KeyValue, PageHeader, Section, SkeletonRows } from '../ui/Blocks'
import { Button } from '../ui/Button'
import type { Column } from '../ui/DataTable'
import { FilterSelect, SearchInput, SelectField, TextAreaField, TextField } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'
import { Dialog, Drawer, useConfirm } from '../ui/Overlay'
import { Tabs } from '../ui/Seg'
import { useAction } from '../ui/useAction'

function ApplyBadge({ job }: { job: Pick<AdminJob, 'applyEmail' | 'applyEmailSource'> }) {
  if (!job.applyEmail) return <span className="muted">Portal</span>
  return job.applyEmailSource === 'image' ? <Badge tone="warn" title="Read from a picture by OCR; the applicant must confirm it">Email, from picture</Badge> : <Badge tone="ok">Email</Badge>
}

export function Jobs() {
  usePageTitle('Vacancies')
  const params = useListParams()
  const { id: openId, open } = useOpenParam()
  const [search, setSearch] = useUrlSearch(params)
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const [purging, setPurging] = useState(false)
  const { ask, dialog } = useConfirm()

  const removeMany = useAction(api.jobs.removeMany, { success: (result) => `${formatNumber(result.deleted)} vacancies deleted`, silent: true })

  const state = params.get('state')
  const email = params.get('email')
  const result = useJobs({
    limit: params.limit,
    offset: params.offset,
    search: params.get('search'),
    source: params.get('source'),
    openOnly: state === 'open' ? true : undefined,
    closedOnly: state === 'closed' ? true : undefined,
    hasEmail: email === 'with' || email === 'picture' ? true : email === 'without' ? false : undefined,
    emailSource: email === 'picture' ? 'image' : undefined,
    enriched: params.get('read') === 'read' ? true : params.get('read') === 'teaser' ? false : undefined,
    sort: params.get('sort'),
  })

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const columns: Column<AdminJob>[] = [
    {
      key: 'title',
      header: 'Vacancy',
      primary: true,
      cell: (job) => (
        <div className="cell-stack">
          <span className="cell-title wrap">{job.title}</span>
          <span className="cell-sub wrap">{job.company ?? 'Company not given'}</span>
        </div>
      ),
    },
    { key: 'source', header: 'Source', cell: (job) => SOURCE_LABEL[job.source] ?? job.source },
    { key: 'location', header: 'Location', cell: (job) => job.location ?? <span className="muted">Not given</span> },
    {
      key: 'closing',
      header: 'Closes',
      cell: (job) => (job.closingAt ? (job.closingAt < new Date().toISOString() ? <Badge tone="neutral">Closed {formatDate(job.closingAt)}</Badge> : formatDate(job.closingAt)) : <span className="muted">Open</span>),
    },
    { key: 'apply', header: 'Apply by', cell: (job) => <ApplyBadge job={job} /> },
    { key: 'read', header: 'Advert', cell: (job) => (job.enrichedAt ? <Badge tone="ok">Read</Badge> : <Badge tone={job.enrichFailures >= 3 ? 'bad' : 'neutral'}>{job.enrichFailures >= 3 ? 'Gave up' : 'Teaser'}</Badge>) },
    { key: 'matches', header: 'Matches', num: true, cell: (job) => formatNumber(job.matches) },
    { key: 'seen', header: 'Seen', cell: (job) => timeAgo(job.lastSeenAt) },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Vacancies"
        description="Everything collected from the job sites. Correct a record, read an advert again, or remove what should not be offered."
        actions={
          <Button icon={<Broom size={18} />} onClick={() => setPurging(true)}>
            Remove old closed vacancies
          </Button>
        }
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search title, company, location or email" label="Search vacancies" />
        <FilterSelect label="Source" value={params.get('source')} onChange={(value) => params.set({ source: value })}>
          <option value="">All sources</option>
          {SOURCES.map((source) => (
            <option key={source} value={source}>
              {SOURCE_LABEL[source]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Open or closed" value={state} onChange={(value) => params.set({ state: value })}>
          <option value="">Open and closed</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </FilterSelect>
        <FilterSelect label="How to apply" value={email} onChange={(value) => params.set({ email: value })}>
          <option value="">Any way to apply</option>
          <option value="with">Has an email</option>
          <option value="picture">Email read from a picture</option>
          <option value="without">No email (portal)</option>
        </FilterSelect>
        <FilterSelect label="Advert read" value={params.get('read')} onChange={(value) => params.set({ read: value })}>
          <option value="">Read or teaser</option>
          <option value="read">Full advert read</option>
          <option value="teaser">Teaser only</option>
        </FilterSelect>
        <FilterSelect label="Sort" value={params.get('sort') || 'newest'} onChange={(value) => params.set({ sort: value === 'newest' ? '' : value })}>
          <option value="newest">Newest posted</option>
          <option value="first_seen">Newest collected</option>
          <option value="last_seen">Recently seen</option>
          <option value="closing">Closing soonest</option>
          <option value="most_matched">Most matched</option>
        </FilterSelect>
      </div>

      {selected.size > 0 && (
        <div className="alert alert--info" role="status" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>{formatNumber(selected.size)} selected</strong>
          <span style={{ flex: 1 }} />
          <Button size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash size={16} />}
            onClick={() =>
              ask({
                title: `Delete ${selected.size} vacancies?`,
                body: 'Their matches and any application records go with them. This cannot be undone.',
                confirmLabel: 'Delete',
                danger: true,
                run: async () => {
                  await removeMany.runOrThrow([...selected])
                  setSelected(new Set())
                },
              })
            }
          >
            Delete selected
          </Button>
        </div>
      )}

      <ListPanel
        result={result}
        columns={columns}
        rowId={(job) => job.id}
        label="Vacancies"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        onRowClick={(job) => open(job.id)}
        activeId={openId}
        selection={{
          selected,
          toggle,
          toggleAll: (ids) =>
            setSelected((current) => {
              const all = ids.every((id) => current.has(id))
              const next = new Set(current)
              for (const id of ids) {
                if (all) next.delete(id)
                else next.add(id)
              }
              return next
            }),
        }}
        empty={<Empty title="No vacancies match">Change the filters, or run a collection.</Empty>}
      />

      {openId !== null && <JobDrawer id={openId} onClose={() => open(null)} />}
      {purging && <PurgeDialog onClose={() => setPurging(false)} />}
      {dialog}
    </div>
  )
}

function PurgeDialog({ onClose }: { onClose: () => void }) {
  const [days, setDays] = useState('30')
  const [source, setSource] = useState<JobSource | ''>('')
  const [error, setError] = useState<string | null>(null)
  const purge = useAction(api.jobs.purgeClosed, { success: (result) => `${formatNumber(result.deleted)} vacancies removed`, silent: true })
  const count = Number(days)

  async function submit() {
    setError(null)
    try {
      await purge.runOrThrow(count, source || undefined)
      onClose()
    } catch (failure) {
      setError(messageOf(failure))
    }
  }

  return (
    <Dialog title="Remove old closed vacancies" onClose={onClose}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <p className="small">Deletes vacancies whose closing date passed more than this many days ago, together with their matches. Vacancies without a closing date are kept.</p>
        <TextField label="Closed more than (days ago)" type="number" min={0} max={3650} value={days} onChange={(event) => setDays(event.target.value)} required />
        <SelectField label="From" value={source} onChange={(event) => setSource(event.target.value as JobSource | '')}>
          <option value="">Every source</option>
          {SOURCES.map((item) => (
            <option key={item} value={item}>
              {SOURCE_LABEL[item]}
            </option>
          ))}
        </SelectField>
        {error && <Alert tone="bad">{error}</Alert>}
        <div className="dialog__actions">
          <Button onClick={onClose} disabled={purge.pending}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={purge.pending} disabled={!Number.isInteger(count) || count < 0}>
            Remove
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

type Tab = 'details' | 'edit'

function JobDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useJob(id)
  const [tab, setTab] = useState<Tab>('details')
  const { ask, dialog } = useConfirm()
  const enrich = useAction(api.jobs.enrich, { success: 'Advert read' })
  const remove = useAction(api.jobs.remove, { success: 'Vacancy deleted', onSuccess: onClose, silent: true })
  const job = query.data

  return (
    <>
      <Drawer
        title={job?.title ?? 'Vacancy'}
        subtitle={job ? [job.company, SOURCE_LABEL[job.source]].filter(Boolean).join(', ') : undefined}
        onClose={onClose}
        footer={
          job && (
            <>
              <Button icon={<ArrowsClockwise size={18} />} loading={enrich.pending} onClick={() => enrich.run(job.id, true)}>
                Read the advert again
              </Button>
              <Button
                variant="quiet-danger"
                icon={<Trash size={18} />}
                onClick={() =>
                  ask({
                    title: 'Delete this vacancy?',
                    body: (
                      <>
                        <strong className="wrap">{job.title}</strong> is removed together with {formatNumber(job.matches)} match(es). The next collection may add it back if the site still lists it.
                      </>
                    ),
                    confirmLabel: 'Delete vacancy',
                    danger: true,
                    run: () => remove.runOrThrow(job.id),
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
        {!job && !query.isError && <SkeletonRows rows={6} />}
        {job && (
          <>
            <Tabs
              value={tab}
              onChange={setTab}
              label="Vacancy sections"
              options={[
                { value: 'details', label: 'Details' },
                { value: 'edit', label: 'Edit' },
              ]}
            />
            {tab === 'details' ? <JobDetails job={job} /> : <JobForm job={job} onSaved={() => setTab('details')} />}
          </>
        )}
      </Drawer>
      {dialog}
    </>
  )
}

function JobDetails({ job }: { job: AdminJobDetail }) {
  const [full, setFull] = useState(false)
  const href = safeHref(job.url)
  const applyHref = safeHref(job.applyUrl)
  const description = job.description ?? ''
  const shown = full ? description : description.slice(0, 1500)

  return (
    <>
      {job.applyEmailSource === 'image' && job.applyEmail && (
        <Alert tone="warn" title="Address read from a picture">
          An OCR misread is possible, so the applicant has to type it back after checking the original advert before anything is sent.
        </Alert>
      )}

      <KeyValue
        items={[
          ['Source', SOURCE_LABEL[job.source] ?? job.source],
          ['Original advert', href ? <a href={href} target="_blank" rel="noreferrer noopener" className="wrap">{job.url} <ArrowSquareOut size={14} style={{ display: 'inline' }} /></a> : <span className="wrap">{job.url}</span>],
          ['Company', job.company],
          ['Location', job.location],
          ['Type', job.jobType],
          ['Category', job.category],
          ['Salary', job.salary],
          ['Posted', job.postedAt ? formatDate(job.postedAt) : null],
          ['Closes', job.closingAt ? formatDate(job.closingAt) : 'No closing date'],
          ['Apply by email', job.applyEmail ? <span className="wrap">{job.applyEmail}</span> : null],
          ['Apply online', job.applyUrl ? (applyHref ? <a href={applyHref} target="_blank" rel="noreferrer noopener" className="wrap">{job.applyUrl}</a> : <span className="wrap">{job.applyUrl}</span>) : null],
          ['Advert', job.enrichedAt ? `Full advert read ${timeAgo(job.enrichedAt)}` : job.enrichFailures >= 3 ? 'Could not be read after several tries' : 'Teaser only'],
          ['First collected', formatFullDateTime(job.firstSeenAt)],
          ['Last seen on the site', `${formatFullDateTime(job.lastSeenAt)} (${timeAgo(job.lastSeenAt)})`],
          ['Matches', <Link to={`/matches?jobId=${job.id}`}>{formatNumber(job.matches)}</Link>],
          ['Vacancy id', <span className="mono">{job.id}</span>],
        ]}
      />

      <Section title="Description">
        {description ? (
          <>
            <div className="letter">{shown}{!full && description.length > 1500 ? '…' : ''}</div>
            {description.length > 1500 && (
              <div>
                <button type="button" className="link-btn" onClick={() => setFull((value) => !value)}>
                  {full ? 'Show less' : `Show all ${formatNumber(description.length)} characters`}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="muted small">No description stored.</p>
        )}
      </Section>
    </>
  )
}

function JobForm({ job, onSaved }: { job: AdminJobDetail; onSaved: () => void }) {
  const initial = {
    title: job.title,
    company: job.company ?? '',
    location: job.location ?? '',
    jobType: job.jobType ?? '',
    salary: job.salary ?? '',
    category: job.category ?? '',
    postedAt: dateInputValue(job.postedAt),
    closingAt: dateInputValue(job.closingAt),
    applyEmail: job.applyEmail ?? '',
    applyUrl: job.applyUrl ?? '',
    description: job.description ?? '',
  }
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const update = useAction(api.jobs.update, { success: 'Vacancy saved', silent: true })

  const set = (key: keyof typeof initial) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const changed = (Object.keys(initial) as (keyof typeof initial)[]).filter((key) => form[key] !== initial[key])

  async function submit() {
    setError(null)
    // only the fields that were edited are sent; an emptied field clears the stored value
    const changes: Record<string, string | null> = {}
    for (const key of changed) changes[key] = key !== 'title' && form[key] === '' ? null : form[key]

    try {
      await update.runOrThrow(job.id, changes as JobEdit)
      onSaved()
    } catch (failure) {
      setError(messageOf(failure))
    }
  }

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <TextField label="Title" value={form.title} onChange={set('title')} required maxLength={1000} />
      <div className="form__row">
        <TextField label="Company" value={form.company} onChange={set('company')} maxLength={1000} />
        <TextField label="Location" value={form.location} onChange={set('location')} maxLength={1000} />
      </div>
      <div className="form__row">
        <TextField label="Job type" value={form.jobType} onChange={set('jobType')} maxLength={200} />
        <TextField label="Category" value={form.category} onChange={set('category')} maxLength={500} />
      </div>
      <TextField label="Salary" value={form.salary} onChange={set('salary')} maxLength={500} />
      <div className="form__row">
        <TextField label="Posted" type="date" value={form.postedAt} onChange={set('postedAt')} />
        <TextField label="Closes" type="date" value={form.closingAt} onChange={set('closingAt')} hint="Closes at the end of that day. Clear it for no closing date." />
      </div>
      <TextField
        label="Employer email"
        type="email"
        value={form.applyEmail}
        onChange={set('applyEmail')}
        hint={job.applyEmailSource === 'image' ? 'This address was read from a picture; the applicant will still have to confirm it.' : 'Applications are emailed here. Be sure it is right.'}
      />
      <TextField label="Apply online address" type="url" value={form.applyUrl} onChange={set('applyUrl')} hint="Must start with http:// or https://" maxLength={2000} />
      <TextAreaField label="Description" value={form.description} onChange={set('description')} style={{ minHeight: '14rem' }} />
      {error && <Alert tone="bad">{error}</Alert>}
      <div className="form__actions">
        <Button onClick={() => setForm(initial)} disabled={changed.length === 0 || update.pending}>
          Reset
        </Button>
        <Button type="submit" variant="primary" loading={update.pending} disabled={changed.length === 0}>
          Save changes
        </Button>
      </div>
    </form>
  )
}
