import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Page } from '../api/types'
import { ErrorState } from './Blocks'
import { DataTable, Pagination, type Column, type Selection } from './DataTable'

interface ListPanelProps<T> {
  result: UseQueryResult<Page<T>>
  columns: Column<T>[]
  rowId: (row: T) => number
  label: string
  offset: number
  limit: number
  onPage: (offset: number) => void
  onRowClick?: (row: T) => void
  activeId?: number | null
  empty: ReactNode
  selection?: Selection
}

/** The table of a list screen with its loading, error, empty and paging states. */
export function ListPanel<T>({ result, columns, rowId, label, offset, limit, onPage, onRowClick, activeId, empty, selection }: ListPanelProps<T>) {
  const { data, isPending, isError, error, isPlaceholderData, refetch } = result

  return (
    <section className="panel panel--flush" aria-busy={isPending || isPlaceholderData}>
      <div className="panel__body">
        {isError && !data ? (
          <div style={{ padding: 'var(--s-4)' }}>
            <ErrorState error={error} retry={() => void refetch()} />
          </div>
        ) : (
          <>
            <DataTable
              rows={data?.items}
              columns={columns}
              rowId={rowId}
              loading={isPending}
              onRowClick={onRowClick}
              activeId={activeId}
              empty={empty}
              selection={selection}
              label={label}
            />
            {data && <Pagination total={data.total} offset={offset} limit={limit} onChange={onPage} busy={isPlaceholderData} />}
          </>
        )}
      </div>
    </section>
  )
}
