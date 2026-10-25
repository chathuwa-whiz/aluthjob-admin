import { Broom, X } from '@phosphor-icons/react'
import * as api from '../api/endpoints'
import { useSessions } from '../api/queries'
import type { AdminSession } from '../api/types'
import { describeAgent, formatFullDateTime, timeAgo } from '../lib/format'
import { useListParams, usePageTitle, useUrlSearch } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { Empty, PageHeader } from '../ui/Blocks'
import { Button } from '../ui/Button'
import type { Column } from '../ui/DataTable'
import { SearchInput } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'
import { useConfirm } from '../ui/Overlay'
import { useAction } from '../ui/useAction'

export function Sessions() {
  usePageTitle('Sessions')
  const params = useListParams()
  const [search, setSearch] = useUrlSearch(params)
  const { ask, dialog } = useConfirm()
  const revoke = useAction(api.sessions.revoke, { success: 'Session ended', silent: true })
  const purge = useAction(api.sessions.purgeExpired, { success: (result) => `${result.purged} expired session(s) removed` })
  const result = useSessions({ limit: params.limit, offset: params.offset, search: params.get('search') })

  const columns: Column<AdminSession>[] = [
    {
      key: 'user',
      header: 'Signed in as',
      primary: true,
      cell: (session) => (
        <div className="cell-stack">
          <span className="cell-title wrap">{session.email}</span>
          <span className="chips">
            {session.role === 'admin' && <Badge tone="brand">Administrator</Badge>}
            {session.current && <Badge tone="ok">This session</Badge>}
          </span>
        </div>
      ),
    },
    { key: 'device', header: 'Device', cell: (session) => <span title={session.userAgent ?? undefined}>{describeAgent(session.userAgent)}</span> },
    { key: 'started', header: 'Signed in', cell: (session) => <span title={formatFullDateTime(session.createdAt)}>{timeAgo(session.createdAt)}</span> },
    { key: 'expires', header: 'Expires', cell: (session) => <span title={formatFullDateTime(session.expiresAt)}>{timeAgo(session.expiresAt)}</span> },
    {
      key: 'actions',
      header: '',
      cell: (session) => (
        <Button
          size="sm"
          icon={<X size={14} />}
          onClick={() =>
            ask({
              title: session.current ? 'End your own session?' : 'End this session?',
              body: session.current ? 'You will be signed out of this console.' : `${session.email} is signed out on that device and has to sign in again.`,
              confirmLabel: 'End session',
              danger: true,
              run: () => revoke.runOrThrow(session.id),
            })
          }
        >
          End
        </Button>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Sessions"
        description="Every live sign-in across all accounts. Ending one signs that device out at once."
        actions={
          <Button icon={<Broom size={18} />} loading={purge.pending} onClick={() => purge.run()}>
            Purge expired
          </Button>
        }
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by email" label="Search sessions" />
      </div>

      <ListPanel
        result={result}
        columns={columns}
        rowId={(session) => session.id}
        label="Sessions"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        empty={<Empty title="No live sessions">Nobody is signed in.</Empty>}
      />
      {dialog}
    </div>
  )
}
