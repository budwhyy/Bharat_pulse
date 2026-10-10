import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  CircleDashed,
  CircleX,
  Clock,
  Database,
  Globe,
  Inbox,
  Newspaper,
} from 'lucide-react'
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { isReleaseOverdue } from '../../domain/freshness'
import type { DataMeta, Health, Provenance } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { useNow } from './hooks'

/** Link to a publisher or source; always announces that it opens a new tab. */
export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const { t } = useI18n()
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> {t('common.opensNewTab')}</span>
    </a>
  )
}

const PROVENANCE_ICON: Record<Provenance, typeof BadgeCheck> = {
  'official-live': BadgeCheck,
  'intl-live': Globe,
  'release-record': Database,
}

export function ProvenanceTag({ provenance }: { provenance: Provenance }) {
  const { t } = useI18n()
  const Icon = PROVENANCE_ICON[provenance]
  return (
    <span
      className={`tag ${provenance === 'release-record' ? '' : 'tag-official'}`}
      title={provenance === 'release-record' ? t('provenance.release-record.hint') : undefined}
    >
      <Icon aria-hidden="true" />
      {t(`provenance.${provenance}`)}
    </span>
  )
}

const HEALTH_ICON: Record<Health, typeof BadgeCheck> = {
  ok: BadgeCheck,
  stale: Clock,
  error: CircleX,
  pending: CircleDashed,
}
const HEALTH_TONE: Record<Health, string> = { ok: 'tag-good', stale: 'tag-warn', error: 'tag-bad', pending: '' }

export function HealthTag({ health }: { health: Health }) {
  const { t } = useI18n()
  const Icon = HEALTH_ICON[health]
  return (
    <span className={`tag ${HEALTH_TONE[health]}`}>
      <Icon aria-hidden="true" />
      {t(`health.${health}`)}
    </span>
  )
}

/** Stale/error/overdue flags for an indicator. Renders nothing when the data is current. */
export function DataFlags({ meta }: { meta: DataMeta }) {
  const { t, date } = useI18n()
  const now = useNow()
  const live = meta.provenance !== 'release-record'
  const overdue = !live && isReleaseOverdue(meta.nextReleaseDue, now)
  if (live && meta.health !== 'ok') return <HealthTag health={meta.health} />
  if (overdue && meta.nextReleaseDue) {
    return (
      <span className="tag tag-warn" title={t('kpi.overdueHint', { date: date(meta.nextReleaseDue) })}>
        <AlertTriangle aria-hidden="true" />
        {t('kpi.overdue')}
        <span className="sr-only">. {t('kpi.overdueHint', { date: date(meta.nextReleaseDue) })}</span>
      </span>
    )
  }
  return null
}

export function EmptyState({ title, hint, icon = <Inbox aria-hidden="true" />, action }: {
  title: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      {icon}
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
      {action}
    </div>
  )
}

export function ReportedIcon() {
  return <Newspaper aria-hidden="true" />
}

/** Collapsible, keyboard-reachable table view that accompanies every chart. */
export function DataTable({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <details className="data-table">
      <summary>
        <ChevronRight aria-hidden="true" />
        {t('chart.table')}
      </summary>
      <div className="table-scroll" role="region" aria-label={`${label} — ${t('chart.table')}`} tabIndex={0}>
        {children}
      </div>
    </details>
  )
}

export interface TabItem<K extends string> {
  key: K
  label: string
}

/**
 * Accessible tablist with roving focus: arrow keys (and Home/End) move focus
 * and selection together; only the selected tab is in the tab order.
 */
export function SegmentedTabs<K extends string>({
  items,
  selected,
  onSelect,
  label,
  idBase,
}: {
  items: TabItem<K>[]
  selected: K
  onSelect: (key: K) => void
  label: string
  idBase: string
}) {
  const refs = useRef(new Map<K, HTMLButtonElement>())
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last ? 0 : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0 ? last : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    const key = items[next]!.key
    onSelect(key)
    refs.current.get(key)?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="segmented">
      {items.map((item, index) => (
        <button
          key={item.key}
          ref={(el) => {
            if (el) refs.current.set(item.key, el)
            else refs.current.delete(item.key)
          }}
          type="button"
          role="tab"
          id={`${idBase}-tab-${item.key}`}
          aria-selected={item.key === selected}
          aria-controls={`${idBase}-panel`}
          tabIndex={item.key === selected ? 0 : -1}
          onClick={() => onSelect(item.key)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function useStableId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}
