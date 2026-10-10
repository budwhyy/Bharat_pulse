import { Link } from '@tanstack/react-router'
import { Landmark, LayoutGrid, RefreshCw, Settings, ShieldAlert, TrendingUp, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SourceView } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { useNow, useReducedMotion } from '../common/hooks'
import { SECTIONS, type Section } from '../sections/Sections'

const NAV_ICON: Record<Section, typeof LayoutGrid> = {
  overview: LayoutGrid,
  politics: Landmark,
  economy: TrendingUp,
  society: Users,
  risks: ShieldAlert,
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
      <path d="M4.5 13h3.2l2-5.2 3.4 9.4 2.3-6.2h4.1" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Brand() {
  const { t } = useI18n()
  return (
    <Link to="/" search={{}} className="brand" aria-label={t('app.home')} activeOptions={{ exact: true, includeSearch: true }}>
      <BrandMark />
      <span aria-hidden="true">{t('app.name')}</span>
    </Link>
  )
}

export function SectionNav({ section, onOpenSettings }: { section: Section; onOpenSettings: () => void }) {
  const { t } = useI18n()
  // One <nav> landmark holds the brand, the sections and Settings: a sidebar on
  // desktop, a bottom bar on mobile (where brand and Settings move to the top bar).
  return (
    <nav className="sidebar" aria-label={t('nav.label')}>
      <Brand />
      <div className="nav">
        <ul>
          {SECTIONS.map((key) => {
            const Icon = NAV_ICON[key]
            return (
              <li key={key}>
                <Link
                  to="/"
                  search={key === 'overview' ? {} : { section: key }}
                  className="nav-link"
                  aria-current={key === section ? 'page' : undefined}
                  activeOptions={{ exact: true, includeSearch: true }}
                >
                  <Icon aria-hidden="true" />
                  <span>{t(`nav.${key}`)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="sidebar-foot">
        <button type="button" className="nav-link" onClick={onOpenSettings}>
          <Settings aria-hidden="true" />
          <span>{t('nav.settings')}</span>
        </button>
      </div>
    </nav>
  )
}

export type FeedTone = 'good' | 'warn' | 'bad' | 'neutral'

export function feedStatus(sources: SourceView[]) {
  const news = sources.filter((s) => s.type === 'news')
  const down = news.filter((s) => s.health === 'error' || s.health === 'stale')
  const pending = news.filter((s) => s.health === 'pending')
  const lastSuccess = news
    .map((s) => s.lastSuccessAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1)
  const tone: FeedTone =
    pending.length === news.length
      ? 'neutral'
      : down.length + pending.length === news.length
        ? 'bad'
        : down.length > 0
          ? 'warn'
          : 'good'
  return { tone, down: down.length, total: news.length, lastSuccess: lastSuccess ?? null }
}

const TONE_KEY = { good: 'status.live', warn: 'status.partial', bad: 'status.offline', neutral: 'status.connecting' } as const

export function TopBar({
  sources,
  refreshing,
  onRefresh,
  onOpenSettings,
  onOpenSources,
}: {
  sources: SourceView[]
  refreshing: boolean
  onRefresh: () => void
  onOpenSettings: () => void
  onOpenSources: () => void
}) {
  const { t, age, locale } = useI18n()
  const now = useNow()
  const reduced = useReducedMotion()
  const status = feedStatus(sources)
  const updated = status.lastSuccess ? t('status.updated', { time: age(status.lastSuccess, now) }) : t('status.never')
  const asOf = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(now)

  return (
    <header className="topbar">
      <Brand />
      <p className="topbar-asof">{asOf}</p>
      <div className="topbar-actions">
        <button
          type="button"
          className="btn status-btn"
          data-tone={status.tone}
          onClick={onOpenSources}
          aria-label={t('status.open', { status: t(TONE_KEY[status.tone]), updated })}
        >
          <span className="status-dot" aria-hidden="true" />
          <span>{t(TONE_KEY[status.tone])}</span>
          <span className="status-meta">· {updated}</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => !refreshing && onRefresh()}
          aria-disabled={refreshing}
          aria-label={refreshing ? t('refresh.busy') : t('refresh.label')}
        >
          <RefreshCw aria-hidden="true" className={refreshing && !reduced ? 'spin' : undefined} />
          <span className="refresh-text">{refreshing ? t('refresh.busy') : t('refresh.button')}</span>
        </button>
        <button type="button" className="icon-btn mobile-only" onClick={onOpenSettings} aria-label={t('nav.settings')}>
          <Settings aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export function SiteFooter({ onOpenSources }: { onOpenSources: () => void }) {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <h2>{t('footer.heading')}</h2>
      <ul>
        <li>{t('footer.live')}</li>
        <li>{t('footer.headlines')}</li>
        <li>{t('footer.records')}</li>
        <li>{t('footer.markets')}</li>
      </ul>
      <button type="button" className="btn" onClick={onOpenSources}>
        {t('footer.sources')}
      </button>
    </footer>
  )
}

export function AppShell({
  section,
  nav,
  topBar,
  footer,
  dialog,
  announcement,
  children,
}: {
  section: Section
  nav: ReactNode
  topBar: ReactNode
  footer: ReactNode
  dialog: ReactNode
  announcement: string
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className="shell" data-section={section}>
      <a className="skip-link" href="#main">
        {t('app.skip')}
      </a>
      {nav}
      <div className="main-col">
        {topBar}
        <main id="main" className="main" tabIndex={-1}>
          {children}
        </main>
        {footer}
      </div>
      {dialog}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}
