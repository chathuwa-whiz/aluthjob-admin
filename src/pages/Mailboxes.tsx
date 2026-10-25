import { LinkBreak } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import * as api from '../api/endpoints'
import { useMailboxes } from '../api/queries'
import type { AdminMailbox } from '../api/types'
import { formatNumber, timeAgo } from '../lib/format'
import { useListParams, usePageTitle, useUrlSearch } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { Alert, Empty, PageHeader } from '../ui/Blocks'
import { Button } from '../ui/Button'
import type { Column } from '../ui/DataTable'
import { SearchInput } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'
import { useConfirm } from '../ui/Overlay'
import { useAction } from '../ui/useAction'

export function Mailboxes() {
  usePageTitle('Mailboxes')
  const params = useListParams()
  const [search, setSearch] = useUrlSearch(params)
  const { ask, dialog } = useConfirm()
  const disconnect = useAction(api.mailboxes.disconnect, { success: 'Mailbox disconnected', silent: true })
  const result = useMailboxes({ limit: params.limit, offset: params.offset, search: params.get('search') })

  const columns: Column<AdminMailbox>[] = [
    {
      key: 'mailbox',
      header: 'Mailbox',
      primary: true,
      cell: (box) => (
        <div className="cell-stack">
          <span className="cell-title wrap">{box.email}</span>
          <span className="cell-sub wrap">{box.fromName ? `Sends as ${box.fromName}` : 'No sender name'}</span>
        </div>
      ),
    },
    { key: 'server', header: 'Server', cell: (box) => <span className="mono">{box.host}:{box.port}{box.secure ? '' : ' (STARTTLS)'}</span> },
    { key: 'owner', header: 'Owner', cell: (box) => (box.ownerEmail ? <span className="wrap">{box.ownerEmail}</span> : <Badge tone="warn">No owner</Badge>) },
    { key: 'resume', header: 'Resume', cell: (box) => <Link to={`/resumes?open=${box.candidateId}`} className="wrap">{box.resume}</Link> },
    { key: 'sent', header: 'Sent', num: true, cell: (box) => <Link to={`/applications?candidateId=${box.candidateId}&status=sent`}>{formatNumber(box.sent)}</Link> },
    { key: 'checked', header: 'Last checked', cell: (box) => timeAgo(box.verifiedAt) },
    {
      key: 'actions',
      header: '',
      cell: (box) => (
        <Button
          size="sm"
          variant="quiet-danger"
          icon={<LinkBreak size={16} />}
          onClick={() =>
            ask({
              title: 'Disconnect this mailbox?',
              body: `${box.email} is removed with its stored password. Nothing can be sent for this resume until the applicant connects a mailbox again.`,
              confirmLabel: 'Disconnect',
              danger: true,
              run: () => disconnect.runOrThrow(box.candidateId),
            })
          }
        >
          Disconnect
        </Button>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader title="Mailboxes" description="The mailboxes applicants connected to send from. Passwords are stored encrypted and are never shown here." />

      <Alert tone="info">If MAIL_SECRET changes on the server, every stored password becomes unreadable and applicants have to connect again.</Alert>

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by mailbox, host or owner" label="Search mailboxes" />
      </div>

      <ListPanel
        result={result}
        columns={columns}
        rowId={(box) => box.candidateId}
        label="Mailboxes"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        empty={<Empty title="No mailboxes connected">Applicants connect one on their Mailbox screen.</Empty>}
      />
      {dialog}
    </div>
  )
}
