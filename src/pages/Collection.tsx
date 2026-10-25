import { CloudArrowDown, Scan } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/endpoints'
import { useCollection, useOverview, useSystem } from '../api/queries'
import type { JobSource, SiteProgress } from '../api/types'
import { formatDuration, formatFullDateTime, formatNumber, SOURCE_LABEL, SOURCES, timeAgo } from '../lib/format'
import { usePageTitle, useTick } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { Alert, ErrorState, KeyValue, PageHeader, Panel, Skeleton } from '../ui/Blocks'
import { Button } from '../ui/Button'
import { Check, TextField } from '../ui/Field'
import { useAction } from '../ui/useAction'

function SiteBadge({ site }: { site: SiteProgress }) {
  if (site.state === 'failed') return <Badge tone="bad">Failed</Badge>
  if (site.state === 'done') return <Badge tone="ok">{formatNumber(site.fetched)} found</Badge>
  return <Badge tone="info">Reading, {formatNumber(site.fetched)} so far</Badge>
}

export function Collection() {
  usePageTitle('Collection')
  useTick(5000)
  const status = useCollection()
  const overview = useOverview()
  const system = useSystem()
  const [maxPages, setMaxPages] = useState('')
  const [enrichSources, setEnrichSources] = useState<ReadonlySet<JobSource>>(new Set(['topjobs']))
  const [enrichLimit, setEnrichLimit] = useState('40')

  const run = useAction(api.collection.run, { success: 'Collection started' })
  const enrich = useAction(api.collection.enrich, { success: 'Reading adverts' })

  const data = status.data
  const running = Boolean(data?.running)
  const pages = Number(maxPages)
  const pageArg = maxPages && Number.isInteger(pages) && pages > 0 ? pages : undefined
  const settings = system.data?.collection
  const bySource = new Map((overview.data?.sources ?? []).map((source) => [source.source, source]))

  const toggleSource = (source: JobSource) =>
    setEnrichSources((current) => {
      const next = new Set(current)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })

  return (
    <div className="page">
      <PageHeader
        title="Collection"
        description="Reads the job sites for new vacancies and reads full adverts. Runs on a schedule; start one by hand here."
        actions={
          <Button variant="primary" icon={<CloudArrowDown size={18} />} loading={running || run.pending} onClick={() => run.run(undefined, pageArg)}>
            {running ? 'Collecting' : 'Collect from every source'}
          </Button>
        }
      />

      {status.isError && !data && <ErrorState error={status.error} retry={() => void status.refetch()} />}

      {running && data && (
        <Panel title="Collecting now" description={`Started ${timeAgo(data.startedAt)} (${data.trigger ?? 'automatic'})`}>
          {data.sites.length === 0 ? (
            <p className="muted small">Starting the sources.</p>
          ) : (
            <ul className="rows">
              {data.sites.map((site) => (
                <li key={site.source}>
                  <div className="rows__main">
                    <span className="rows__title">{SOURCE_LABEL[site.source] ?? site.source}</span>
                    {site.error && <span className="rows__sub">{site.error}</span>}
                  </div>
                  <SiteBadge site={site} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <div className="split">
        <div className="stack">
          <Panel title="Sources" description="Collect from one site when only it needs a refresh" flush>
            <div className="table-wrap">
              <table className="table" aria-label="Sources">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th className="col-num">Vacancies</th>
                    <th className="col-num">Teasers</th>
                    <th>Last seen</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {SOURCES.map((source) => {
                    const stats = bySource.get(source)
                    const site = data?.sites.find((item) => item.source === source)
                    return (
                      <tr key={source}>
                        <td data-primary>
                          <Link className="cell-title" to={`/jobs?source=${source}`}>
                            {SOURCE_LABEL[source]}
                          </Link>
                        </td>
                        <td className="col-num" data-label="Vacancies">{stats ? formatNumber(stats.total) : overview.isPending ? '' : '0'}</td>
                        <td className="col-num" data-label="Teasers">{stats ? formatNumber(stats.unenriched) : overview.isPending ? '' : '0'}</td>
                        <td data-label="Last seen">{site && running ? <SiteBadge site={site} /> : stats?.lastSeenAt ? timeAgo(stats.lastSeenAt) : <span className="muted">Never</span>}</td>
                        <td data-label="" style={{ textAlign: 'right' }}>
                          <Button size="sm" disabled={running} loading={run.pending} onClick={() => run.run([source], pageArg)}>
                            Collect
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Last collection" description={data?.last ? `${data.last.trigger}, finished ${timeAgo(data.last.finishedAt)} and took ${formatDuration((Date.parse(data.last.finishedAt ?? data.last.startedAt) - Date.parse(data.last.startedAt)) / 1000)}` : undefined}>
            {!data ? (
              <Skeleton height="4rem" />
            ) : !data.last ? (
              <p className="muted small">No collection has finished since the server started. The schedule runs one when the vacancies are old.</p>
            ) : data.last.error ? (
              <Alert tone="bad" title="The collection failed">
                {data.last.error}
              </Alert>
            ) : (
              <ul className="rows">
                {data.last.results.map((result) => (
                  <li key={result.source}>
                    <div className="rows__main">
                      <span className="rows__title">{SOURCE_LABEL[result.source] ?? result.source}</span>
                      <span className="rows__sub">{result.error ?? `${formatNumber(result.inserted)} new, ${formatNumber(result.updated)} refreshed`}</span>
                    </div>
                    {result.error ? <Badge tone="bad">Failed</Badge> : <Badge tone="ok">{formatNumber(result.fetched)} found</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Read full adverts" description="Listings are often only a teaser. This opens each advert, and runs OCR on picture adverts, which takes a few seconds each.">
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault()
                enrich.run([...enrichSources], Number(enrichLimit))
              }}
            >
              <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 'var(--s-1)' }}>
                <legend className="field__label" style={{ marginBottom: 'var(--s-1)' }}>
                  Sources
                </legend>
                {SOURCES.map((source) => (
                  <Check key={source} label={`${SOURCE_LABEL[source]}${bySource.get(source) ? ` (${formatNumber(bySource.get(source)!.unenriched)} teasers)` : ''}`} checked={enrichSources.has(source)} onChange={() => toggleSource(source)} />
                ))}
              </fieldset>
              <TextField label="Adverts per source" type="number" min={1} max={200} value={enrichLimit} onChange={(event) => setEnrichLimit(event.target.value)} hint="Newest first. The scheduled run reads 40 after each collection." />
              <Button type="submit" icon={<Scan size={18} />} loading={enrich.pending || Boolean(data?.enrichment.running)} disabled={enrichSources.size === 0 || !(Number(enrichLimit) >= 1)}>
                {data?.enrichment.running ? 'Reading adverts' : 'Read adverts'}
              </Button>
            </form>

            {data?.enrichment.startedAt && (
              <div style={{ marginTop: 'var(--s-4)' }}>
                {data.enrichment.error && <Alert tone="bad">{data.enrichment.error}</Alert>}
                <ul className="rows">
                  {data.enrichment.results.map((result) => (
                    <li key={result.source}>
                      <div className="rows__main">
                        <span className="rows__title">{SOURCE_LABEL[result.source] ?? result.source}</span>
                        <span className="rows__sub">
                          {result.enriched} of {result.attempted} read{result.failed > 0 ? `, ${result.failed} failed` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="xsmall muted">{data.enrichment.running ? 'Running since' : 'Finished'} {timeAgo(data.enrichment.finishedAt ?? data.enrichment.startedAt)}</p>
              </div>
            )}
          </Panel>

          <Panel title="Options and schedule">
            <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
              <TextField label="Pages per source" type="number" min={1} max={20} value={maxPages} onChange={(event) => setMaxPages(event.target.value)} placeholder={settings ? `Default ${settings.maxPages}` : ''} hint="For the buttons on this screen only." />
              {settings ? (
                <KeyValue
                  items={[
                    ['Runs automatically', settings.intervalMinutes > 0 ? `every ${formatDuration(settings.intervalMinutes * 60)}` : 'Off'],
                    ['Refresh when older than', `${settings.maxAgeHours} hours`],
                    ['Adverts read after each run', settings.enrichPerRun > 0 ? String(settings.enrichPerRun) : 'Off'],
                    ['Latest vacancy seen', overview.data?.jobs.lastSeenAt ? formatFullDateTime(overview.data.jobs.lastSeenAt) : null],
                  ]}
                />
              ) : (
                <Skeleton height="4rem" />
              )}
              <p className="xsmall muted">The schedule comes from the server's environment (INGEST_INTERVAL_MINUTES and friends). Change it in the server's .env and restart.</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
