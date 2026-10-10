import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AREAS, TIMELINE, type Area, type TimelineEvent } from '../../data/context'
import { useI18n } from '../../i18n/i18n'
import { useNow } from '../common/hooks'
import { EmptyState, ExternalLink } from '../common/ui'

const eventIso = (date: string) => `${date}T12:00:00+05:30`

export function EventList({ events }: { events: TimelineEvent[] }) {
  const { t, pick, date } = useI18n()
  const now = useNow()
  return (
    <ol className="timeline">
      {events.map((event) => {
        const future = Date.parse(eventIso(event.date)) > now.getTime()
        return (
          <li key={`${event.date}-${event.text.en}`} className={future ? 'is-future' : undefined}>
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

/** Filterable national timeline, newest first. Toggle chips are multi-select; "All areas" resets. */
export function Timeline() {
  const { t } = useI18n()
  const [active, setActive] = useState<ReadonlySet<Area>>(() => new Set(AREAS))
  const all = active.size === AREAS.length
  const events = useMemo(
    () => TIMELINE.filter((e) => active.has(e.area)).sort((a, b) => b.date.localeCompare(a.date)),
    [active],
  )

  const toggle = (area: Area) => {
    setActive((current) => {
      // From "all", a click narrows to that one area; emptying the set restores all.
      if (current.size === AREAS.length) return new Set([area])
      const next = new Set(current)
      if (next.has(area)) next.delete(area)
      else next.add(area)
      return next.size === 0 ? new Set(AREAS) : next
    })
  }

  return (
    <section className="panel" aria-labelledby="timeline-heading">
      <div className="panel-head">
        <h2 id="timeline-heading">{t('timeline.heading')}</h2>
        <p>{t('timeline.intro')}</p>
      </div>
      <div className="chips" role="group" aria-label={t('timeline.filter')}>
        <button type="button" className="chip" aria-pressed={all} onClick={() => setActive(new Set(AREAS))}>
          {all && <Check className="chip-check" aria-hidden="true" />}
          {t('timeline.all')}
        </button>
        {AREAS.map((area) => {
          const pressed = !all && active.has(area)
          return (
            <button key={area} type="button" className="chip" aria-pressed={pressed} onClick={() => toggle(area)}>
              {pressed && <Check className="chip-check" aria-hidden="true" />}
              {t(`area.${area}`)}
            </button>
          )
        })}
      </div>
      <p className="result-count" role="status" aria-live="polite">
        {t('timeline.showing', { count: events.length, total: TIMELINE.length })}
      </p>
      <div className="card" style={{ padding: '0 16px' }}>
        {events.length ? <EventList events={events} /> : <EmptyState title={t('timeline.noMatch')} />}
      </div>
    </section>
  )
}
