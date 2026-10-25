import { ArrowsLeftRight, DownloadSimple, EnvelopeSimple, MagnifyingGlass, PencilSimple, Trash, UserCircleMinus } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { messageOf, downloadUrl } from '../api/client'
import * as api from '../api/endpoints'
import { useCandidate, useCandidates } from '../api/queries'
import type { AdminCandidate, CandidateDetail, Profile, RunProgress } from '../api/types'
import { formatBytes, formatDate, formatDuration, formatFullDateTime, formatNumber, SOURCE_LABEL, timeAgo } from '../lib/format'
import { useListParams, useOpenParam, usePageTitle, useUrlSearch } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { Alert, Empty, ErrorState, KeyValue, PageHeader, Section, SkeletonRows } from '../ui/Blocks'
import { Button } from '../ui/Button'
import type { Column } from '../ui/DataTable'
import { FilterSelect, SearchInput, TextAreaField, TextField } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'
import { Dialog, Drawer, useConfirm } from '../ui/Overlay'
import { Tabs } from '../ui/Seg'
import { useAction } from '../ui/useAction'

export function Resumes() {
  usePageTitle('Resumes')
  const params = useListParams()
  const { id: openId, open } = useOpenParam()
  const [search, setSearch] = useUrlSearch(params)

  const result = useCandidates({ limit: params.limit, offset: params.offset, search: params.get('search'), orphaned: params.get('orphaned') })

  const columns: Column<AdminCandidate>[] = [
    {
      key: 'name',
      header: 'Resume',
      primary: true,
      cell: (candidate) => (
        <div className="cell-stack">
          <span className="cell-title wrap">{candidate.fullName ?? candidate.fileName}</span>
          <span className="cell-sub wrap">{candidate.fullName ? candidate.fileName : formatBytes(candidate.fileBytes)}</span>
        </div>
      ),
    },
    { key: 'owner', header: 'Owner', cell: (candidate) => (candidate.ownerEmail ? <span className="wrap">{candidate.ownerEmail}</span> : <Badge tone="warn">No owner</Badge>) },
    { key: 'matches', header: 'Matches', num: true, cell: (candidate) => formatNumber(candidate.matches) },
    { key: 'sent', header: 'Sent', num: true, cell: (candidate) => formatNumber(candidate.sent) },
    { key: 'mailbox', header: 'Mailbox', cell: (candidate) => (candidate.hasMailbox ? <Badge tone="ok">Connected</Badge> : <span className="muted">None</span>) },
    { key: 'uploaded', header: 'Uploaded', cell: (candidate) => formatDate(candidate.createdAt) },
  ]

  return (
    <div className="page">
      <PageHeader title="Resumes" description="Every uploaded CV with the profile read from it. Fix a profile, move a resume to another account, or start a search for it." />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, file or owner" label="Search resumes" />
        <FilterSelect label="Owner" value={params.get('orphaned')} onChange={(value) => params.set({ orphaned: value })}>
          <option value="">All resumes</option>
          <option value="true">Without an owner</option>
        </FilterSelect>
      </div>

      <ListPanel
        result={result}
        columns={columns}
        rowId={(candidate) => candidate.id}
        label="Resumes"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        onRowClick={(candidate) => open(candidate.id)}
        activeId={openId}
        empty={<Empty title="No resumes match">Resumes appear here when people upload a CV.</Empty>}
      />

      {openId !== null && <ResumeDrawer id={openId} onClose={() => open(null)} />}
    </div>
  )
}

type Tab = 'overview' | 'profile' | 'search'

function ResumeDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useCandidate(id)
  const [tab, setTab] = useState<Tab>('overview')
  const data = query.data

  return (
    <Drawer title={data ? (data.fullName ?? data.fileName) : 'Resume'} subtitle={data ? (data.ownerEmail ?? 'No owner') : undefined} onClose={onClose}>
      {query.isError && <ErrorState error={query.error} retry={() => void query.refetch()} />}
      {!data && !query.isError && <SkeletonRows rows={6} />}

      {data && (
        <>
          <Tabs
            value={tab}
            onChange={setTab}
            label="Resume sections"
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'profile', label: 'Profile' },
              { value: 'search', label: 'Search', count: data.matches },
            ]}
          />
          {tab === 'overview' && <OverviewTab data={data} onGone={onClose} />}
          {tab === 'profile' && <ProfileTab data={data} />}
          {tab === 'search' && <SearchTab data={data} />}
        </>
      )}
    </Drawer>
  )
}

function OverviewTab({ data, onGone }: { data: CandidateDetail; onGone: () => void }) {
  const { ask, dialog } = useConfirm()
  const [reassigning, setReassigning] = useState(false)
  const setOwner = useAction(api.candidates.setOwner, { success: 'Owner changed' })
  const disconnect = useAction(api.mailboxes.disconnect, { success: 'Mailbox disconnected', silent: true })
  const remove = useAction(api.candidates.remove, { success: 'Resume deleted', onSuccess: onGone, silent: true })

  return (
    <>
      <KeyValue
        items={[
          ['Owner', data.ownerEmail ? <Link to={`/users?search=${encodeURIComponent(data.ownerEmail)}&open=${data.userId}`}>{data.ownerEmail}</Link> : <Badge tone="warn">No owner</Badge>],
          ['File', <span className="wrap">{data.fileName}</span>],
          ['Type and size', `${data.mimeType}, ${formatBytes(data.fileBytes)}`],
          ['Uploaded', formatFullDateTime(data.createdAt)],
          ['Profile edited', formatFullDateTime(data.updatedAt)],
          ['Matches', <Link to={`/matches?candidateId=${data.id}`}>{formatNumber(data.matches)}</Link>],
          ['Applications sent', <Link to={`/applications?candidateId=${data.id}`}>{formatNumber(data.sent)}</Link>],
          ['Resume id', <span className="mono">{data.id}</span>],
        ]}
      />

      <Section title="Mailbox">
        {data.mailbox ? (
          <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
            <KeyValue
              items={[
                ['Address', data.mailbox.email],
                ['Sender name', data.mailbox.fromName],
                ['Server', `${data.mailbox.host}:${data.mailbox.port}${data.mailbox.secure ? ' (TLS)' : ''}`],
                ['Checked', `${formatFullDateTime(data.mailbox.verifiedAt)} (${timeAgo(data.mailbox.verifiedAt)})`],
              ]}
            />
            <div>
              <Button
                variant="quiet-danger"
                icon={<EnvelopeSimple size={18} />}
                onClick={() =>
                  ask({
                    title: 'Disconnect this mailbox?',
                    body: `${data.mailbox!.email} is removed together with its stored password. The person must connect it again before anything can be sent.`,
                    confirmLabel: 'Disconnect',
                    danger: true,
                    run: () => disconnect.runOrThrow(data.id),
                  })
                }
              >
                Disconnect mailbox
              </Button>
            </div>
          </div>
        ) : (
          <p className="muted small">No mailbox is connected, so nothing can be sent for this resume.</p>
        )}
      </Section>

      <Section title="Actions">
        <div className="toolbar">
          <a className="btn" href={downloadUrl(`/admin/candidates/${data.id}/resume`)} target="_blank" rel="noreferrer">
            <DownloadSimple size={18} />
            Download the CV
          </a>
          <Button icon={<ArrowsLeftRight size={18} />} onClick={() => setReassigning(true)}>
            Move to another account
          </Button>
          {data.userId !== null && (
            <Button icon={<UserCircleMinus size={18} />} loading={setOwner.pending} onClick={() => setOwner.run(data.id, null)}>
              Remove the owner
            </Button>
          )}
        </div>
        <p className="muted xsmall">Downloading a CV is recorded in the audit log.</p>
      </Section>

      <Section title="Danger zone">
        <p className="small muted">Deleting a resume removes its matches, mailbox and application history. The owner can upload it again.</p>
        <div>
          <Button
            variant="quiet-danger"
            icon={<Trash size={18} />}
            onClick={() =>
              ask({
                title: 'Delete this resume?',
                body: `${data.fileName} with ${formatNumber(data.matches)} match(es) and ${formatNumber(data.sent)} sent application record(s) will be removed. This cannot be undone.`,
                confirmLabel: 'Delete resume',
                danger: true,
                typeToConfirm: 'delete',
                run: () => remove.runOrThrow(data.id),
              })
            }
          >
            Delete resume
          </Button>
        </div>
      </Section>

      {reassigning && <ReassignDialog candidate={data} onClose={() => setReassigning(false)} />}
      {dialog}
    </>
  )
}

function ReassignDialog({ candidate, onClose }: { candidate: CandidateDetail; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const setOwner = useAction(api.candidates.setOwner, { success: 'Resume moved', silent: true })

  async function submit() {
    setPending(true)
    setError(null)
    try {
      const found = await api.users.list({ search: email.trim(), limit: 10 })
      const user = found.items.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
      if (!user) throw new Error('No account has exactly that email address')

      await setOwner.runOrThrow(candidate.id, user.id)
      onClose()
    } catch (failure) {
      setError(messageOf(failure))
      setPending(false)
    }
  }

  return (
    <Dialog title="Move this resume" onClose={onClose}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <p className="small">
          <span className="wrap">{candidate.fileName}</span> currently belongs to {candidate.ownerEmail ?? 'nobody'}. Its matches and mailbox move with it.
        </p>
        <TextField label="Email of the new owner" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        {error && <Alert tone="bad">{error}</Alert>}
        <div className="dialog__actions">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending} disabled={!email}>
            Move resume
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

// ---- profile ----

function ProfileTab({ data }: { data: CandidateDetail }) {
  const [editing, setEditing] = useState(false)
  const p = data.profile

  if (editing) return <ProfileEditor data={data} onDone={() => setEditing(false)} />

  return (
    <>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <p className="muted small">Read from the CV by the model and corrected by the owner. Searches use what is stored here.</p>
        <Button icon={<PencilSimple size={18} />} onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <KeyValue
        items={[
          ['Name', p.personalInfo.fullName],
          ['Email', p.personalInfo.email],
          ['Phone', p.personalInfo.phone],
          ['Location', p.personalInfo.location],
          ['LinkedIn', p.personalInfo.linkedin],
          ['Portfolio', p.personalInfo.portfolio],
        ]}
      />

      <Section title={`Skills (${p.skills.length})`}>
        {p.skills.length === 0 ? (
          <p className="muted small">None found.</p>
        ) : (
          <div className="chips">
            {p.skills.map((skill, index) => (
              <span className="chip" key={`${skill}-${index}`}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Experience (${p.experience.length})`}>
        {p.experience.length === 0 ? (
          <p className="muted small">None found.</p>
        ) : (
          <div>
            {p.experience.map((job, index) => (
              <div className="exp" key={index}>
                <strong>{[job.position, job.company].filter(Boolean).join(' at ') || 'Untitled role'}</strong>
                <span className="muted xsmall">{[job.startDate, job.endDate].filter(Boolean).join(' to ')}</span>
                {job.responsibilities.length > 0 && (
                  <ul>
                    {job.responsibilities.map((line, position) => (
                      <li key={position}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Education (${p.education.length})`}>
        {p.education.length === 0 ? (
          <p className="muted small">None found.</p>
        ) : (
          <div>
            {p.education.map((entry, index) => (
              <div className="exp" key={index}>
                <strong>{[entry.degree, entry.field].filter(Boolean).join(', ') || 'Qualification'}</strong>
                <span className="muted xsmall">{[entry.institution, [entry.startDate, entry.endDate].filter(Boolean).join(' to ')].filter(Boolean).join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {(p.certifications.length > 0 || p.achievements.length > 0) && (
        <Section title="Certifications and achievements">
          <ul className="exp" style={{ gap: 'var(--s-2)' }}>
            {[...p.certifications, ...p.achievements.map((achievement) => achievement.description)].map((line, index) => (
              <li key={index} className="small" style={{ listStyle: 'disc', marginLeft: 'var(--s-5)' }}>
                {line}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}

function ProfileEditor({ data, onDone }: { data: CandidateDetail; onDone: () => void }) {
  const [text, setText] = useState(() => JSON.stringify(data.profile, null, 2))
  const [error, setError] = useState<string | null>(null)
  const save = useAction(api.candidates.saveProfile, { success: 'Profile saved', silent: true })

  async function submit() {
    setError(null)

    let profile: Profile
    try {
      profile = JSON.parse(text) as Profile
    } catch {
      setError('This is not valid JSON. Check for a missing comma or quote.')
      return
    }

    try {
      await save.runOrThrow(data.id, profile)
      onDone()
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
      <Alert tone="warn">The profile is saved exactly as written and every later search uses it. The server rejects anything that does not have the profile's shape.</Alert>
      <TextAreaField label="Profile (JSON)" code value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} />
      {error && <Alert tone="bad">{error}</Alert>}
      <div className="form__actions">
        <Button onClick={onDone} disabled={save.pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={save.pending}>
          Save profile
        </Button>
      </div>
    </form>
  )
}

// ---- search ----

const PHASE_LABEL: Record<RunProgress['phase'], string> = {
  starting: 'Starting',
  collecting: 'Collecting vacancies',
  ranking: 'Comparing the CV with every open vacancy',
  reading: 'Reading full adverts',
  drafting: 'Writing cover letters',
  done: 'Finished',
  failed: 'Stopped',
}

function SearchTab({ data }: { data: CandidateDetail }) {
  const start = useAction(api.candidates.runSearch, { success: 'Search started' })
  const run = data.run
  const running = run?.status === 'running'

  return (
    <>
      <p className="muted small">
        Compares this resume with every open vacancy and keeps the best matches for the owner to review. It reads job sites if the vacancies are old, which can take a few minutes.
      </p>
      <div className="toolbar">
        <Button variant="primary" icon={<MagnifyingGlass size={18} />} loading={start.pending || running} onClick={() => start.run(data.id)}>
          {running ? 'Searching' : 'Search for this resume'}
        </Button>
        <Link className="btn" to={`/matches?candidateId=${data.id}`}>
          See its matches ({formatNumber(data.matches)})
        </Link>
      </div>

      {!run && <p className="muted small">No search has run for this resume since the server started.</p>}

      {run && (
        <Section title={run.status === 'running' ? 'Search in progress' : run.status === 'done' ? 'Last search' : 'Last search failed'}>
          <KeyValue
            items={[
              ['Step', PHASE_LABEL[run.phase]],
              ['Time taken', formatDuration(run.elapsedMs / 1000)],
              ['Vacancies compared', run.considered === null ? null : formatNumber(run.considered)],
              ['Adverts read', run.adverts.total > 0 ? `${run.adverts.done} of ${run.adverts.total}` : null],
              ['Letters written', run.letters.total > 0 ? `${run.letters.done} of ${run.letters.total}` : null],
              ['Matches kept', run.matched === null ? null : `${formatNumber(run.matched)}${run.topScore !== null ? `, best ${run.topScore}` : ''}`],
            ]}
          />
          {run.sites.length > 0 && (
            <ul className="rows">
              {run.sites.map((site) => (
                <li key={site.source}>
                  <div className="rows__main">
                    <span className="rows__title">{SOURCE_LABEL[site.source] ?? site.source}</span>
                    {site.error && <span className="rows__sub">{site.error}</span>}
                  </div>
                  <Badge tone={site.state === 'failed' ? 'bad' : site.state === 'done' ? 'ok' : 'info'}>
                    {site.state === 'reading' ? `Reading, ${site.fetched} found` : site.state === 'done' ? `${site.fetched} found` : 'Failed'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {run.activity.length > 0 && (
            <ul className="rows">
              {run.activity.map((line, index) => (
                <li key={index}>
                  <div className="rows__main">
                    <span className="rows__sub">{line.text}</span>
                  </div>
                  <span className="xsmall muted nowrap">{timeAgo(line.at)}</span>
                </li>
              ))}
            </ul>
          )}
          {run.error && <Alert tone="bad">{run.error}</Alert>}
        </Section>
      )}
    </>
  )
}
