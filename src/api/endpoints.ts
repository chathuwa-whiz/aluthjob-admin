import { del, get, patch, post, put, query } from './client'
import type {
  AdminApplication,
  AdminApplicationDetail,
  AdminCandidate,
  AdminJob,
  AdminJobDetail,
  AdminMailbox,
  AdminMatch,
  AdminSession,
  AdminUser,
  AuditEntry,
  CandidateDetail,
  CollectionStatus,
  EnrichmentStatus,
  JobEdit,
  JobSource,
  MatchDetail,
  Overview,
  Page,
  Profile,
  RunProgress,
  SessionUser,
  SystemInfo,
  UserDetail,
} from './types'

export type Params = Record<string, string | number | boolean | undefined | null>

// Every call the console makes, in one place. Paths mirror server/src/routes/admin.routes.ts.

export const auth = {
  me: () => get<{ user: SessionUser }>('/auth/me', { answers401: true }),
  login: (email: string, password: string) => post<{ user: SessionUser }>('/auth/login', { email, password }, { answers401: true }),
  logout: () => post<{ signedOut: boolean }>('/auth/logout', undefined, { answers401: true }),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ changed: boolean }>('/auth/change-password', { currentPassword, newPassword }, { answers401: true }),
}

export const overview = () => get<Overview>('/admin/overview')
export const system = () => get<SystemInfo>('/admin/system')

export const users = {
  list: (params: Params) => get<Page<AdminUser>>(`/admin/users${query(params)}`),
  detail: (id: number) => get<UserDetail>(`/admin/users/${id}`),
  create: (body: { email: string; password: string; role: 'user' | 'admin'; verified: boolean }) => post<AdminUser>('/admin/users', body),
  update: (id: number, body: { role?: 'user' | 'admin'; emailVerified?: true }) => patch<AdminUser>(`/admin/users/${id}`, body),
  signOut: (id: number) => post<{ signedOut: number }>(`/admin/users/${id}/sign-out`),
  sendReset: (id: number) => post<{ sent: boolean }>(`/admin/users/${id}/send-reset`),
  remove: (id: number) => del<{ deleted: boolean }>(`/admin/users/${id}`),
}

export const candidates = {
  list: (params: Params) => get<Page<AdminCandidate>>(`/admin/candidates${query(params)}`),
  detail: (id: number) => get<CandidateDetail>(`/admin/candidates/${id}`),
  saveProfile: (id: number, profile: Profile) => put<unknown>(`/admin/candidates/${id}/profile`, profile),
  setOwner: (id: number, userId: number | null) => put<AdminCandidate>(`/admin/candidates/${id}/owner`, { userId }),
  remove: (id: number) => del<{ deleted: boolean }>(`/admin/candidates/${id}`),
  runSearch: (id: number) => post<RunProgress>(`/admin/candidates/${id}/matches/run`, {}),
}

export const jobs = {
  list: (params: Params) => get<Page<AdminJob>>(`/admin/jobs${query(params)}`),
  detail: (id: number) => get<AdminJobDetail>(`/admin/jobs/${id}`),
  update: (id: number, body: JobEdit) => patch<AdminJobDetail>(`/admin/jobs/${id}`, body),
  enrich: (id: number, force: boolean) => post<AdminJobDetail>(`/admin/jobs/${id}/enrich`, { force }),
  remove: (id: number) => del<{ deleted: boolean }>(`/admin/jobs/${id}`),
  removeMany: (ids: number[]) => post<{ deleted: number }>('/admin/jobs/delete', { ids }),
  purgeClosed: (days: number, source?: JobSource) => post<{ deleted: number }>('/admin/jobs/purge-closed', { days, source }),
}

export const collection = {
  status: () => get<CollectionStatus>('/admin/collection'),
  run: (sources?: JobSource[], maxPages?: number) => post<unknown>('/admin/collection/run', { sources, maxPages }),
  enrich: (sources: JobSource[], limit: number) => post<EnrichmentStatus>('/admin/collection/enrich', { sources, limit }),
}

export const matches = {
  list: (params: Params) => get<Page<AdminMatch>>(`/admin/matches${query(params)}`),
  detail: (id: number) => get<MatchDetail>(`/admin/matches/${id}`),
  editLetter: (id: number, body: { subject?: string; coverLetter?: string }) => patch<unknown>(`/admin/matches/${id}`, body),
  reject: (id: number) => post<unknown>(`/admin/matches/${id}/reject`),
  reopen: (id: number) => post<unknown>(`/admin/matches/${id}/reopen`),
  remove: (id: number) => del<{ deleted: boolean }>(`/admin/matches/${id}`),
}

export const applications = {
  list: (params: Params) => get<Page<AdminApplication>>(`/admin/applications${query(params)}`),
  detail: (id: number) => get<AdminApplicationDetail>(`/admin/applications/${id}`),
  cancel: (id: number) => post<unknown>(`/admin/applications/${id}/cancel`),
  retry: (id: number) => post<unknown>(`/admin/applications/${id}/retry`),
  remove: (id: number) => del<{ deleted: boolean }>(`/admin/applications/${id}`),
  cancelQueued: () => post<{ cancelled: number }>('/admin/applications/cancel-queued'),
}

export const mailboxes = {
  list: (params: Params) => get<Page<AdminMailbox>>(`/admin/mailboxes${query(params)}`),
  disconnect: (candidateId: number) => del<{ removed: boolean }>(`/admin/mailboxes/${candidateId}`),
}

export const sessions = {
  list: (params: Params) => get<Page<AdminSession>>(`/admin/sessions${query(params)}`),
  revoke: (id: number) => del<{ revoked: boolean }>(`/admin/sessions/${id}`),
  purgeExpired: () => post<{ purged: number }>('/admin/sessions/purge-expired'),
}

export const audit = {
  list: (params: Params) => get<Page<AuditEntry>>(`/admin/audit${query(params)}`),
  actions: () => get<string[]>('/admin/audit/actions'),
}
