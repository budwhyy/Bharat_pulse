import {
  BadgeCheck,
  Building2,
  Clock,
  ExternalLink as ExternalIcon,
  Globe,
  Landmark,
  Languages,
  ShieldAlert,
  TrendingUp,
  Users,
  CircleAlert,
} from 'lucide-react'
import { ageTier } from '../../domain/freshness'
import type { Category, UpdateView } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { useNow } from '../common/hooks'
import { EmptyState, ReportedIcon } from '../common/ui'
import { useEffect, useRef, useState } from 'react'
import { LiveAxis } from './LiveAxis'

export const CATEGORY_ICON: Record<Category, typeof Landmark> = {
  politics: Landmark,
  economy: TrendingUp,
  policy: Building2,
  society: Users,
  risk: ShieldAlert,
  general: Globe,
}

export function CategoryTag({ category }: { category: Category }) {
  const { t } = useI18n()
  const Icon = CATEGORY_ICON[category]
  return (
    <span className="cat">
      <Icon aria-hidden="true" />
      {t(`category.${category}`)}
    </span>
  )
}

function KindTag({ kind }: { kind: UpdateView['kind'] }) {
  const { t } = useI18n()
  return kind === 'official' ? (
    <span className="tag tag-official" title={t('updates.officialHint')}>
      <BadgeCheck aria-hidden="true" />
      {t('updates.official')}
    </span>
  ) : (
    <span className="tag tag-reported" title={t('updates.reportedHint')}>
      <ReportedIcon />
      {t('updates.reported')}
    </span>
  )
}

function UpdateItem({
  item,
  isNew,
  isActive,
  onActivate,
  itemRef,
}: {
  item: UpdateView
  isNew: boolean
  isActive: boolean
  onActivate: (id: string | null) => void
  itemRef: (el: HTMLLIElement | null) => void
}) {
  const { t, pick, time, dateTime, age } = useI18n()
  const now = useNow()
  const at = item.timeBasis === 'published' && item.publishedAt ? item.publishedAt : item.firstSeenAt
  const source = pick(item.sourceName)
  const old = item.timeBasis !== 'unknown' && ageTier(at, now) === 'older'
  return (
    <li
      ref={itemRef}
      className={`update ${item.kind === 'official' ? 'is-official' : ''} ${isNew ? 'is-new' : ''} ${isActive ? 'is-active' : ''}`}
      onMouseEnter={() => onActivate(item.id)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(item.id)}
      onBlur={() => onActivate(null)}
    >
      <div className="update-meta">
        <CategoryTag category={item.category} />
        <KindTag kind={item.kind} />
        <span className="update-source">{source}</span>
        {item.timeBasis === 'unknown' ? (
          <span>
            {t('updates.timeUnknown')} · {t('updates.firstSeen')} <time dateTime={item.firstSeenAt}>{dateTime(item.firstSeenAt)}</time>
          </span>
        ) : (
          <span>
            <time dateTime={at} title={dateTime(at)}>
              {time(at)}
            </time>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {item.timeBasis === 'first-seen' ? `${t('updates.firstSeen')} ` : ''}
            {age(at, now)}
          </span>
        )}
      </div>
      <h3 className="update-title" lang={item.lang}>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title}
          <span className="sr-only">
            {' '}
            ({t('updates.readAt', { source })}, {t('updates.newTab')})
          </span>
          <ExternalIcon aria-hidden="true" />
        </a>
      </h3>
      {item.summary && (
        <p className="update-summary" lang={item.lang}>
          {item.summary}
        </p>
      )}
      {(item.languageFallback || item.stale || old) && (
        <div className="update-notes">
          {item.languageFallback && (
            <span className="tag">
              <Languages aria-hidden="true" />
              {t(item.lang === 'en' ? 'updates.fallback.en' : 'updates.fallback.hi')}
            </span>
          )}
          {item.stale && (
            <span className="tag tag-warn">
              <CircleAlert aria-hidden="true" />
              {t('updates.staleItem')}
            </span>
          )}
          {old && (
            <span className="tag tag-warn">
              <Clock aria-hidden="true" />
              {t('updates.old')}
            </span>
          )}
        </div>
      )}
    </li>
  )
}

function UpdatesSkeleton() {
  const { t } = useI18n()
  return (
    <div className="card" role="status" aria-label={t('updates.loading')}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="update" aria-hidden="true">
          <div className="skeleton" style={{ height: 14, width: '40%' }} />
          <div className="skeleton" style={{ height: 20, width: '85%' }} />
          <div className="skeleton" style={{ height: 14, width: '70%' }} />
        </div>
      ))}
    </div>
  )
}

export function LatestUpdates({
  items,
  refreshing,
  onRefresh,
}: {
  items: UpdateView[]
  refreshing: boolean
  onRefresh: () => void
}) {
  const { t } = useI18n()
  const [activeId, setActiveId] = useState<string | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())
  // Clicking a marker brings its story into view and flashes it.
  const select = (id: string) => {
    const row = rows.current.get(id)
    if (!row) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    row.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    row.classList.remove('is-flash')
    void row.offsetWidth
    row.classList.add('is-flash')
    setActiveId(id)
  }
  // Items that arrived after first render pop out of the axis; the flag clears after the animation.
  const seen = useRef<Set<string> | null>(null)
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    const ids = items.map((i) => i.id)
    if (seen.current === null) {
      seen.current = new Set(ids)
      return
    }
    const fresh = ids.filter((id) => !seen.current!.has(id))
    for (const id of ids) seen.current.add(id)
    if (fresh.length === 0) return
    setNewIds(new Set(fresh))
    const timer = setTimeout(() => setNewIds(new Set()), 6000)
    return () => clearTimeout(timer)
  }, [items])
  return (
    <section className="panel" aria-labelledby="updates-heading" aria-busy={refreshing && items.length === 0}>
      <div className="panel-head">
        <h2 id="updates-heading">{t('updates.heading')}</h2>
        <p>{t('updates.intro')}</p>
      </div>
      {items.length === 0 ? (
        refreshing ? (
          <UpdatesSkeleton />
        ) : (
          <div className="card">
            <EmptyState
              title={t('updates.empty')}
              hint={t('updates.emptyHint')}
              action={
                <button type="button" className="btn" onClick={onRefresh}>
                  {t('common.retry')}
                </button>
              }
            />
          </div>
        )
      ) : (
        <div className="card live-feed">
          <LiveAxis items={items} newIds={newIds} activeId={activeId} onActivate={setActiveId} onSelect={select} />
          <ol className="updates">
            {items.map((item) => (
              <UpdateItem
                key={item.id}
                item={item}
                isNew={newIds.has(item.id)}
                isActive={item.id === activeId}
                onActivate={setActiveId}
                itemRef={(el) => {
                  if (el) rows.current.set(item.id, el)
                  else rows.current.delete(item.id)
                }}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
