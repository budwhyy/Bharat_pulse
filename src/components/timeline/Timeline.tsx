import {
  Check,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Maximize2,
  Minimize2,
  Scale,
  Search,
  Shield,
  Ship,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AREAS, TIMELINE, type Area, type TimelineEvent } from '../../data/context'
import { useI18n } from '../../i18n/i18n'
import { useNow, useReducedMotion } from '../common/hooks'
import { EmptyState, ExternalLink } from '../common/ui'

const eventIso = (date: string) => `${date}T12:00:00+05:30`
const eventKey = (event: TimelineEvent) => `${event.date}-${event.text.en}`

export const AREA_ICON: Record<Area, typeof Landmark> = {
  politics: Landmark,
  economy: TrendingUp,
  policy: Scale,
  society: Users,
  trade: Ship,
  security: Shield,
  risk: TriangleAlert,
}

/** Vertical list of events, newest first (political calendar, society context). */
export function EventList({ events }: { events: TimelineEvent[] }) {
  const { t, pick, date } = useI18n()
  const now = useNow()
  return (
    <ol className="timeline">
      {events.map((event) => {
        const future = Date.parse(eventIso(event.date)) > now.getTime()
        return (
          <li key={eventKey(event)} className={future ? 'is-future' : undefined}>
            <time dateTime={event.date}>{date(eventIso(event.date))}</time>
            <div className="timeline-body">
              <p className="timeline-text">{pick(event.text)}</p>
              <div className="timeline-foot">
                <span className="tag">{t(`area.${event.area}`)}</span>
                {future && <span className="tag tag-warn">{t('timeline.upcoming')}</span>}
                <span>
                  {t('timeline.source')}:{' '}
                  {event.source ? (
                    <ExternalLink href={event.source.url}>{event.source.name}</ExternalLink>
                  ) : (
                    t('timeline.briefing')
                  )}
                </span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Stems alternate above/below the axis and stagger in length so neighbours never collide. */
const STEMS = [44, 104] as const
const SPACING = { expanded: 196, condensed: 128 } as const
const EDGE = 110

/**
 * Horizontal axis timeline, oldest → newest. Area chips (multi-select) and a
 * keyword search filter it; pan buttons and arrow keys move along it; choosing
 * a station opens the inspector below with the full record and its source.
 */
export function Timeline() {
  const { t, pick, date } = useI18n()
  const now = useNow()
  const reduced = useReducedMotion()
  const [active, setActive] = useState<ReadonlySet<Area>>(() => new Set(AREAS))
  const [query, setQuery] = useState('')
  const [condensed, setCondensed] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const stations = useRef(new Map<string, HTMLButtonElement>())

  const all = active.size === AREAS.length
  const needle = query.trim().toLowerCase()
  const events = useMemo(
    () =>
      TIMELINE.filter(
        (e) =>
          active.has(e.area) &&
          (!needle || e.text.en.toLowerCase().includes(needle) || e.text.hi.includes(query.trim())),
      ).sort((a, b) => a.date.localeCompare(b.date)),
    [active, needle, query],
  )

  const isFuture = (e: TimelineEvent) => Date.parse(eventIso(e.date)) > now.getTime()
  const latestPast = [...events].reverse().find((e) => !isFuture(e)) ?? events.at(-1)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = events.find((e) => eventKey(e) === selectedKey) ?? latestPast ?? null
  const selectedIndex = selected ? events.indexOf(selected) : -1

  const spacing = condensed ? SPACING.condensed : SPACING.expanded
  const width = EDGE * 2 + Math.max(events.length - 1, 0) * spacing

  // Keep the selected station in view (initially: the latest past event).
  useEffect(() => {
    const el = scroller.current
    if (!el || selectedIndex < 0) return
    const x = EDGE + selectedIndex * spacing
    el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: reduced ? 'auto' : 'smooth' })
  }, [selectedIndex, spacing, reduced])

  const toggle = (area: Area) => {
    setActive((current) => {
      if (current.size === AREAS.length) return new Set([area])
      const next = new Set(current)
      if (next.has(area)) next.delete(area)
      else next.add(area)
      return next.size === 0 ? new Set(AREAS) : next
    })
  }

  const pan = (direction: -1 | 1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: reduced ? 'auto' : 'smooth' })
  }

  const select = (index: number, focus = false) => {
    const event = events[index]
    if (!event) return
    setSelectedKey(eventKey(event))
    if (focus) stations.current.get(eventKey(event))?.focus({ preventScroll: true })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = events.length - 1
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(index + 1, last)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(index - 1, 0)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null
    if (next === null) return
    e.preventDefault()
    select(next, true)
  }

  const related = selected
    ? events.filter((e) => e.area === selected.area && e !== selected).slice(-3).reverse()
    : []

  return (
    <section className="panel" aria-labelledby="timeline-heading">
      <div className="axis-head">
        <div className="panel-head">
          <h2 id="timeline-heading">{t('timeline.heading')}</h2>
          <p>{t('timeline.intro')}</p>
        </div>
        <div className="axis-tools">
          <label className="search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">{t('timeline.searchLabel')}</span>
            <input
              type="search"
              value={query}
              placeholder={t('timeline.search')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button type="button" className="btn" aria-pressed={condensed} onClick={() => setCondensed((c) => !c)}>
            {condensed ? <Maximize2 aria-hidden="true" /> : <Minimize2 aria-hidden="true" />}
            {condensed ? t('timeline.expand') : t('timeline.condense')}
          </button>
          <button type="button" className="icon-btn bordered" onClick={() => pan(-1)} aria-label={t('timeline.prev')}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn bordered" onClick={() => pan(1)} aria-label={t('timeline.next')}>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="chips" role="group" aria-label={t('timeline.filter')}>
        <button type="button" className="chip" aria-pressed={all} onClick={() => setActive(new Set(AREAS))}>
          {all && <Check className="chip-check" aria-hidden="true" />}
          {t('timeline.all')} ({TIMELINE.length})
        </button>
        {AREAS.map((area) => {
          const pressed = !all && active.has(area)
          const Icon = AREA_ICON[area]
          return (
            <button key={area} type="button" className="chip" aria-pressed={pressed} onClick={() => toggle(area)}>
              {pressed ? <Check className="chip-check" aria-hidden="true" /> : <Icon className="chip-check" aria-hidden="true" />}
              {t(`area.${area}`)}
            </button>
          )
        })}
      </div>
      <p className="result-count" role="status" aria-live="polite">
        {t('timeline.showing', { count: events.length, total: TIMELINE.length })}
      </p>

      {events.length === 0 ? (
        <div className="card">
          <EmptyState title={t('timeline.noMatch')} />
        </div>
      ) : (
        <div className="card axis-card">
          <div
            ref={scroller}
            className="axis-scroll"
            role="region"
            aria-label={t('timeline.axisLabel')}
            aria-describedby="axis-help"
            tabIndex={0}
          >
            <ol className={`axis ${condensed ? 'is-condensed' : ''}`} style={{ width }}>
              <li className="axis-line" aria-hidden="true" />
              {events.map((event, index) => {
                const key = eventKey(event)
                const above = index % 2 === 0
                const stem = STEMS[Math.floor(index / 2) % 2]!
                const future = isFuture(event)
                const isSelected = event === selected
                const Icon = AREA_ICON[event.area]
                return (
                  <li
                    key={key}
                    className={`station ${above ? 'above' : 'below'} ${future ? 'is-future' : ''} ${isSelected ? 'is-selected' : ''}`}
                    style={{ left: EDGE + index * spacing, ['--stem' as string]: `${stem}px` }}
                  >
                    <span className="station-stem" aria-hidden="true" />
                    <span className="station-node" aria-hidden="true" />
                    <time className="station-date" dateTime={event.date}>
                      {date(eventIso(event.date))}
                    </time>
                    <button
                      ref={(el) => {
                        if (el) stations.current.set(key, el)
                        else stations.current.delete(key)
                      }}
                      type="button"
                      className="station-card"
                      aria-pressed={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => select(index)}
                      onKeyDown={(e) => onKeyDown(e, index)}
                    >
                      <span className="station-text">{pick(event.text)}</span>
                      <span className="station-area">
                        <Icon aria-hidden="true" />
                        {t(`area.${event.area}`)}
                        {future && <> · {t('timeline.upcoming')}</>}
                      </span>
                      <span className="sr-only">, {date(eventIso(event.date))}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
          <p id="axis-help" className="fine-print axis-help">
            {t('timeline.help')}
          </p>

          {selected && (
            <div className="inspector" aria-live="polite" aria-atomic="true">
              <div className="inspector-body" key={eventKey(selected)}>
                <p className="fine-print">{t('timeline.inspector')}</p>
                <h3>{pick(selected.text)}</h3>
                <div className="timeline-foot">
                  <time dateTime={selected.date}>{date(eventIso(selected.date))}</time>
                  <span className="tag">{t(`area.${selected.area}`)}</span>
                  <span className={`tag ${isFuture(selected) ? 'tag-warn' : ''}`}>
                    {isFuture(selected) ? t('timeline.upcoming') : t('timeline.past')}
                  </span>
                  <span>
                    {t('timeline.source')}:{' '}
                    {selected.source ? (
                      <ExternalLink href={selected.source.url}>{selected.source.name}</ExternalLink>
                    ) : (
                      t('timeline.briefing')
                    )}
                  </span>
                </div>
                {related.length > 0 && (
                  <div>
                    <p className="fine-print">{t('timeline.related', { area: t(`area.${selected.area}`) })}</p>
                    <ul className="related">
                      {related.map((event) => (
                        <li key={eventKey(event)}>
                          <button type="button" className="row-btn" onClick={() => select(events.indexOf(event), true)}>
                            <span className="fine-print">{date(eventIso(event.date))}</span> {pick(event.text)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
