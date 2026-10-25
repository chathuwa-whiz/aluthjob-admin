import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { Shell } from './layout/Shell'
import { Login, AccessDenied } from './pages/Login'

// Each screen is its own chunk: the sign-in screen and the shell load first, the rest as they are opened
const Overview = lazy(() => import('./pages/Overview').then((module) => ({ default: module.Overview })))
const Jobs = lazy(() => import('./pages/Jobs').then((module) => ({ default: module.Jobs })))
const Collection = lazy(() => import('./pages/Collection').then((module) => ({ default: module.Collection })))
const Matches = lazy(() => import('./pages/Matches').then((module) => ({ default: module.Matches })))
const Applications = lazy(() => import('./pages/Applications').then((module) => ({ default: module.Applications })))
const Users = lazy(() => import('./pages/Users').then((module) => ({ default: module.Users })))
const Resumes = lazy(() => import('./pages/Resumes').then((module) => ({ default: module.Resumes })))
const Mailboxes = lazy(() => import('./pages/Mailboxes').then((module) => ({ default: module.Mailboxes })))
const Sessions = lazy(() => import('./pages/Sessions').then((module) => ({ default: module.Sessions })))
const Audit = lazy(() => import('./pages/Audit').then((module) => ({ default: module.Audit })))
const System = lazy(() => import('./pages/System').then((module) => ({ default: module.System })))
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })))

export default function App() {
  const { state, signOut } = useAuth()

  if (state.status === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }} role="status" aria-label="Loading">
        <span className="spinner" style={{ width: '1.5rem', height: '1.5rem', color: 'var(--primary)' }} />
      </div>
    )
  }

  if (state.status === 'signed-out') return <Login />
  if (state.status === 'denied') return <AccessDenied email={state.user.email} onSignOut={() => void signOut()} />

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="collection" element={<Collection />} />
        <Route path="matches" element={<Matches />} />
        <Route path="applications" element={<Applications />} />
        <Route path="users" element={<Users />} />
        <Route path="resumes" element={<Resumes />} />
        <Route path="mailboxes" element={<Mailboxes />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="audit" element={<Audit />} />
        <Route path="system" element={<System />} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
