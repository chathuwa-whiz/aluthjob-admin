import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Sets the browser tab title for the current screen. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · AluthJob Admin`
  }, [title])
}

/** A value that follows `value` after it has stopped changing for `delay` ms; for search boxes. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export const PAGE_SIZE = 25

/**
 * Filters, sorting and the page live in the address bar, so a filtered list can be bookmarked, shared, and
 * survives a reload or the back button. Changing a filter returns to the first page.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams()

  const get = (key: string) => params.get(key) ?? ''
  const offset = Math.max(0, Number(params.get('offset')) || 0)

  const set = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          if (!('offset' in patch)) next.delete('offset')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return { get, offset, set, has: (key: string) => params.has(key), limit: PAGE_SIZE }
}

/**
 * A search box whose text reaches the address bar once typing pauses. Changes made to the address from outside
 * (the quick-search palette, a link) flow back into the box; the box's own echo does not overwrite what is being typed.
 */
export function useUrlSearch(params: ReturnType<typeof useListParams>, key = 'search') {
  const urlValue = params.get(key)
  const [text, setText] = useState(urlValue)
  const debounced = useDebounced(text)
  const pushed = useRef(urlValue)
  const { set } = params

  useEffect(() => {
    if (debounced !== pushed.current) {
      pushed.current = debounced
      set({ [key]: debounced })
    }
  }, [debounced, key, set])

  useEffect(() => {
    if (urlValue !== pushed.current) {
      pushed.current = urlValue
      setText(urlValue)
    }
  }, [urlValue])

  return [text, setText] as const
}

/** The record open in a side panel is part of the address (?open=12), so it can be linked and closed with Back. */
export function useOpenParam() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('open')
  const id = raw && /^\d+$/.test(raw) ? Number(raw) : null

  const open = useCallback(
    (next: number | null) => {
      setParams(
        (previous) => {
          const copy = new URLSearchParams(previous)
          if (next === null) copy.delete('open')
          else copy.set('open', String(next))
          return copy
        },
        { replace: false },
      )
    },
    [setParams],
  )

  return { id, open }
}

/** Calls `handler` when a pointer goes down outside `ref`'s element, or Escape is pressed. */
export function useDismiss(active: boolean, handler: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = useRef(handler)

  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => {
    if (!active) return

    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) latest.current()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current()
    }

    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])

  return ref
}

/** The current time, refreshed every `ms` while mounted, so relative times ("2 minutes ago") stay fresh. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(timer)
  }, [ms])

  return now
}

/** Re-renders every `ms` while mounted. */
export function useTick(ms = 30_000) {
  useNow(ms)
}
