import type { ApplicationStatus, JobSource, MatchStatus } from '../api/types'

const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const dateTimeYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const shortDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export const formatDate = (iso: string | null | undefined) => (iso ? date.format(new Date(iso)) : '')
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : '')
export const formatFullDateTime = (iso: string | null | undefined) => (iso ? dateTimeYear.format(new Date(iso)) : '')
/** "2026-10-25" (a UTC day from the daily series) as "25 Oct" */
export const formatDay = (day: string) => shortDay.format(new Date(`${day}T00:00:00Z`))

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "2 days ago", "in 3 hours", "just now" */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return ''

  const diff = new Date(iso).getTime() - now
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return relative.format(Math.round(diff / size), unit)
  }
  return 'just now'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 93784 seconds as "1d 2h", 3700 as "1h 1m" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const days = Math.floor(s / 86_400)
  const hours = Math.floor((s % 86_400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${s % 60}s`
  return `${s}s`
}

export const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value)

/** "Chrome on Windows" from a user-agent string, good enough to tell sessions apart. */
export function describeAgent(agent: string | null): string {
  if (!agent) return 'Unknown device'

  const browser = /Edg\//.test(agent) ? 'Edge' : /OPR\/|Opera/.test(agent) ? 'Opera' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : /curl|node|axios|undici|python/i.test(agent) ? 'Script' : 'Browser'
  const system = /Windows/.test(agent) ? 'Windows' : /Android/.test(agent) ? 'Android' : /iPhone|iPad|iOS/.test(agent) ? 'iOS' : /Mac OS X|Macintosh/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : null

  return system ? `${browser} on ${system}` : browser
}

export const SOURCE_LABEL: Record<JobSource, string> = {
  topjobs: 'TopJobs',
  observerjobs: 'Observer Jobs',
  jobpal: 'Jobpal',
  governmentjobs: 'Government Jobs',
  rooster: 'Rooster',
  dreamjobs: 'DreamJobs',
  ikman: 'ikman.lk',
  xpress: 'Xpress Jobs',
}

export const SOURCES = Object.keys(SOURCE_LABEL) as JobSource[]

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'brand'

export const MATCH_STATUS: Record<MatchStatus, { label: string; tone: Tone }> = {
  suggested: { label: 'To review', tone: 'neutral' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Skipped', tone: 'warn' },
}

export const APPLICATION_STATUS: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  queued: { label: 'Queued', tone: 'info' },
  sending: { label: 'Sending', tone: 'info' },
  sent: { label: 'Sent', tone: 'ok' },
  failed: { label: 'Failed', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

/** What an audit-trail action code means, in words. Unknown codes are shown as they are. */
export const ACTION_LABEL: Record<string, string> = {
  'user.create': 'Created a user',
  'user.promote': 'Made a user an administrator',
  'user.demote': 'Removed administrator access',
  'user.verify-email': 'Marked an email address verified',
  'user.sign-out': 'Signed a user out everywhere',
  'user.send-reset': 'Sent a password reset email',
  'user.delete': 'Deleted a user',
  'resume.download': 'Downloaded a resume',
  'resume.edit-profile': 'Edited a resume profile',
  'resume.reassign': 'Moved a resume to another user',
  'resume.delete': 'Deleted a resume',
  'resume.run-search': 'Started a vacancy search',
  'job.edit': 'Edited a vacancy',
  'job.enrich': 'Read a vacancy advert',
  'job.delete': 'Deleted a vacancy',
  'job.delete-many': 'Deleted vacancies',
  'job.purge-closed': 'Removed closed vacancies',
  'collection.run': 'Started a collection',
  'collection.enrich': 'Started reading adverts',
  'match.edit-letter': 'Edited a cover letter',
  'match.reject': 'Skipped a match',
  'match.reopen': 'Reopened a match',
  'match.delete': 'Deleted a match',
  'application.cancel': 'Cancelled an application',
  'application.cancel-all-queued': 'Cancelled every queued application',
  'application.retry': 'Retried an application',
  'application.delete': 'Deleted an application',
  'mailbox.disconnect': 'Disconnected a mailbox',
  'session.revoke': 'Ended a session',
  'session.purge-expired': 'Purged expired sessions',
}

export const actionLabel = (action: string) => ACTION_LABEL[action] ?? action

export const scoreTone =(score: number): Tone => (score >= 65 ? 'ok' : score >= 50 ? 'brand' : 'neutral')

/** Only plain http(s) addresses become links: vacancy pages are scraped, so any address could be javascript:. */
export function safeHref(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export const plural = (count: number, one: string, many = `${one}s`) => `${formatNumber(count)} ${count === 1 ? one : many}`

/** "2026-11-01T23:59:59.999Z" as "2026-11-01" for a date input */
export const dateInputValue = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '')
