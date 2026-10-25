import { EnvelopeSimple, SealCheck, ShieldCheck, ShieldSlash, SignOut, Trash, UserPlus, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { messageOf } from '../api/client'
import * as api from '../api/endpoints'
import { useUser, useUsers } from '../api/queries'
import type { AdminUser } from '../api/types'
import { useAdmin } from '../auth/AuthProvider'
import { describeAgent, formatBytes, formatDate, formatFullDateTime, formatNumber, timeAgo } from '../lib/format'
import { useListParams, useOpenParam, usePageTitle, useUrlSearch } from '../lib/hooks'
import { Badge } from '../ui/Badge'
import { Alert, Empty, ErrorState, KeyValue, PageHeader, Section, SkeletonRows } from '../ui/Blocks'
import { Button } from '../ui/Button'
import type { Column } from '../ui/DataTable'
import { Check, FilterSelect, SearchInput, SelectField, TextField } from '../ui/Field'
import { ListPanel } from '../ui/ListPanel'
import { Dialog, Drawer, useConfirm } from '../ui/Overlay'
import { useAction } from '../ui/useAction'

function UserBadges({ user }: { user: AdminUser }) {
  return (
    <>
      {user.role === 'admin' && <Badge tone="brand">Administrator</Badge>}
      {!user.emailVerified && <Badge tone="warn">Not verified</Badge>}
    </>
  )
}

export function Users() {
  usePageTitle('Users')
  const params = useListParams()
  const { id: openId, open } = useOpenParam()
  const [search, setSearch] = useUrlSearch(params)
  const [creating, setCreating] = useState(false)

  const result = useUsers({
    limit: params.limit,
    offset: params.offset,
    search: params.get('search'),
    role: params.get('role'),
    verified: params.get('verified'),
    sort: params.get('sort'),
  })

  const columns: Column<AdminUser>[] = [
    {
      key: 'email',
      header: 'User',
      primary: true,
      cell: (user) => (
        <div className="cell-stack">
          <span className="cell-title wrap">{user.email}</span>
          <span className="chips">
            <UserBadges user={user} />
          </span>
        </div>
      ),
    },
    { key: 'resumes', header: 'Resumes', num: true, cell: (user) => user.resumes },
    { key: 'sessions', header: 'Sessions', num: true, cell: (user) => user.liveSessions },
    { key: 'login', header: 'Last sign-in', cell: (user) => (user.lastLoginAt ? timeAgo(user.lastLoginAt) : <span className="muted">Never</span>) },
    { key: 'joined', header: 'Joined', cell: (user) => formatDate(user.createdAt) },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Users"
        description="Every account. Open one to change its role, end its sessions or remove it."
        actions={
          <Button variant="primary" icon={<UserPlus size={18} />} onClick={() => setCreating(true)}>
            New user
          </Button>
        }
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by email" label="Search users" />
        <FilterSelect label="Role" value={params.get('role')} onChange={(value) => params.set({ role: value })}>
          <option value="">Any role</option>
          <option value="admin">Administrators</option>
          <option value="user">Regular users</option>
        </FilterSelect>
        <FilterSelect label="Email verification" value={params.get('verified')} onChange={(value) => params.set({ verified: value })}>
          <option value="">Verified or not</option>
          <option value="true">Verified</option>
          <option value="false">Not verified</option>
        </FilterSelect>
        <FilterSelect label="Sort" value={params.get('sort') || 'newest'} onChange={(value) => params.set({ sort: value === 'newest' ? '' : value })}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="recent_login">Recently signed in</option>
          <option value="email">Email A to Z</option>
        </FilterSelect>
      </div>

      <ListPanel
        result={result}
        columns={columns}
        rowId={(user) => user.id}
        label="Users"
        offset={params.offset}
        limit={params.limit}
        onPage={(offset) => params.set({ offset })}
        onRowClick={(user) => open(user.id)}
        activeId={openId}
        empty={<Empty title="No users match">Change the filters, or create a user.</Empty>}
      />

      {openId !== null && <UserDrawer id={openId} onClose={() => open(null)} />}
      {creating && <CreateUserDialog onClose={() => setCreating(false)} onCreated={(user) => open(user.id)} />}
    </div>
  )
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (user: AdminUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [verified, setVerified] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const create = useAction(api.users.create, { success: 'User created', silent: true })

  async function submit() {
    setError(null)
    try {
      const user = await create.runOrThrow({ email: email.trim(), password, role, verified })
      onClose()
      onCreated(user)
    } catch (failure) {
      setError(messageOf(failure))
    }
  }

  return (
    <Dialog title="New user" onClose={onClose}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <TextField label="Email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField label="Starting password" type="text" autoComplete="off" hint="At least 10 characters. Share it privately; the person can change it after signing in, or use the reset email." value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} />
        <SelectField label="Role" value={role} onChange={(event) => setRole(event.target.value as 'user' | 'admin')}>
          <option value="user">Regular user</option>
          <option value="admin">Administrator</option>
        </SelectField>
        <Check label="Mark the email address as verified" checked={verified} onChange={(event) => setVerified(event.target.checked)} />
        {error && <Alert tone="bad">{error}</Alert>}
        <div className="dialog__actions">
          <Button onClick={onClose} disabled={create.pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={create.pending} disabled={!email || password.length < 10}>
            Create user
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function UserDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const me = useAdmin()
  const query = useUser(id)
  const { ask, dialog } = useConfirm()

  const update = useAction(api.users.update, { success: 'User updated' })
  const signOut = useAction(api.users.signOut, { success: (result) => `${result.signedOut} session(s) ended` })
  const sendReset = useAction(api.users.sendReset, { success: 'Reset email on its way' })
  const revoke = useAction(api.sessions.revoke, { success: 'Session ended' })
  const remove = useAction(api.users.remove, { success: 'User deleted', onSuccess: onClose, silent: true })

  const data = query.data
  const user = data?.user
  const isMe = user?.id === me.id

  return (
    <>
      <Drawer title={user?.email ?? 'User'} subtitle={user ? <span className="chips"><UserBadges user={user} /></span> : undefined} onClose={onClose}>
        {query.isError && <ErrorState error={query.error} retry={() => void query.refetch()} />}
        {!data && !query.isError && <SkeletonRows rows={6} />}

        {data && user && (
          <>
            <KeyValue
              items={[
                ['Joined', formatFullDateTime(user.createdAt)],
                ['Last sign-in', user.lastLoginAt ? `${formatFullDateTime(user.lastLoginAt)} (${timeAgo(user.lastLoginAt)})` : 'Never'],
                ['Email verified', user.emailVerified ? 'Yes' : 'No'],
                ['Role', user.role === 'admin' ? 'Administrator' : 'Regular user'],
                ['Account id', <span className="mono">{user.id}</span>],
              ]}
            />

            <Section title="Actions">
              <div className="toolbar">
                {user.role === 'user' ? (
                  <Button icon={<ShieldCheck size={18} />} disabled={isMe} loading={update.pending} onClick={() => update.run(user.id, { role: 'admin' })}>
                    Make administrator
                  </Button>
                ) : (
                  <Button icon={<ShieldSlash size={18} />} disabled={isMe} loading={update.pending} onClick={() => update.run(user.id, { role: 'user' })}>
                    Remove administrator
                  </Button>
                )}
                {!user.emailVerified && (
                  <Button icon={<SealCheck size={18} />} loading={update.pending} onClick={() => update.run(user.id, { emailVerified: true })}>
                    Mark email verified
                  </Button>
                )}
                <Button icon={<EnvelopeSimple size={18} />} loading={sendReset.pending} onClick={() => sendReset.run(user.id)}>
                  Send reset email
                </Button>
                <Button icon={<SignOut size={18} />} disabled={user.liveSessions === 0} loading={signOut.pending} onClick={() => signOut.run(user.id)}>
                  Sign out everywhere
                </Button>
              </div>
              {isMe && <p className="muted xsmall">This is your own account, so its role and removal are locked. Ask another administrator.</p>}
            </Section>

            <Section title={`Resumes (${data.resumes.length})`}>
              {data.resumes.length === 0 ? (
                <p className="muted small">This user has not uploaded a resume.</p>
              ) : (
                <ul className="rows">
                  {data.resumes.map((resume) => (
                    <li key={resume.id}>
                      <div className="rows__main">
                        <Link className="rows__title" to={`/resumes?open=${resume.id}`}>
                          {resume.fileName}
                        </Link>
                        <span className="rows__sub">
                          {formatBytes(resume.fileBytes)}, {formatNumber(resume.matches)} matches, {formatNumber(resume.sent)} sent, uploaded {formatDate(resume.createdAt)}
                        </span>
                      </div>
                      {resume.hasMailbox && <Badge tone="ok">Mailbox</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={`Sessions (${data.sessions.filter((session) => !session.expired).length} live)`}>
              {data.sessions.length === 0 ? (
                <p className="muted small">Not signed in anywhere.</p>
              ) : (
                <ul className="rows">
                  {data.sessions.map((session) => (
                    <li key={session.id}>
                      <div className="rows__main">
                        <span className="rows__title">{describeAgent(session.userAgent)}</span>
                        <span className="rows__sub">
                          Signed in {timeAgo(session.createdAt)}, {session.expired ? 'expired' : `expires ${timeAgo(session.expiresAt)}`}
                        </span>
                      </div>
                      {session.expired ? <Badge>Expired</Badge> : <Button size="sm" icon={<X size={14} />} aria-label="End this session" loading={revoke.pending} onClick={() => revoke.run(session.id)} />}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}

        {user && (
          <Section title="Danger zone">
            <p className="small muted">Deleting an account removes its resumes, matches, mailbox and application history for good.</p>
            <div>
              <Button
                variant="quiet-danger"
                icon={<Trash size={18} />}
                disabled={isMe}
                onClick={() =>
                  ask({
                    title: 'Delete this account?',
                    body: (
                      <>
                        <strong className="wrap">{user.email}</strong> and everything stored for it ({formatNumber(data?.resumes.length ?? 0)} resume(s)) will be removed. This cannot be undone.
                      </>
                    ),
                    confirmLabel: 'Delete account',
                    danger: true,
                    typeToConfirm: user.email,
                    run: () => remove.runOrThrow(user.id),
                  })
                }
              >
                Delete account
              </Button>
            </div>
          </Section>
        )}
      </Drawer>
      {dialog}
    </>
  )
}
