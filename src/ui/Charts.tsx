import { useState } from 'react'
import { formatDay, formatNumber } from '../lib/format'
import type { Tone } from '../lib/format'
import { cx } from '../lib/cx'

/** Daily counts as plain columns. Hover or focus a column to read its day; the total sits above. */
export function DailyBars({ points, noun }: { points: { date: string; value: number }[]; noun: string }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((point) => point.value))
  const total = points.reduce((sum, point) => sum + point.value, 0)
  const shown = active === null ? null : points[active]

  return (
    <div>
      <div className="chart-readout" aria-live="polite">
        <strong>{formatNumber(shown ? shown.value : total)}</strong>
        <span className="muted small">{shown ? `${noun} on ${formatDay(shown.date)}` : `${noun} in the last ${points.length} days`}</span>
      </div>

      <div
        className="bars"
        style={{ ['--n' as string]: points.length, marginTop: 'var(--s-4)' }}
        role="img"
        aria-label={`${formatNumber(total)} ${noun} in the last ${points.length} days`}
        onMouseLeave={() => setActive(null)}
      >
        {points.map((point, index) => (
          <div
            key={point.date}
            className="bars__col"
            data-active={active === index}
            onMouseEnter={() => setActive(index)}
            onPointerDown={() => setActive(index)}
            title={`${formatDay(point.date)}: ${point.value}`}
          >
            <span className="bars__bar" data-zero={point.value === 0} style={{ height: `${point.value === 0 ? 2 : Math.max(4, (point.value / max) * 100)}%` }} />
          </div>
        ))}
      </div>

      <div className="bars__axis" aria-hidden="true">
        <span>{points[0] ? formatDay(points[0].date) : ''}</span>
        <span>{points.length > 0 ? formatDay(points[points.length - 1]!.date) : ''}</span>
      </div>
    </div>
  )
}

export interface ShareSlice {
  label: string
  value: number
  tone: Tone
}

/** One bar split into the parts of a whole, with a legend that carries the numbers. */
export function ShareBar({ slices, label }: { slices: ShareSlice[]; label: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const visible = slices.filter((slice) => slice.value > 0)

  return (
    <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
      <div className="share" role="img" aria-label={`${label}: ${slices.map((slice) => `${slice.value} ${slice.label}`).join(', ')}`}>
        {total === 0 ? <span className="tone-neutral" style={{ flex: 1 }} /> : visible.map((slice) => <span key={slice.label} className={cx(`tone-${slice.tone}`)} style={{ flex: slice.value }} />)}
      </div>
      <div className="legend">
        {slices.map((slice) => (
          <span key={slice.label} className="legend__item">
            <span className={cx('legend__swatch', `tone-${slice.tone}`)} />
            {slice.label} <strong className="num" style={{ color: 'var(--ink)' }}>{formatNumber(slice.value)}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
