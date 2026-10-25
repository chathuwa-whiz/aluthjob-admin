import { ArrowCounterClockwise, ArrowSquareOut, EyeSlash, PencilSimple, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { messageOf } from '../api/client'
import * as api from '../api/endpoints'
import { useMatch, useMatches } from '../api/queries'
import type { AdminMatch, MatchDetail } from '../api/types'
import { formatDate, formatFullDateTime, formatNumber, safeHref, SOURCE_LABEL, timeAgo } from '../lib/format'
import { useListParams, useOpenParam, usePageTitle, useUrlSearch } from '../lib/hooks'
import { ApplicationStatusBadge, Badge, MatchStatusBadge, ScoreBadge } from '../ui/Badge'
import { Alert, Empty, ErrorState, KeyValue, PageHeader, Section, SkeletonRows } from '../ui/Blocks'
import { Button } from '../ui/Button'
import type { Column } from '../ui/DataTable'
import { FilterSelect, SearchInput, TextAreaField, TextField } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'
import { Drawer, useConfirm } from '../ui/Overlay'
import { useAction } from '../ui/useAction'

export function Matches() {
  usePageTitle('Matches')
  const params = useListParams()
  const { id: openId, open } = useOpenParam()
  const [search, setSearch] = useUrlSearch(params)

  const candidateId = params.get('candidateId')
  const jobId = params.get('jobId')
  const result = useMatches({
    limit: params.limit,
    offset: params.offset,
    search: params.get('search'),
    status: params.get('status'),
    minScore: params.get('minScore'),
    candidateId,
    jobId,
    sort: params.get('sort'),
  })

  const columns: Column<AdminMatch>[] = [
    { key: 'score', header: 'Score', num: true, cell: (match) => <ScoreBadge score={match.score} /> },
    {
      key: 'job',
      header: 'Vacancy',
      primary: true,
      cell: (match) => (
        <div className="cell-stack">
          <span className="cell-title wrap">{match.jobTitle}</span>
          <span className="cell-sub wrap">{[match.company, SOURCE_LABEL[match.source]].filter(Boolean).join(', ')}</span>
        </div>
      ),
    },
    {
      key: 'for',
      header: 'For',
      cell: (match) => (
        <div className="cell-stack">
          <span className="wrap">{match.candidateName ?? 'Unnamed'}</span>
          <span className="cell-sub wrap">{match.ownerEmail ?? 'No owner'}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', cell: (match) => <MatchStatusBadge status={match.status} /> },
    { key: 'letter', header: 'Letter', cell: (match) => (match.hasLetter ? 'Written' : <span className="muted">None</span>) },
    { key: 'application', header: 'Application', cell: (match) => (match.applicationStatus ? <ApplicationStatusBadge status={match.applicationStatus} /> : <span className="muted">Not queued</span>) },
    { key: 'created', header: 'Found', cell: (match) => formatDate(match.createdAt) },
  ]

  return (
    <div className="page">
      <PageHeader title="Matches" description="The vacancies suggested for each resume. Applicants approve and send their own letters; here you can review, hide or remove them." />

      {(candidateId || jobId) && (
        <Alert tone="info" action={<button type="button" className="link-btn" onClick={() => params.set({ candidateId: '', jobId: '' })}>Show all matches</button>}>
          Showing the matches of {candidateId ? `resume ${candidateId}` : `vacancy ${jobId}`} only.
        </Alert>
      )}

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vacancy, company, owner or file" label="Search matches" />
        <FilterSelect label="Status" value={params.get('status')} onChange={(value) => params.set({ status: value })}>
          <option value="">Any status</option>
          <option value="suggested">To review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Skipped</option>
        </FilterSelect>
        <FilterSelect label="Lowest score" value={params.get('minScore')} onChange={(value) => params.set({ minScore: value })}>
          <option value="">Any score</option>
          <option value="35">35 and up</option>
          <option value="50">50 and up (good)</option>
          <option value="65">65 and up (strong)</option>
        </FilterSelect>
        <FilterSelect label="Sort" value={params.get('sort') || 'score'} onChange={(value) => params.set({ sort: value === 'score' ? '' : value })}>
          <option value="score">Highest score</option>
          <option value="newest">Newest</option>
        </FilterSelect>
      </div>

      <ListPanel
        result={result}
        columns={columns}
        rowId={(match) => match.id}
        label="Matches"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        onRowClick={(match) => open(match.id)}
        activeId={openId}
        empty={<Empty title="No matches">Matches appear when a resume is searched against the vacancies.</Empty>}
      />

      {openId !== null && <MatchDrawer id={openId} onClose={() => open(null)} />}
    </div>
  )
}

const BREAKDOWN_LABEL = { skills: 'Skills', title: 'Job title', content: 'Advert wording', experience: 'Experience', location: 'Location' } as const

function MatchDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useMatch(id)
  const { ask, dialog } = useConfirm()
  const [editing, setEditing] = useState(false)
  const reject = useAction(api.matches.reject, { success: 'Match skipped' })
  const reopen = useAction(api.matches.reopen, { success: 'Match reopened for review' })
  const remove = useAction(api.matches.remove, { success: 'Match deleted', onSuccess: onClose, silent: true })

  const data = query.data
  const match = data?.match

  return (
    <>
      <Drawer
        title={match?.job.title ?? 'Match'}
        subtitle={match ? <span className="chips"><ScoreBadge score={match.score} /><MatchStatusBadge status={match.status} /></span> : undefined}
        onClose={onClose}
        footer={
          match && (
            <>
              {match.status !== 'rejected' ? (
                <Button icon={<EyeSlash size={18} />} loading={reject.pending} onClick={() => reject.run(match.id)}>
                  Skip this match
                </Button>
              ) : (
                <Button icon={<ArrowCounterClockwise size={18} />} loading={reopen.pending} onClick={() => reopen.run(match.id)}>
                  Reopen for review
                </Button>
              )}
              <Button
                variant="quiet-danger"
                icon={<Trash size={18} />}
                onClick={() =>
                  ask({
                    title: 'Delete this match?',
                    body: data?.application ? 'Its application record is deleted with it. A new search may suggest the vacancy again.' : 'A new search may suggest the vacancy again.',
                    confirmLabel: 'Delete match',
                    danger: true,
                    run: () => remove.runOrThrow(match.id),
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
        {!data && !query.isError && <SkeletonRows rows={6} />}
        {data && match && (
          <>
            <KeyValue
              items={[
                ['Vacancy', <Link to={`/jobs?open=${match.job.id}`} className="wrap">{match.job.title}</Link>],
                ['Company', match.job.company],
                ['Source', SOURCE_LABEL[match.job.source] ?? match.job.source],
                ['Closes', match.job.closingAt ? formatDate(match.job.closingAt) : 'No closing date'],
                ['How to apply', match.applyMethod === 'email' ? <span className="wrap">By email to {match.job.applyEmail}{match.job.applyEmailSource === 'image' ? ' (read from a picture)' : ''}</span> : 'On the employer site'],
                ['Resume', <Link to={`/resumes?open=${data.owner.candidateId}`}>{data.owner.candidateName ?? 'Resume'}</Link>],
                ['Owner', data.owner.ownerEmail ?? <Badge tone="warn">No owner</Badge>],
                ['Found', `${formatFullDateTime(match.createdAt)} (${timeAgo(match.createdAt)})`],
                ['Decided', match.decidedAt ? formatFullDateTime(match.decidedAt) : 'Not yet'],
              ]}
            />

            {safeHref(match.job.url) && (
              <div>
                <a className="btn" href={safeHref(match.job.url)} target="_blank" rel="noreferrer noopener">
                  <ArrowSquareOut size={18} />
                  Open the original advert
                </a>
              </div>
            )}

            <Section title="Why it matched">
              <div className="meter" role="list">
                {(Object.keys(BREAKDOWN_LABEL) as (keyof typeof BREAKDOWN_LABEL)[]).map((key) => {
                  const value = Math.round(match.details.breakdown[key] ?? 0)
                  return (
                    <div className="meter__row" key={key} role="listitem">
                      <span>{BREAKDOWN_LABEL[key]}</span>
                      <span className="meter__bar" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
                      <span className="num">{value}</span>
                    </div>
                  )
                })}
              </div>
              {match.details.matchedSkills.length > 0 && (
                <div className="chips">
                  {match.details.matchedSkills.map((skill) => (
                    <span key={skill} className="chip chip--hit">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {match.details.reasons.length > 0 && (
                <ul className="small" style={{ listStyle: 'disc', paddingLeft: 'var(--s-5)' }}>
                  {match.details.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              {match.details.warnings.map((warning) => (
                <Alert key={warning} tone="warn">
                  {warning}
                </Alert>
              ))}
            </Section>

            <Section
              title="Cover letter"
              actions={
                match.coverLetter && !editing ? (
                  <Button size="sm" icon={<PencilSimple size={16} />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                ) : undefined
              }
            >
              {editing ? (
                <LetterEditor data={data} onDone={() => setEditing(false)} />
              ) : match.coverLetter ? (
                <>
                  <p className="small">
                    <strong>Subject:</strong> <span className="wrap">{match.subject}</span>
                  </p>
                  <div className="letter">{match.coverLetter}</div>
                  <p className="xsmall muted">Drafted {timeAgo(match.draftedAt)}. Only the applicant can approve a letter or send it.</p>
                </>
              ) : (
                <p className="muted small">No letter has been written for this match yet.</p>
              )}
            </Section>

            {data.application && (
              <Section title="Application">
                <KeyValue
                  items={[
                    ['Status', <ApplicationStatusBadge status={data.application.status} />],
                    ['To', <span className="wrap">{data.application.toEmail}</span>],
                    ['Attempts', formatNumber(data.application.attempts)],
                    ['Sent', data.application.sentAt ? formatFullDateTime(data.application.sentAt) : null],
                    ['Problem', data.application.error ? <span className="wrap">{data.application.error}</span> : null],
                  ]}
                />
                <div>
                  <Link className="btn" to={`/applications?open=${data.application.id}`}>
                    Open the application
                  </Link>
                </div>
              </Section>
            )}
          </>
        )}
      </Drawer>
      {dialog}
    </>
  )
}

function LetterEditor({ data, onDone }: { data: MatchDetail; onDone: () => void }) {
  const [subject, setSubject] = useState(data.match.subject ?? '')
  const [letter, setLetter] = useState(data.match.coverLetter ?? '')
  const [error, setError] = useState<string | null>(null)
  const save = useAction(api.matches.editLetter, { success: 'Letter saved', silent: true })

  async function submit() {
    setError(null)
    try {
      await save.runOrThrow(data.match.id, { subject: subject.trim(), coverLetter: letter.trim() })
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
      {data.match.status === 'approved' && <Alert tone="warn">The applicant approved the current letter. Saving a change withdraws that approval, so they have to read and approve it again before it can go out.</Alert>}
      <TextField label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} required />
      <TextAreaField label="Letter" value={letter} onChange={(event) => setLetter(event.target.value)} maxLength={8000} required style={{ minHeight: '16rem' }} />
      {error && <Alert tone="bad">{error}</Alert>}
      <div className="form__actions">
        <Button onClick={onDone} disabled={save.pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={save.pending} disabled={!subject.trim() || !letter.trim()}>
          Save letter
        </Button>
      </div>
    </form>
  )
}
