import { useState } from 'react'
import {
  BIHAR_2025,
  LOK_SABHA_2024,
  PARTY_NAMES,
  STATE_ELECTIONS_2026,
  TIMELINE,
  type Bloc,
  type SeatDistribution,
  type StateResult,
} from '../../data/context'
import type { DataMeta } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { ChartCard, Legend } from '../charts/ChartCard'
import { HBarPlot } from '../charts/lazyPlots'
import type { HBarDatum } from '../charts/plots'
import { HEMICYCLE_HEIGHT, Hemicycle } from './Hemicycle'
import { SegmentedTabs, useStableId } from '../common/ui'
import { EventList } from '../timeline/Timeline'

const BLOC_COLOR: Record<Bloc['id'], string> = {
  nda: 'var(--series-2)',
  india: 'var(--series-1)',
  mgb: 'var(--series-1)',
  others: 'var(--series-neutral)',
}

const majorityOf = (total: number) => Math.floor(total / 2) + 1

function electionMeta(dist: Pick<SeatDistribution, 'released' | 'source'>): DataMeta {
  return {
    provenance: 'release-record',
    cadence: 'policy',
    source: dist.source,
    releasedAt: dist.released,
    checkedAt: null,
    nextReleaseDue: null,
    health: 'ok',
  }
}

function SeatCard({ dist }: { dist: SeatDistribution }) {
  const { t, pick, num } = useI18n()
  const majority = majorityOf(dist.total)
  const leader = dist.blocs.reduce((a, b) => (b.seats > a.seats ? b : a))
  const summary = t('politics.seats.summary', {
    leader: pick(leader.name),
    seats: leader.seats,
    total: dist.total,
    majority,
  })
  return (
    <ChartCard
      title={pick(dist.title)}
      subtitle={t('politics.seats.sub', { total: dist.total, majority })}
      height={HEMICYCLE_HEIGHT}
      summary={summary}
      meta={electionMeta(dist)}
      table={
        <table>
          <thead>
            <tr>
              <th scope="col">{t('politics.seats.bloc')}</th>
              <th scope="col" className="n">
                {t('politics.seats.seats')}
              </th>
              <th scope="col" className="n">
                {t('politics.seats.share')}
              </th>
            </tr>
          </thead>
          <tbody>
            {dist.blocs.map((bloc) => (
              <tr key={bloc.id}>
                <th scope="row">{pick(bloc.name)}</th>
                <td className="n">{bloc.seats}</td>
                <td className="n">{num((bloc.seats / dist.total) * 100, 1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <Hemicycle
        label={summary}
        total={dist.total}
        majority={majority}
        blocs={dist.blocs.map((bloc) => ({ id: bloc.id, label: pick(bloc.name), seats: bloc.seats, color: BLOC_COLOR[bloc.id] }))}
      />
    </ChartCard>
  )
}

function StatePanel({ state }: { state: StateResult }) {
  const { t, pick, num } = useI18n()
  const majority = majorityOf(state.total)
  const won = state.parties.reduce((sum, p) => sum + p.seats, 0)
  const others = state.total - won
  const partyName = (key: keyof typeof PARTY_NAMES) => pick(PARTY_NAMES[key]!)
  const seatsData: HBarDatum[] = [
    ...state.parties.map((p) => ({ key: p.party, label: partyName(p.party), seats: p.seats })),
    ...(others > 0 ? [{ key: 'Others', label: partyName('Others'), seats: others }] : []),
  ]
  const compareData: HBarDatum[] = state.parties.map((p) => ({
    key: p.party,
    label: partyName(p.party),
    seatShare: Math.round((p.seats / state.total) * 1000) / 10,
    voteShare: p.votes,
  }))
  const top = state.parties[0]!
  const seatsSummary = t('politics.states.seatsSummary', { party: partyName(top.party), seats: top.seats, total: state.total, state: pick(state.name) })
  const compareSummary =
    top.votes != null
      ? t('politics.states.compareSummary', {
          party: partyName(top.party),
          votes: num(top.votes, 1),
          seatShare: num((top.seats / state.total) * 100, 1),
        })
      : ''
  const meta = electionMeta(STATE_ELECTIONS_2026)
  const pct = (v: number) => `${num(v, 1)}%`

  return (
    <>
      <div className="card state-summary">
        <div>
          <h3>{pick(state.name)}</h3>
          <p className="state-gov">
            {t('politics.states.government')}: {pick(state.government)}
          </p>
          <p className="state-note">{pick(state.note)}</p>
        </div>
        <dl className="state-stats">
          <div>
            <dt>{t('politics.seats.seats')}</dt>
            <dd className="num">{state.total}</dd>
          </div>
          <div>
            <dt>{t('politics.seats.majorityLabel')}</dt>
            <dd className="num">{majority}</dd>
          </div>
        </dl>
      </div>
      <div className="grid-2">
        <ChartCard
          title={t('politics.states.seatsTitle')}
          subtitle={t('politics.states.seatsSub', { majority, total: state.total })}
          height={seatsData.length * 32 + 36}
          summary={seatsSummary}
          meta={meta}
          table={
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('politics.states.party')}</th>
                  <th scope="col" className="n">
                    {t('politics.seats.seats')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {seatsData.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td className="n">{row.seats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HBarPlot
            key={state.id}
            data={seatsData}
            series={[{ dataKey: 'seats', name: t('politics.seats.seats'), color: 'var(--series-1)' }]}
            format={(v) => num(v, 0)}
            marker={{ x: majority, label: t('politics.seats.majority', { count: majority }) }}
            title={t('politics.states.seatsTitle')}
            desc={seatsSummary}
          />
        </ChartCard>
        <ChartCard
          title={t('politics.states.compareTitle')}
          subtitle={t('politics.states.compareSub')}
          legend={
            <Legend
              items={[
                { label: t('politics.states.seatShare'), color: 'var(--series-1)' },
                { label: t('politics.states.voteShare'), color: 'var(--series-2)' },
              ]}
            />
          }
          height={compareData.length * 44 + 36}
          summary={compareSummary}
          meta={meta}
          table={
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('politics.states.party')}</th>
                  <th scope="col" className="n">
                    {t('politics.states.seatShare')}
                  </th>
                  <th scope="col" className="n">
                    {t('politics.states.voteShare')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareData.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td className="n">{pct(row.seatShare as number)}</td>
                    <td className="n">
                      {typeof row.voteShare === 'number' ? pct(row.voteShare) : t('politics.states.notReported')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HBarPlot
            key={state.id}
            data={compareData}
            series={[
              { dataKey: 'seatShare', name: t('politics.states.seatShare'), color: 'var(--series-1)' },
              { dataKey: 'voteShare', name: t('politics.states.voteShare'), color: 'var(--series-2)' },
            ]}
            format={pct}
            domainMax={100}
            title={t('politics.states.compareTitle')}
            desc={compareSummary}
          />
        </ChartCard>
      </div>
      <p className="fine-print">{t('politics.states.dataNote')}</p>
    </>
  )
}

function StateElections() {
  const { t, pick, release } = useI18n()
  const states = STATE_ELECTIONS_2026.states
  const [selected, setSelected] = useState(states[0]!.id)
  const idBase = useStableId('states')
  const state = states.find((s) => s.id === selected) ?? states[0]!
  return (
    <section className="panel" aria-labelledby="states-heading">
      <div className="panel-head">
        <h2 id="states-heading">{t('politics.states.heading')}</h2>
        <p>{t('politics.states.intro', { date: release(STATE_ELECTIONS_2026.released) })}</p>
      </div>
      <SegmentedTabs
        idBase={idBase}
        label={t('politics.states.tabs')}
        selected={selected}
        onSelect={setSelected}
        items={states.map((s) => ({ key: s.id, label: pick(s.name) }))}
      />
      <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${state.id}`} className="tabpanel" key={state.id}>
        <StatePanel state={state} />
      </div>
    </section>
  )
}

export function PoliticsSection() {
  const { t } = useI18n()
  const calendar = TIMELINE.filter((e) => e.area === 'politics').sort((a, b) => b.date.localeCompare(a.date))
  return (
    <>
      <section className="panel" aria-labelledby="seats-heading">
        <div className="panel-head">
          <h2 id="seats-heading">{t('politics.seats.heading')}</h2>
        </div>
        <div className="grid-2">
          <SeatCard dist={LOK_SABHA_2024} />
          <SeatCard dist={BIHAR_2025} />
        </div>
      </section>
      <StateElections />
      <section className="panel" aria-labelledby="calendar-heading">
        <div className="panel-head">
          <h2 id="calendar-heading">{t('politics.calendar.heading')}</h2>
        </div>
        <div className="card" style={{ padding: '0 16px' }}>
          <EventList events={calendar} />
        </div>
      </section>
    </>
  )
}
