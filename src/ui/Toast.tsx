import { X } from '@phosphor-icons/react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'

interface ToastItem {
  id: number
  text: string
  tone: 'ok' | 'bad'
}

interface ToastApi {
  success: (text: string) => void
  error: (text: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const next = useRef(1)

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])

  const push = useCallback(
    (tone: ToastItem['tone'], text: string) => {
      const id = next.current++
      setItems((current) => [...current.slice(-3), { id, text, tone }])
      // an error stays long enough to read
      setTimeout(() => dismiss(id), tone === 'bad' ? 9000 : 4500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ success: (text) => push('ok', text), error: (text) => push('bad', text) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications">
        {items.map((item) => (
          <div key={item.id} className={cx('toast', item.tone === 'bad' && 'toast--bad')} role={item.tone === 'bad' ? 'alert' : 'status'}>
            <span className="toast__text">{item.text}</span>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast needs a ToastProvider')
  return api
}
