import { keepPreviousData, useQuery } from '@tanstack/react-query'
import * as api from './endpoints'
import type { Params } from './endpoints'

// Query hooks. Lists keep showing the previous page while the next one loads, so filtering never blanks the table.

const list = { placeholderData: keepPreviousData } as const

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: api.overview, refetchInterval: 60_000 })
export const useSystem = () => useQuery({ queryKey: ['system'], queryFn: api.system, refetchInterval: 30_000 })

export const useCollection = () =>
  useQuery({
    queryKey: ['collection'],
    queryFn: api.collection.status,
    // follows a running collection closely, and idles otherwise
    refetchInterval: (query) => (query.state.data?.running || query.state.data?.enrichment.running ? 2000 : 20_000),
  })

export const useUsers = (params: Params) => useQuery({ queryKey: ['users', params], queryFn: () => api.users.list(params), ...list })
export const useUser = (id: number | null) => useQuery({ queryKey: ['user', id], queryFn: () => api.users.detail(id!), enabled: id !== null })

export const useCandidates = (params: Params) => useQuery({ queryKey: ['candidates', params], queryFn: () => api.candidates.list(params), ...list })
export const useCandidate = (id: number | null) =>
  useQuery({
    queryKey: ['candidate', id],
    queryFn: () => api.candidates.detail(id!),
    enabled: id !== null,
    refetchInterval: (query) => (query.state.data?.run?.status === 'running' ? 2000 : false),
  })

export const useJobs = (params: Params) => useQuery({ queryKey: ['jobs', params], queryFn: () => api.jobs.list(params), ...list })
export const useJob = (id: number | null) => useQuery({ queryKey: ['job', id], queryFn: () => api.jobs.detail(id!), enabled: id !== null })

export const useMatches = (params: Params) => useQuery({ queryKey: ['matches', params], queryFn: () => api.matches.list(params), ...list })
export const useMatch = (id: number | null) => useQuery({ queryKey: ['match', id], queryFn: () => api.matches.detail(id!), enabled: id !== null })

export const useApplications = (params: Params) =>
  useQuery({ queryKey: ['applications', params], queryFn: () => api.applications.list(params), ...list, refetchInterval: 15_000 })
export const useApplication = (id: number | null) => useQuery({ queryKey: ['application', id], queryFn: () => api.applications.detail(id!), enabled: id !== null })

export const useMailboxes = (params: Params) => useQuery({ queryKey: ['mailboxes', params], queryFn: () => api.mailboxes.list(params), ...list })
export const useSessions = (params: Params) => useQuery({ queryKey: ['sessions', params], queryFn: () => api.sessions.list(params), ...list })
export const useAudit = (params: Params) => useQuery({ queryKey: ['audit', params], queryFn: () => api.audit.list(params), ...list })
export const useAuditActions = () => useQuery({ queryKey: ['audit-actions'], queryFn: api.audit.actions })
