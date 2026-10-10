import type { Health, Lang, ReleaseDate, SourceState } from './types'

export const IST = 'Asia/Kolkata'

/** A source is stale once its last success is older than three missed refreshes (min. 30 min). */
export function staleAfterMs(refreshMinutes: number): number {
  return Math.max(refreshMinutes * 3, 30) * 60_000
}

export function sourceHealth(state: SourceState | undefined, refreshMinutes: number, now: Date): Health {
  if (!state || !state.lastSuccessAt) return state?.lastAttemptAt ? 'error' : 'pending'
  if (state.lastError) return 'error'
  if (now.getTime() - Date.parse(state.lastSuccessAt) > staleAfterMs(refreshMinutes)) return 'stale'
  return 'ok'
}

export type AgeTier = 'fresh' | 'today' | 'older'

export function ageTier(iso: string, now: Date): AgeTier {
  const minutes = (now.getTime() - Date.parse(iso)) / 60_000
  if (minutes < 120) return 'fresh'
  if (minutes < 24 * 60) return 'today'
  return 'older'
}

const AGE_TEXT = {
  en: {
    now: 'just now',
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n} h ago`,
    yesterday: 'yesterday',
    days: (n: number) => `${n} days ago`,
  },
  hi: {
    now: 'अभी-अभी',
    minutes: (n: number) => `${n} मिनट पहले`,
    hours: (n: number) => `${n} घंटे पहले`,
    yesterday: 'कल',
    days: (n: number) => `${n} दिन पहले`,
  },
} as const

const locale = (lang: Lang) => (lang === 'hi' ? 'hi-IN' : 'en-IN')

/** Relative age for feed items. Future times (clock skew) read as "just now". */
export function formatAge(iso: string, now: Date, lang: Lang): string {
  const text = AGE_TEXT[lang]
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000)
  if (minutes < 1) return text.now
  if (minutes < 60) return text.minutes(minutes)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return text.hours(hours)
  const days = Math.floor(hours / 24)
  if (days === 1) return text.yesterday
  if (days < 7) return text.days(days)
  return formatDate(iso, lang)
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST }).format(
    new Date(iso),
  )
}

export function formatDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: IST,
    timeZoneName: 'short',
  }).format(new Date(iso))
}

/** Clock times always carry their zone ("2:19 am IST"); viewers may not be in India. */
export function formatTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: IST,
    timeZoneName: 'short',
  }).format(new Date(iso))
}

/** "31 Aug 2026", "Sep 2026" or "2025", depending on how precisely the source dates the release. */
export function formatRelease(release: ReleaseDate, lang: Lang): string {
  const date = new Date(`${release.date.slice(0, 10)}T12:00:00+05:30`)
  const opts: Intl.DateTimeFormatOptions =
    release.precision === 'year'
      ? { year: 'numeric', timeZone: IST }
      : release.precision === 'month'
        ? { month: 'short', year: 'numeric', timeZone: IST }
        : { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST }
  return new Intl.DateTimeFormat(locale(lang), opts).format(date)
}

/** Days of grace after the expected date before a release record is flagged as likely superseded. */
export const RELEASE_GRACE_DAYS = 2

export function isReleaseOverdue(nextReleaseDue: string | null, now: Date): boolean {
  if (!nextReleaseDue) return false
  const due = Date.parse(`${nextReleaseDue}T23:59:59+05:30`)
  return now.getTime() > due + RELEASE_GRACE_DAYS * 86_400_000
}
