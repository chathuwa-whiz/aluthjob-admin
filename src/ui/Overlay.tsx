import { X } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { messageOf } from '../api/client'
import { Alert } from './Blocks'
import { Button } from './Button'
import { Field } from './Field'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The overlays that are open, innermost last: only the innermost one answers Escape and Tab. */
const openOverlays: symbol[] = []

/**
 * What every overlay needs: focus moves in when it opens and returns to where it was when it closes, Tab stays
 * inside, Escape closes, and the page behind does not scroll.
 */
function useOverlay(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)

  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const token = Symbol('overlay')
    openOverlays.push(token)
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // the first field if there is one, otherwise the panel itself
    const first = node?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select')
    ;(first ?? node)?.focus({ preventScroll: true })

    const onKey = (event: KeyboardEvent) => {
      if (openOverlays[openOverlays.length - 1] !== token) return

      if (event.key === 'Escape') {
        close.current()
        return
      }
      if (event.key !== 'Tab' || !node) return

      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null)
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const firstItem = items[0]!
      const lastItem = items[items.length - 1]!
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      openOverlays.splice(openOverlays.indexOf(token), 1)
      document.body.style.overflow = overflow
      previous?.focus({ preventScroll: true })
    }
  }, [])

  return ref
}

/** A panel that slides in from the right (full screen on a phone). Mounted only while open. */
export function Drawer({ title, subtitle, onClose, children, footer }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useOverlay(onClose)

  return createPortal(
    <div className="drawer">
      <div className="drawer__scrim" onClick={onClose} aria-hidden="true" />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Details'} ref={ref} tabIndex={-1}>
        <div className="drawer__head">
          <div className="drawer__title">
            <h2>{title}</h2>
            {subtitle && <div className="muted small">{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" icon={<X size={18} />} />
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useOverlay(onClose)

  return createPortal(
    <div className="dialog">
      <div className="dialog__scrim" onClick={onClose} aria-hidden="true" />
      <div className={wide ? 'dialog__panel dialog__panel--wide' : 'dialog__panel'} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export interface ConfirmSpec {
  title: string
  body: ReactNode
  confirmLabel: string
  danger?: boolean
  /** The operator must type this exactly before the button works: for actions that cannot be undone. */
  typeToConfirm?: string
  run: () => Promise<unknown>
}

function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec; onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blocked = spec.typeToConfirm !== undefined && typed.trim().toLowerCase() !== spec.typeToConfirm.toLowerCase()

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await spec.run()
      onClose()
    } catch (failure) {
      setError(messageOf(failure))
      setPending(false)
    }
  }

  return (
    <Dialog title={spec.title} onClose={pending ? () => {} : onClose}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!blocked) void confirm()
        }}
      >
        <div className="small">{spec.body}</div>
        {spec.typeToConfirm !== undefined && (
          <Field label={`Type ${spec.typeToConfirm} to confirm`}>
            {(props) => <input className="input" {...props} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />}
          </Field>
        )}
        {error && <Alert tone="bad">{error}</Alert>}
        <div className="dialog__actions">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant={spec.danger ? 'danger' : 'primary'} loading={pending} disabled={blocked}>
            {spec.confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** `const { ask, dialog } = useConfirm()`: call ask(spec) from a click handler and render {dialog} once. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null)
  const close = useCallback(() => setSpec(null), [])

  return { ask: setSpec, dialog: spec ? <ConfirmDialog spec={spec} onClose={close} /> : null }
}
