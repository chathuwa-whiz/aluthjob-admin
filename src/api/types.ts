// Shapes returned by the API (server/src/admin, server/src/routes/admin.routes.ts).
// Kept in one file so a change on the server shows up here first.

export type Role = 'user' | 'admin'

export interface SessionUser {
  id: number
  email: string
  role: Role
  createdAt: string
  emailVerified: boolean
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type JobSource = 'topjobs' | 'observerjobs' | 'jobpal' | 'governmentjobs' | 'rooster' | 'dreamjobs' | 'ikman' | 'xpress' | 'findmyjob' | 'finders'
export type MatchStatus = 'suggested' | 'approved' | 'rejected'
export type ApplicationStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled'

// ---- overview ----

export interface DailyPoint {
  date: string
  signups: number
  jobs: number
  sent: number
  matches: number
}

export interface SourceBreakdown {
  source: JobSource
  total: number
  open: number
  withEmail: number
  unenriched: number
  lastSeenAt: string | null
}

export interface Overview {
  users: { total: number; verified: number; admins: number; last7Days: number; last30Days: number; liveSessions: number }
  candidates: { total: number; withoutOwner: number; mailboxes: number }
  jobs: { total: number; open: number; withEmail: number; unenriched: number; last24Hours: number; lastSeenAt: string | null }
  matches: Partial<Record<MatchStatus, number>>
  applications: Partial<Record<ApplicationStatus, number>>
  sources: SourceBreakdown[]
  daily: DailyPoint[]
}

// ---- users ----

export interface AdminUser {
  id: number
  email: string
  role: Role
  createdAt: string
  lastLoginAt: string | null
  emailVerified: boolean
  resumes: number
  liveSessions: number
}

export interface UserResume {
  id: number
  fileName: string
  fileBytes: number
  createdAt: string
  updatedAt: string
  matches: number
  sent: number
  hasMailbox: boolean
}

export interface UserSession {
  id: number
  createdAt: string
  expiresAt: string
  userAgent: string | null
  expired: boolean
}

export interface UserDetail {
  user: AdminUser
  resumes: UserResume[]
  sessions: UserSession[]
}

// ---- resumes ----

export interface Profile {
  personalInfo: {
    fullName: string | null
    email: string | null
    phone: string | null
    location: string | null
    linkedin: string | null
    portfolio: string | null
  }
  skills: string[]
  education: { institution: string | null; degree: string | null; field: string | null; startDate: string | null; endDate: string | null }[]
  experience: { company: string | null; position: string | null; startDate: string | null; endDate: string | null; responsibilities: string[] }[]
  certifications: string[]
  achievements: { description: string }[]
}

export interface AdminCandidate {
  id: number
  userId: number | null
  ownerEmail: string | null
  fileName: string
  mimeType: string
  fileBytes: number
  fullName: string | null
  createdAt: string
  updatedAt: string
  matches: number
  sent: number
  hasMailbox: boolean
}

export interface MailAccount {
  candidateId: number
  email: string
  fromName: string | null
  host: string
  port: number
  secure: boolean
  username: string
  verifiedAt: string
}

export interface SiteProgress {
  source: JobSource
  state: 'reading' | 'done' | 'failed'
  fetched: number
  error?: string
}

export interface RunProgress {
  candidateId: number
  status: 'running' | 'done' | 'failed'
  phase: 'starting' | 'collecting' | 'ranking' | 'reading' | 'drafting' | 'done' | 'failed'
  startedAt: string
  elapsedMs: number
  sites: SiteProgress[]
  considered: number | null
  adverts: { done: number; total: number; current: { title: string; company: string | null; source: string } | null }
  letters: { done: number; total: number; current: { title: string; company: string | null; source: string } | null }
  matched: number | null
  topScore: number | null
  activity: { at: string; text: string }[]
  summary: { considered: number; matched: number; enriched: number; drafted: number; topScore: number | null; collected: number; sourcesFailed: number } | null
  error: string | null
}

export interface CandidateDetail extends AdminCandidate {
  profile: Profile
  mailbox: MailAccount | null
  run: RunProgress | null
}

// ---- vacancies ----

export interface AdminJob {
  id: number
  source: JobSource
  externalId: string
  url: string
  title: string
  company: string | null
  location: string | null
  jobType: string | null
  category: string | null
  postedAt: string | null
  closingAt: string | null
  applyEmail: string | null
  applyEmailSource: 'page' | 'image' | null
  enrichedAt: string | null
  enrichFailures: number
  firstSeenAt: string
  lastSeenAt: string
  descriptionChars: number
  matches: number
}

export interface AdminJobDetail extends AdminJob {
  description: string | null
  salary: string | null
  applyUrl: string | null
}

export type JobEdit = Partial<{
  title: string
  company: string | null
  location: string | null
  jobType: string | null
  salary: string | null
  category: string | null
  postedAt: string | null
  closingAt: string | null
  applyEmail: string | null
  applyUrl: string | null
  description: string | null
}>

// ---- collection ----

export interface IngestResult {
  source: JobSource
  fetched: number
  inserted: number
  updated: number
  error?: string
}

export interface CollectionRun {
  startedAt: string
  finishedAt: string | null
  trigger: string
  results: IngestResult[]
  error: string | null
}

export interface EnrichBatchResult {
  source: JobSource
  attempted: number
  enriched: number
  failed: number
}

export interface EnrichmentStatus {
  running: boolean
  startedAt: string | null
  finishedAt: string | null
  sources: JobSource[]
  limit: number
  results: EnrichBatchResult[]
  error: string | null
}

export interface CollectionStatus {
  running: boolean
  startedAt: string | null
  trigger: string | null
  sites: SiteProgress[]
  last: CollectionRun | null
  sources: JobSource[]
  enrichment: EnrichmentStatus
}

// ---- matches ----

export interface AdminMatch {
  id: number
  candidateId: number
  jobId: number
  score: number
  status: MatchStatus
  hasLetter: boolean
  createdAt: string
  decidedAt: string | null
  jobTitle: string
  company: string | null
  source: JobSource
  candidateName: string | null
  ownerEmail: string | null
  applicationStatus: ApplicationStatus | null
}

export interface MatchDetail {
  match: {
    id: number
    candidateId: number
    jobId: number
    score: number
    details: {
      breakdown: { skills: number; title: number; content: number; experience: number; location: number }
      matchedSkills: string[]
      reasons: string[]
      warnings: string[]
    }
    status: MatchStatus
    subject: string | null
    coverLetter: string | null
    draftedAt: string | null
    decidedAt: string | null
    appliedOnSiteAt?: string | null
    confirmedEmail: string | null
    createdAt: string
    updatedAt: string
    applyMethod: 'email' | 'portal'
    job: {
      id: number
      source: JobSource
      url: string
      title: string
      company: string | null
      location: string | null
      closingAt: string | null
      applyEmail: string | null
      applyEmailSource: 'page' | 'image' | null
      applyUrl: string | null
    }
  }
  owner: { candidateId: number; ownerEmail: string | null; candidateName: string | null; applicationId: number | null }
  application: AdminApplicationDetail | null
}

// ---- applications ----

export interface AdminApplication {
  id: number
  matchId: number
  candidateId: number
  toEmail: string
  status: ApplicationStatus
  attempts: number
  nextAttemptAt: string
  error: string | null
  queuedAt: string
  sentAt: string | null
  updatedAt: string
  jobTitle: string
  company: string | null
  ownerEmail: string | null
}

export interface AdminApplicationDetail extends AdminApplication {
  messageId: string | null
  sentSubject: string | null
  sentBody: string | null
}

// ---- mailboxes, sessions, audit ----

export interface AdminMailbox {
  candidateId: number
  email: string
  fromName: string | null
  host: string
  port: number
  secure: boolean
  username: string
  verifiedAt: string
  updatedAt: string
  resume: string
  ownerEmail: string | null
  sent: number
}

export interface AdminSession {
  id: number
  userId: number
  email: string
  role: Role
  createdAt: string
  expiresAt: string
  userAgent: string | null
  current: boolean
}

export interface AuditEntry {
  id: number
  adminId: number
  adminEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  summary: string | null
  ip: string | null
  createdAt: string
}

// ---- system ----

export interface SystemInfo {
  server: { node: string; environment: string; uptimeSeconds: number; memoryMb: number; startedAt: string }
  database: { ok: boolean; latencyMs: number | null; error: string | null }
  model: {
    provider: 'groq' | 'ollama'
    groqModel: string
    ollamaModel: string
    keys: { total: number; usable: number; resting: { key: string; seconds: number }[] }
  }
  mail: {
    systemMailReady: boolean
    systemSmtpConfigured: boolean
    applicationSecretSet: boolean
    worker: { enabled: boolean; running: boolean; lastTick: { at: string; result: string } | null; lastError: { at: string; message: string } | null }
    dailyLimit: number
    sendGapSeconds: number
    queue: { queued: number; dueNow: number; oldestQueuedAt: string | null } | null
  }
  collection: {
    running: boolean
    startedAt: string | null
    trigger: string | null
    sites: SiteProgress[]
    last: CollectionRun | null
    sources: JobSource[]
    intervalMinutes: number
    maxAgeHours: number
    maxPages: number
    enrichPerRun: number
    enrichment: EnrichmentStatus
  }
  ocr: { languages: string; minEmailConfidence: number }
  security: { allowedOrigins: string[]; cookieSecure: boolean; trustProxy: string | null; sessionDays: number }
}
