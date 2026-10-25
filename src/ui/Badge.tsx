import type { ReactNode } from 'react'
import { APPLICATION_STATUS, MATCH_STATUS, scoreTone, type Tone } from '../lib/format'
import { cx } from '../lib/cx'
import type { ApplicationStatus, MatchStatus } from '../api/types'

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={cx('badge', tone !== 'neutral' && `badge--${tone}`)} title={title}>
      {children}
    </span>
  )
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const { label, tone } = MATCH_STATUS[status]
  return <Badge tone={tone}>{label}</Badge>
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, tone } = APPLICATION_STATUS[status]
  return <Badge tone={tone}>{label}</Badge>
}

export function ScoreBadge({ score }: { score: number }) {
  return <Badge tone={scoreTone(score)}>{score}</Badge>
}
