import { Briefcase, ClipboardText, CloudArrowDown, Cpu, EnvelopeSimple, FileText, Key, MagnifyingGlass, PaperPlaneTilt, SquaresFour, Target, Users } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

interface Entry {
  id: string
  label: string
  hint?: string
  icon: ComponentType<{ size?: number }>
  to: string
}

const PAGES: Entry[] = [
  { id: 'overview', label: 'Overview', icon: SquaresFour, to: '/' },
  { id: 'jobs', label: 'Vacancies', icon: Briefcase, to: '/jobs' },
  { id: 'collection', label: 'Collection', icon: CloudArrowDown, to: '/collection' },
  { id: 'matches', label: 'Matches', icon: Target, to: '/matches' },
  { id: 'applications', label: 'Applications', icon: PaperPlaneTilt, to: '/applications' },
  { id: 'users', label: 'Users', icon: Users, to: '/users' },
  { id: 'resumes', label: 'Resumes', icon: FileText, to: '/resumes' },
  { id: 'mailboxes', label: 'Mailboxes', icon: EnvelopeSimple, to: '/mailboxes' },
  { id: 'sessions', label: 'Sessions', icon: Key, to: '/sessions' },
  { id: 'audit', label: 'Audit log', icon: ClipboardText, to: '/audit' },
  { id: 'system', label: 'System', icon: Cpu, to: '/system' },
]

/** Jump to a screen, or search a list from anywhere. Opens with Ctrl+K / Cmd+K, or from the sidebar. */
export function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => input.current?.focus(), [])

  const entries = useMemo<Entry[]>(() => {
    const q = text.trim()
    if (!q) return PAGES

    const encoded = encodeURIComponent(q)
    const pages = PAGES.filter((page) => page.label.toLowerCase().includes(q.toLowerCase()))
    const searches: Entry[] = [
      { id: 's-users', label: `Find users matching "${q}"`, hint: 'Users', icon: MagnifyingGlass, to: `/users?search=${encoded}` },
      { id: 's-jobs', label: `Find vacancies matching "${q}"`, hint: 'Vacancies', icon: MagnifyingGlass, to: `/jobs?search=${encoded}` },
      { id: 's-resumes', label: `Find resumes matching "${q}"`, hint: 'Resumes', icon: MagnifyingGlass, to: `/resumes?search=${encoded}` },
      { id: 's-matches', label: `Find matches matching "${q}"`, hint: 'Matches', icon: MagnifyingGlass, to: `/matches?search=${encoded}` },
      { id: 's-apps', label: `Find applications matching "${q}"`, hint: 'Applications', icon: MagnifyingGlass, to: `/applications?search=${encoded}` },
    ]
    return [...pages, ...searches]
  }, [text])

  const active = Math.min(index, entries.length - 1)

  function go(entry: Entry | undefined) {
    if (!entry) return
    onClose()
    navigate(entry.to)
  }

  return createPortal(
    <div className="palette" role="dialog" aria-modal="true" aria-label="Search and jump">
      <div className="palette__scrim" onClick={onClose} aria-hidden="true" />
      <div className="palette__panel">
        <input
          ref={input}
          className="palette__input"
          placeholder="Jump to a screen or search for something"
          aria-label="Search and jump"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={entries[active] ? `palette-${entries[active].id}` : undefined}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setIndex(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setIndex((active + 1) % entries.length)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setIndex((active - 1 + entries.length) % entries.length)
            } else if (event.key === 'Enter') {
              event.preventDefault()
              go(entries[active])
            } else if (event.key === 'Escape') {
              onClose()
            }
          }}
        />
        <div className="palette__list" id="palette-list" role="listbox">
          {entries.map((entry, position) => (
            <button key={entry.id} id={`palette-${entry.id}`} type="button" role="option" aria-selected={position === active} className="palette__item" onMouseMove={() => setIndex(position)} onClick={() => go(entry)}>
              <entry.icon size={18} />
              <span className="truncate">{entry.label}</span>
              {entry.hint && <span className="palette__hint">{entry.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
