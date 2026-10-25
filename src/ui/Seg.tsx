import type { ReactNode } from 'react'

export interface SegOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

/** A row of mutually exclusive filters (status tabs on a list). */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: SegOption<T>[]; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className="seg__item" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span className="seg__count">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Sections inside a side panel. */
export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: SegOption<T>[]; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" role="tab" className="tabs__item" aria-selected={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span className="seg__count"> {option.count}</span>}
        </button>
      ))}
    </div>
  )
}
