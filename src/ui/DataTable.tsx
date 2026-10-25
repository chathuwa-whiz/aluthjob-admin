import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { formatNumber } from '../lib/format'
import { cx } from '../lib/cx'
import { Button } from './Button'
import { SkeletonRows } from './Blocks'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** The first line of a row on a phone, shown without its label. */
  primary?: boolean
  /** Right-aligned numbers. */
  num?: boolean
}

export interface Selection {
  selected: ReadonlySet<number>
  toggle: (id: number) => void
  toggleAll: (ids: number[]) => void
}

interface DataTableProps<T> {
  rows: T[] | undefined
  columns: Column<T>[]
  rowId: (row: T) => number
  loading?: boolean
  onRowClick?: (row: T) => void
  activeId?: number | null
  empty: ReactNode
  selection?: Selection
  label: string
}

/**
 * A table on a desk, a stack of labelled cards on a phone (the CSS turns each row into a card, using the
 * data-label of every cell). Rows open their record on click or Enter.
 */
export function DataTable<T>({ rows, columns, rowId, loading, onRowClick, activeId, empty, selection, label }: DataTableProps<T>) {
  if (!rows) return loading ? <SkeletonRows rows={6} /> : null
  if (rows.length === 0) return <>{empty}</>

  const ids = rows.map(rowId)
  const allSelected = selection ? ids.every((id) => selection.selected.has(id)) : false

  return (
    <div className="table-wrap">
      <table className="table" aria-label={label}>
        <thead>
          <tr>
            {selection && (
              <th className="col-check">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={() => selection.toggleAll(ids)}
                  style={{ accentColor: 'var(--primary)' }}
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} className={cx(column.num && 'col-num')}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = rowId(row)
            return (
              <tr
                key={id}
                data-clickable={onRowClick ? '' : undefined}
                aria-selected={activeId === id || undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
              >
                {selection && (
                  <td className="col-check" data-check onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select row ${id}`}
                      checked={selection.selected.has(id)}
                      onChange={() => selection.toggle(id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={cx(column.num && 'col-num')} data-label={column.header} data-primary={column.primary ? '' : undefined}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ total, offset, limit, onChange, busy }: { total: number; offset: number; limit: number; onChange: (offset: number) => void; busy?: boolean }) {
  if (total === 0) return null

  const from = offset + 1
  const to = Math.min(offset + limit, total)
  const pages = Math.ceil(total / limit)
  const page = Math.floor(offset / limit) + 1

  return (
    <nav className="pager" aria-label="Pages">
      <span aria-live="polite">
        {formatNumber(from)} to {formatNumber(to)} of {formatNumber(total)}
        {busy ? ' · updating' : ''}
      </span>
      {pages > 1 && (
        <div className="pager__buttons">
          <Button size="sm" onClick={() => onChange(Math.max(0, offset - limit))} disabled={offset === 0} icon={<CaretLeft size={14} />} aria-label="Previous page" />
          <span className="small" style={{ alignSelf: 'center' }}>
            {page} / {pages}
          </span>
          <Button size="sm" onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} icon={<CaretRight size={14} />} aria-label="Next page" />
        </div>
      )}
    </nav>
  )
}
