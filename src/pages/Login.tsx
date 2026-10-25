import { ClipboardText, ShieldCheck, SquaresFour } from '@phosphor-icons/react'
import { useState } from 'react'
import { messageOf } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { usePageTitle } from '../lib/hooks'
import { Alert } from '../ui/Blocks'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'

const POINTS = [
  { icon: SquaresFour, text: 'Every account, resume, vacancy and application in one place' },
  { icon: ShieldCheck, text: 'Applicants approve their own letters; this console never does it for them' },
  { icon: ClipboardText, text: 'Every change you make is written to the audit log' },
] as const

export function Login() {
  usePageTitle('Sign in')
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setPending(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (failure) {
      setError(messageOf(failure))
      setPassword('')
      setPending(false)
    }
  }

  return (
    <div className="gate">
      <aside className="gate__aside">
        <div className="brand">
          <img className="brand__mark" src="/logo.png" alt="" width={28} height={28} />
          AluthJob
          <span className="brand__tag">Admin</span>
        </div>
        <div className="gate__lead">
          <h1>Run AluthJob from one place.</h1>
          <p>Collection, matching, the send queue and every account, with the controls to fix what goes wrong.</p>
          <ul className="gate__points">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon size={20} />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <span className="muted xsmall">Restricted. Access is logged.</span>
      </aside>

      <main className="gate__main" id="main">
        <form
          className="gate__panel"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
            <h1>Sign in</h1>
            <p className="muted small">Use your administrator account.</p>
          </div>

          {error && <Alert tone="bad">{error}</Alert>}

          <div className="form">
            <TextField label="Email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
            <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button type="submit" variant="primary" block loading={pending} disabled={!email || !password}>
              Sign in
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

export function AccessDenied({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  usePageTitle('No access')

  return (
    <div className="gate">
      <main className="gate__main" id="main" style={{ gridColumn: '1 / -1' }}>
        <div className="gate__panel">
          <h1>No administrator access</h1>
          <Alert tone="warn">
            {email} is signed in, but is not an administrator. An administrator is made on the server with <code>npm run make-admin -- {email}</code>.
          </Alert>
          <Button onClick={onSignOut}>Sign out</Button>
        </div>
      </main>
    </div>
  )
}
