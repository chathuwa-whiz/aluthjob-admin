import { ArrowClockwise } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useSystem } from '../api/queries'
import { formatDuration, formatFullDateTime, formatNumber, timeAgo } from '../lib/format'
import { usePageTitle, useTick } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { Alert, ErrorState, KeyValue, PageHeader, Panel, Skeleton } from '../ui/Blocks'
import { Button } from '../ui/Button'

const yesNo = (value: boolean, good = 'Yes', bad = 'No') => <Badge tone={value ? 'ok' : 'bad'}>{value ? good : bad}</Badge>

export function System() {
  usePageTitle('System')
  useTick(10_000)
  const query = useSystem()
  const system = query.data

  return (
    <div className="page">
      <PageHeader
        title="System"
        description="What this server is running with. These settings come from the server's environment: change them in its .env file and restart."
        actions={
          <Button icon={<ArrowClockwise size={18} />} loading={query.isFetching} onClick={() => void query.refetch()}>
            Refresh
          </Button>
        }
      />

      {query.isError && !system && <ErrorState error={query.error} retry={() => void query.refetch()} />}
      {!system && !query.isError && (
        <div className="sys-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <Panel key={index}>
              <Skeleton height="8rem" />
            </Panel>
          ))}
        </div>
      )}

      {system && (
        <>
          {!system.database.ok && (
            <Alert tone="bad" title="The database cannot be reached">
              {system.database.error}
            </Alert>
          )}

          <div className="sys-grid">
            <Panel title="Server">
              <KeyValue
                items={[
                  ['Environment', system.server.environment],
                  ['Node', <span className="mono">{system.server.node}</span>],
                  ['Running for', `${formatDuration(system.server.uptimeSeconds)} (since ${formatFullDateTime(system.server.startedAt)})`],
                  ['Memory in use', `${formatNumber(system.server.memoryMb)} MB`],
                ]}
              />
            </Panel>

            <Panel title="Database">
              <KeyValue
                items={[
                  ['Oracle connection', yesNo(system.database.ok, 'Working', 'Failing')],
                  ['Answered in', system.database.latencyMs === null ? null : `${system.database.latencyMs} ms`],
                  ['Last error', system.database.error],
                ]}
              />
            </Panel>

            <Panel title="Model">
              <KeyValue
                items={[
                  ['Answering with', system.model.provider === 'groq' ? `Groq, ${system.model.groqModel}` : `Local Ollama, ${system.model.ollamaModel}`],
                  ['Fallback', system.model.provider === 'groq' ? `Local Ollama, ${system.model.ollamaModel}` : 'None'],
                  ['API keys', system.model.keys.total === 0 ? 'None configured' : `${system.model.keys.usable} usable of ${system.model.keys.total}`],
                ]}
              />
              {system.model.keys.resting.length > 0 && (
                <ul className="rows" style={{ marginTop: 'var(--s-3)' }}>
                  {system.model.keys.resting.map((key) => (
                    <li key={key.key}>
                      <div className="rows__main">
                        <span className="rows__title">{key.key}</span>
                        <span className="rows__sub">Rate limited or rejected; back in {formatDuration(key.seconds)}</span>
                      </div>
                      <Badge tone="warn">Resting</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Sending mail">
              <KeyValue
                items={[
                  ['Mail worker', system.mail.worker.enabled ? yesNo(system.mail.worker.running, 'Running', 'Not running') : <Badge>Turned off (MAIL_WORKER=off)</Badge>],
                  ['Last check', system.mail.worker.lastTick ? `${system.mail.worker.lastTick.result}, ${timeAgo(system.mail.worker.lastTick.at)}` : null],
                  ['Last error', system.mail.worker.lastError ? `${system.mail.worker.lastError.message} (${timeAgo(system.mail.worker.lastError.at)})` : null],
                  ['MAIL_SECRET set', yesNo(system.mail.applicationSecretSet)],
                  ['Waiting in the queue', system.mail.queue ? `${formatNumber(system.mail.queue.queued)} (${formatNumber(system.mail.queue.dueNow)} due now)` : null],
                  ['Oldest waiting', system.mail.queue?.oldestQueuedAt ? timeAgo(system.mail.queue.oldestQueuedAt) : null],
                  ['Per applicant', `${system.mail.dailyLimit} a day, ${system.mail.sendGapSeconds} seconds apart`],
                ]}
              />
              <p style={{ marginTop: 'var(--s-3)' }}>
                <Link to="/applications">Open the send queue</Link>
              </p>
            </Panel>

            <Panel title="Account emails">
              <KeyValue
                items={[
                  ['Can send confirmation and reset emails', yesNo(system.mail.systemMailReady)],
                  ['SMTP server configured', system.mail.systemSmtpConfigured ? yesNo(true) : <Badge tone={system.server.environment === 'production' ? 'bad' : 'warn'}>No: {system.server.environment === 'production' ? 'sign-ups are refused' : 'emails print to the server console'}</Badge>],
                ]}
              />
            </Panel>

            <Panel title="Collection">
              <KeyValue
                items={[
                  ['Right now', system.collection.running ? <Badge tone="info">Collecting</Badge> : 'Idle'],
                  ['Last collection', system.collection.last?.finishedAt ? timeAgo(system.collection.last.finishedAt) : 'None since the server started'],
                  ['Schedule', system.collection.intervalMinutes > 0 ? `every ${formatDuration(system.collection.intervalMinutes * 60)}` : 'Off'],
                  ['Sources', system.collection.sources.length],
                  ['Pages per source', system.collection.maxPages],
                  ['Adverts read per run', system.collection.enrichPerRun],
                  ['Reading adverts', system.collection.enrichment.running ? <Badge tone="info">Running</Badge> : 'Idle'],
                  ['OCR languages', <span className="mono">{system.ocr.languages}</span>],
                  ['OCR confidence needed', `${system.ocr.minEmailConfidence} of 100`],
                ]}
              />
              <p style={{ marginTop: 'var(--s-3)' }}>
                <Link to="/collection">Open collection</Link>
              </p>
            </Panel>

            <Panel title="Sign-in and access">
              <KeyValue
                items={[
                  ['Sites allowed to call the API', system.security.allowedOrigins.length > 0 ? <span className="wrap mono">{system.security.allowedOrigins.join(', ')}</span> : <Badge tone="bad">None (FRONTEND_URL is empty)</Badge>],
                  ['Cookie only over https', yesNo(system.security.cookieSecure)],
                  ['Behind a proxy', system.security.trustProxy ?? 'No (TRUST_PROXY unset)'],
                  ['A sign-in lasts', `${system.security.sessionDays} days`],
                ]}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
