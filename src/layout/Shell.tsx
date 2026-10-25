import {
  Briefcase,
  ClipboardText,
  CloudArrowDown,
  Cpu,
  Desktop,
  EnvelopeSimple,
  FileText,
  Key,
  List,
  LockKey,
  MagnifyingGlass,
  Moon,
  PaperPlaneTilt,
  SignOut,
  SquaresFour,
  Sun,
  Target,
  Users,
  X,
  type Icon,
} from '@phosphor-icons/react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useOverview } from '../api/queries'
import { useAdmin, useAuth } from '../auth/AuthProvider'
import { SkeletonRows } from '../ui/Blocks'
import { Button } from '../ui/Button'
import { PasswordDialog } from './AccountDialog'
import { Palette } from './Palette'

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'aj-admin-theme'

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  function cycle() {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)

    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.dataset.theme = next
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, next)
    } catch {
      // storage can be blocked; the choice then lasts until the page closes
    }
  }

  return { theme, cycle }
}

function Brand() {
  return (
    <NavLink to="/" className="brand" end>
      <img className="brand__mark" src="/logo.png" alt="" width={28} height={28} />
      AluthJob
      <span className="brand__tag">Admin</span>
    </NavLink>
  )
}

interface NavItem {
  to: string
  label: string
  icon: Icon
  end?: boolean
}

const GROUPS: { heading?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Overview', icon: SquaresFour, end: true }] },
  {
    heading: 'Operations',
    items: [
      { to: '/jobs', label: 'Vacancies', icon: Briefcase },
      { to: '/collection', label: 'Collection', icon: CloudArrowDown },
      { to: '/matches', label: 'Matches', icon: Target },
      { to: '/applications', label: 'Applications', icon: PaperPlaneTilt },
    ],
  },
  {
    heading: 'People',
    items: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/resumes', label: 'Resumes', icon: FileText },
      { to: '/mailboxes', label: 'Mailboxes', icon: EnvelopeSimple },
      { to: '/sessions', label: 'Sessions', icon: Key },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/audit', label: 'Audit log', icon: ClipboardText },
      { to: '/system', label: 'System', icon: Cpu },
    ],
  },
]

const THEME_ICON = { system: Desktop, light: Sun, dark: Moon } as const

export function Shell() {
  const admin = useAdmin()
  const { signOut } = useAuth()
  const overview = useOverview()
  const { theme, cycle } = useTheme()
  const location = useLocation()

  // The menu is open for the page it was opened on, so choosing a destination closes it with no extra effect
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const menuOpen = openedOn === location.pathname
  const setMenuOpen = (open: boolean) => setOpenedOn(open ? location.pathname : null)
  const [searching, setSearching] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  // A single-page app does not move focus on navigation; without this a keyboard user stays on the link they pressed.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearching(true)
      }
      if (event.key === 'Escape') setOpenedOn(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const failed = overview.data?.applications.failed ?? 0
  const ThemeIcon = THEME_ICON[theme]
  const themeLabel = theme === 'system' ? 'Theme: follows the system' : `Theme: ${theme}`

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <div className="topbar">
        <Brand />
        <div className="topbar__right">
          <Button variant="ghost" onClick={() => setSearching(true)} aria-label="Search and jump" icon={<MagnifyingGlass size={20} />} />
          <Button ref={menuButton} variant="ghost" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="site-nav" icon={<List size={20} />} />
        </div>
      </div>

      {menuOpen && <div className="nav-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside className="sidebar" id="site-nav" data-open={menuOpen}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Brand />
          {menuOpen && <Button variant="ghost" size="sm" onClick={() => setMenuOpen(false)} aria-label="Close menu" icon={<X size={18} />} />}
        </div>

        <button type="button" className="btn" onClick={() => setSearching(true)} style={{ justifyContent: 'flex-start', color: 'var(--muted)' }}>
          <MagnifyingGlass size={16} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search or jump</span>
          <span className="kbd">Ctrl K</span>
        </button>

        <nav className="nav" aria-label="Main">
          {GROUPS.map((group, position) => (
            <div className="nav__group" key={group.heading ?? position}>
              {group.heading && <span className="nav__heading">{group.heading}</span>}
              {group.items.map(({ to, label, icon: ItemIcon, end }) => (
                <NavLink key={to} to={to} end={end} className="nav__link">
                  <ItemIcon size={18} />
                  {label}
                  {to === '/applications' && failed > 0 && (
                    <span className="nav__count">
                      {failed}
                      <span className="visually-hidden"> failed</span>
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="who">
            <span className="who__email">{admin.email}</span>
            <span className="muted xsmall">Administrator</span>
          </div>
          <div className="nav">
            <button type="button" className="nav__link" onClick={cycle} aria-label={themeLabel} title={themeLabel}>
              <ThemeIcon size={18} />
              {theme === 'system' ? 'Theme: system' : theme === 'light' ? 'Theme: light' : 'Theme: dark'}
            </button>
            <button type="button" className="nav__link" onClick={() => setChangingPassword(true)}>
              <LockKey size={18} />
              Change password
            </button>
            <button type="button" className="nav__link" onClick={() => void signOut()}>
              <SignOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="main" id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Suspense fallback={<div className="page" role="status" aria-label="Loading"><SkeletonRows rows={6} /></div>}>
          <Outlet />
        </Suspense>
      </main>

      {searching && <Palette onClose={() => setSearching(false)} />}
      {changingPassword && <PasswordDialog onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
