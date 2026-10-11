import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CircleAlert, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NowContext, useTickingNow } from '../components/common/hooks'
import { AppShell, SectionNav, SiteFooter, TopBar } from '../components/layout/AppShell'
import { SectionContent, isSection, type Section } from '../components/sections/Sections'
import { SettingsDialog, type SettingsHandle } from '../components/settings/SettingsDialog'
import type { DashboardSnapshot } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { usePreferences } from '../preferences/PreferencesProvider'
import { dashboardQuery } from '../queries/dashboard'
import { refreshDashboard } from '../server/dashboard.functions'
import { useLastVisit } from '../components/pulse/LivePulse'

const DESCRIPTION =
  'A public, near-real-time dashboard of India: the five newest balanced national updates from official and reported sources, ' +
  'headline indicators with release dates, election results, a policy tracker and an analyst risk register. English and Hindi.'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { section?: Exclude<Section, 'overview'> } =>
    isSection(search.section) && search.section !== 'overview' ? { section: search.section } : {},
  // Server-renders with data: the query is fetched during SSR and hydrated in the browser.
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({
    meta: [
      { title: 'Bharat Pulse — India at a glance' },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: 'Bharat Pulse — India at a glance' },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'en_IN' },
      { property: 'og:locale:alternate', content: 'hi_IN' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: DashboardPage,
  errorComponent: DashboardError,
})

function useIssues(snapshot: DashboardSnapshot) {
  return snapshot.sources.filter((s) => s.health === 'error' || s.health === 'stale')
}

function DashboardPage() {
  const search = Route.useSearch()
  const section: Section = search.section ?? 'overview'
  const query = useSuspenseQuery(dashboardQuery)
  const snapshot = query.data
  const queryClient = useQueryClient()
  const { lang } = usePreferences()
  const i18n = useI18n()
  const { t, time, pick } = i18n
  const now = useTickingNow(snapshot.generatedAt)
  const settings = useRef<SettingsHandle>(null)
  const [announcement, setAnnouncement] = useState('')
  const previousVisit = useLastVisit()

  const refresh = useMutation({
    mutationFn: () => refreshDashboard(),
    onSuccess: (next) => {
      queryClient.setQueryData(dashboardQuery.queryKey, next)
      const down = next.sources.filter((s) => s.health === 'error' || s.health === 'stale').length
      const at = time(next.generatedAt)
      setAnnouncement(down ? t('refresh.doneWithIssues', { time: at, count: down }) : t('refresh.done', { time: at }))
    },
    onError: () => setAnnouncement(t('refresh.failed', { time: time(snapshot.generatedAt) })),
  })

  // Announce when a background poll changes the five latest updates.
  const shownIds = useRef<string | null>(null)
  useEffect(() => {
    const ids = snapshot.updates[lang].map((u) => u.id).join('|')
    if (shownIds.current !== null && shownIds.current !== ids && !refresh.isPending) {
      setAnnouncement(t('announce.updatesChanged'))
    }
    shownIds.current = ids
  }, [snapshot, lang, t, refresh.isPending])

  // After navigating between sections, move focus to the new heading (not on first load).
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [section])

  const issues = useIssues(snapshot)
  const openSources = () => settings.current?.open('sources')

  return (
    <NowContext.Provider value={now}>
      <AppShell
        section={section}
        announcement={announcement}
        nav={<SectionNav section={section} onOpenSettings={() => settings.current?.open()} />}
        topBar={
          <TopBar
            sources={snapshot.sources}
            refreshing={refresh.isPending || snapshot.refreshing}
            onRefresh={() => refresh.mutate()}
            onOpenSettings={() => settings.current?.open()}
            onOpenSources={openSources}
          />
        }
        footer={<SiteFooter onOpenSources={openSources} />}
        dialog={<SettingsDialog ref={settings} sources={snapshot.sources} discovery={snapshot.discovery} />}
      >
        <div className="section-view" key={section}>
          <div className={section === 'overview' ? 'sr-only' : 'section-head'}>
            <h1 ref={heading} tabIndex={-1}>
              {t(`section.${section}.title`)}
            </h1>
            {section !== 'overview' && <p>{t(`section.${section}.intro`)}</p>}
          </div>

          {query.isRefetchError && (
            <div className="alert alert-warn" role="alert">
              <WifiOff aria-hidden="true" />
              <div>{t('refresh.pollFailed', { time: time(snapshot.generatedAt) })}</div>
            </div>
          )}

          {issues.length > 0 && section !== 'overview' && issues.some((s) => s.type === 'indicator') && (
            <div className="alert alert-warn">
              <CircleAlert aria-hidden="true" />
              <div>
                <strong>{t('alert.sources.title', { count: issues.length })}</strong>
                {t('alert.sources.body', { names: issues.map((s) => pick(s.name)).join(', ') })}
                <div>
                  <button type="button" className="btn" onClick={openSources}>
                    {t('footer.sources')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <SectionContent section={section} snapshot={snapshot} lang={lang} onRefresh={() => refresh.mutate()} onOpenSources={openSources} previousVisit={previousVisit} />
        </div>
      </AppShell>
    </NowContext.Provider>
  )
}

function DashboardError({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <main id="main" className="main" style={{ margin: '0 auto' }}>
      <div className="section-head">
        <h1>Bharat Pulse is temporarily unavailable</h1>
        <p>The dashboard could not load its data. No figures are shown rather than unverified ones.</p>
      </div>
      <div className="alert alert-warn" role="alert">
        <CircleAlert aria-hidden="true" />
        <div>
          <strong>{error instanceof Error ? error.message : 'Unknown error'}</strong>
          <button type="button" className="btn" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </main>
  )
}
