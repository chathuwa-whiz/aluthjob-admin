import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, setUnauthenticatedHandler } from '../api/client'
import * as api from '../api/endpoints'
import type { SessionUser } from '../api/types'

type State =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: SessionUser }
  /** Signed in as somebody who is not an administrator. */
  | { status: 'denied'; user: SessionUser }

interface AuthApi {
  state: State
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

const NOT_ADMIN = 'This account is not an administrator. Administrator access is granted on the server with npm run make-admin.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const client = useQueryClient()

  const settle = useCallback((user: SessionUser): State => (user.role === 'admin' ? { status: 'signed-in', user } : { status: 'denied', user }), [])

  // Who is signed in? Asked once on load; any 401 later returns to the sign-in screen.
  useEffect(() => {
    let cancelled = false
    api.auth.me().then(
      ({ user }) => !cancelled && setState(settle(user)),
      () => !cancelled && setState({ status: 'signed-out' }),
    )

    setUnauthenticatedHandler(() => {
      client.clear()
      setState({ status: 'signed-out' })
    })

    return () => {
      cancelled = true
      setUnauthenticatedHandler(undefined)
    }
  }, [client, settle])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user } = await api.auth.login(email, password)

      if (user.role !== 'admin') {
        // an ordinary account must not stay signed in through this site
        await api.auth.logout().catch(() => undefined)
        throw new ApiError(NOT_ADMIN, 403)
      }

      setState(settle(user))
    },
    [settle],
  )

  const signOut = useCallback(async () => {
    await api.auth.logout().catch(() => undefined)
    client.clear()
    setState({ status: 'signed-out' })
  }, [client])

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthApi {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth needs an AuthProvider')
  return value
}

/** The signed-in administrator. Only used below the sign-in gate. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin(): SessionUser {
  const { state } = useAuth()
  if (state.status !== 'signed-in') throw new Error('useAdmin outside the gate')
  return state.user
}
