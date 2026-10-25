import { useAudit, useAuditActions } from '../api/queries'
import type { AuditEntry } from '../api/types'
import { actionLabel, formatFullDateTime, timeAgo } from '../lib/format'
import { useListParams, usePageTitle, useUrlSearch } from '../lib/hooks'
import { Empty, PageHeader } from '../ui/Blocks'
import type { Column } from '../ui/DataTable'
import { FilterSelect, SearchInput } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'

export function Audit() {
  usePageTitle('Audit log')
  const params = useListParams()
  const [search, setSearch] = useUrlSearch(params)
  const actions = useAuditActions()
  const result = useAudit({ limit: params.limit, offset: params.offset, search: params.get('search'), action: params.get('action') })

  const columns: Column<AuditEntry>[] = [
    {
      key: 'action',
      header: 'What happened',
      primary: true,
      cell: (entry) => (
        <div className="cell-stack">
          <span className="cell-title">{actionLabel(entry.action)}</span>
          <span className="cell-sub wrap">{entry.summary ?? ''}</span>
        </div>
      ),
    },
    { key: 'who', header: 'Administrator', cell: (entry) => <span className="wrap">{entry.adminEmail}</span> },
    { key: 'target', header: 'Record', cell: (entry) => (entry.targetType ? <span className="mono">{entry.targetType} {entry.targetId}</span> : <span className="muted">None</span>) },
    { key: 'when', header: 'When', cell: (entry) => <span title={formatFullDateTime(entry.createdAt)}>{timeAgo(entry.createdAt)}</span> },
    { key: 'ip', header: 'Address', cell: (entry) => <span className="mono">{entry.ip ?? ''}</span> },
  ]

  return (
    <div className="page">
      <PageHeader title="Audit log" description="Every change made from this console, and every CV downloaded, with who did it. Entries cannot be edited or deleted here." />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by person, record or detail" label="Search the audit log" />
        <FilterSelect label="Kind of change" value={params.get('action')} onChange={(value) => params.set({ action: value })}>
          <option value="">Every kind</option>
          {(actions.data ?? []).map((action) => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </FilterSelect>
      </div>

      <ListPanel
        result={result}
        columns={columns}
        rowId={(entry) => entry.id}
        label="Audit log"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        empty={<Empty title="Nothing recorded yet">Changes made from this console appear here.</Empty>}
      />
    </div>
  )
}
