import { MagnifyingGlass } from '@phosphor-icons/react'
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | null
  children: (props: { id: string; 'aria-describedby': string | undefined; 'aria-invalid': true | undefined }) => ReactNode
}

/** Label above the control, hint and error below it, wired together for screen readers. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({ label, hint, error, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> & { label: string; hint?: ReactNode; error?: string | null }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(props) => <input className={cx('input', className)} {...props} {...rest} />}
    </Field>
  )
}

export function TextAreaField({ label, hint, error, className, code, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> & { label: string; hint?: ReactNode; error?: string | null; code?: boolean }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(props) => <textarea className={cx('textarea', code && 'textarea--code', className)} {...props} {...rest} />}
    </Field>
  )
}

export function SelectField({ label, hint, error, children, className, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & { label: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(props) => (
        <select className={cx('select', className)} {...props} {...rest}>
          {children}
        </select>
      )}
    </Field>
  )
}

/** A compact select for filter bars, labelled for screen readers only. */
export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select className="select toolbar__sel" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  )
}

export function SearchInput({ value, onChange, placeholder, label = 'Search' }: { value: string; onChange: (value: string) => void; placeholder: string; label?: string }) {
  return (
    <div className="search toolbar__grow">
      <MagnifyingGlass className="search__icon" size={16} aria-hidden="true" />
      <input className="input" type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

export function Check({ label, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & { label: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" {...rest} />
      {label}
    </label>
  )
}
