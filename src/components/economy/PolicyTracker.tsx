import { ArrowDown, ArrowUp, ArrowUpDown, Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { POLICIES, POLICY_STATUSES, type PolicyItem, type PolicyStatus } from '../../data/context'
import { useI18n } from '../../i18n/i18n'
import { EmptyState, ExternalLink } from '../common/ui'

type SortKey = 'name' | 'status' | 'since'
type Direction = 'ascending' | 'descending'

const STATUS_ORDER: Record<PolicyStatus, number> = { active: 0, upcoming: 1, stalled: 2 }
const STATUS_TONE: Record<PolicyStatus, string> = { active: 'tag-good', upcoming: 'tag-warn', stalled: 'tag-bad' }

export function PolicyTracker() {
  const { t, pick, release, locale } = useI18n()
  const [filter, setFilter] = useState<PolicyStatus | 'all'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: Direction }>({ key: 'since', dir: 'descending' })

  const rows = useMemo(() => {
    const compare: Record<SortKey, (a: PolicyItem, b: PolicyItem) => number> = {
      name: (a, b) => pick(a.name).localeCompare(pick(b.name), locale),
      status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
      since: (a, b) => a.since.localeCompare(b.since),
    }
    const sign = sort.dir === 'ascending' ? 1 : -1
    return POLICIES.filter((p) => filter === 'all' || p.status === filter).sort(
      (a, b) => sign * compare[sort.key](a, b) || pick(a.name).localeCompare(pick(b.name), locale),
    )
  }, [filter, sort, pick, locale])

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'ascending' ? 'descending' : 'ascending' }
        : { key, dir: key === 'since' ? 'descending' : 'ascending' },
    )

  const header = (key: SortKey, label: string) => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.dir === 'ascending' ? ArrowUp : ArrowDown
    return (
      <th scope="col" aria-sort={active ? sort.dir : 'none'}>
        <button type="button" className="sort-btn" onClick={() => toggleSort(key)}>
          {label}
          <Icon aria-hidden="true" />
          <span className="sr-only">{t('economy.policy.sort', { column: label })}</span>
        </button>
      </th>
    )
  }

  return (
    <section className="panel" aria-labelledby="policy-heading">
      <div className="panel-head">
        <h2 id="policy-heading">{t('economy.policy.heading')}</h2>
        <p>{t('economy.policy.intro')}</p>
      </div>
      <div className="chips" role="group" aria-label={t('economy.policy.filter')}>
        {(['all', ...POLICY_STATUSES] as const).map((status) => (
          <button
            key={status}
            type="button"
            className="chip"
            aria-pressed={filter === status}
            onClick={() => setFilter(status)}
          >
            {filter === status && <Check className="chip-check" aria-hidden="true" />}
            {status === 'all' ? t('economy.policy.all') : t(`economy.policy.status.${status}`)}
          </button>
        ))}
      </div>
      <p className="result-count" role="status" aria-live="polite">
        {t('economy.policy.count', { count: rows.length, total: POLICIES.length })}
      </p>
      <div
        className="table-scroll card"
        role="region"
        aria-label={`${t('economy.policy.heading')} — ${t('chart.table')}`}
        tabIndex={0}
        style={{ marginTop: 0 }}
      >
        {rows.length === 0 ? (
          <EmptyState title={t('economy.policy.none')} />
        ) : (
          <table className="policy-table">
            <thead>
              <tr>
                {header('name', t('economy.policy.col.name'))}
                {header('status', t('economy.policy.col.status'))}
                {header('since', t('economy.policy.col.since'))}
                <th scope="col">{t('economy.policy.col.note')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((policy) => (
                <tr key={`${policy.id}-${filter}-${sort.key}-${sort.dir}`}>
                  <td>{pick(policy.name)}</td>
                  <td>
                    <span className={`tag ${STATUS_TONE[policy.status]}`}>{pick(policy.statusText)}</span>
                  </td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {release({ date: `${policy.since}-01`, precision: 'month' })}
                  </td>
                  <td>
                    {pick(policy.note)}
                    {policy.source && (
                      <>
                        {' '}
                        <ExternalLink href={policy.source.url}>{policy.source.name}</ExternalLink>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
