import { Check, Monitor, Moon, Radar, Sun, X } from 'lucide-react'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { DiscoveryView, Lang, SourceView } from '../../domain/types'
import type { MessageKey } from '../../i18n/messages'
import { useI18n } from '../../i18n/i18n'
import { usePreferences } from '../../preferences/PreferencesProvider'
import { THEMES, type ThemePreference } from '../../preferences/storage'
import { useNow } from '../common/hooks'
import { HealthTag } from '../common/ui'

export interface SettingsHandle {
  open: (focus?: 'top' | 'sources') => void
}

const THEME_ICON: Record<ThemePreference, typeof Sun> = { system: Monitor, light: Sun, dark: Moon }
const LANGUAGE_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी' }

const GROUPS: { key: string; label: MessageKey; match: (s: SourceView) => boolean }[] = [
  { key: 'official', label: 'settings.sources.group.official', match: (s) => s.type === 'news' && s.kind === 'official' && !s.discovered },
  { key: 'reported', label: 'settings.sources.group.reported', match: (s) => s.type === 'news' && s.kind === 'reported' && !s.discovered },
  { key: 'discovered', label: 'settings.sources.group.discovered', match: (s) => s.discovered },
  { key: 'indicators', label: 'settings.sources.group.indicators', match: (s) => s.type === 'indicator' },
]

function SourceRow({ source }: { source: SourceView }) {
  const { t, pick, dateTime, age } = useI18n()
  const now = useNow()
  return (
    <li>
      <span className="source-name">
        <a href={source.homepage} target="_blank" rel="noopener noreferrer">
          {pick(source.name)}
          <span className="sr-only"> {t('common.opensNewTab')}</span>
        </a>
      </span>
      <HealthTag health={source.health} />
      <span className="source-sub">
        {source.kind === 'official' ? t('updates.official') : t('updates.reported')} · {LANGUAGE_LABEL[source.lang]} ·{' '}
        {t('settings.sources.lastSuccess')}:{' '}
        {source.lastSuccessAt ? (
          <time dateTime={source.lastSuccessAt} title={dateTime(source.lastSuccessAt)}>
            {age(source.lastSuccessAt, now)}
          </time>
        ) : (
          t('settings.sources.never')
        )}
      </span>
      {source.lastError && (
        <span className="source-err">
          {t('settings.sources.error')}: {source.lastError}
        </span>
      )}
    </li>
  )
}

function DiscoveryStatus({ discovery }: { discovery: DiscoveryView }) {
  const { t, age, time } = useI18n()
  const now = useNow()
  if (!discovery.enabled) return null
  return (
    <div className="discovery-status" role="status">
      <Radar aria-hidden="true" className={discovery.running ? 'is-scanning' : undefined} />
      <div>
        <strong>{t('settings.discovery.title')}</strong>
        <span>
          {discovery.running
            ? t('settings.discovery.running')
            : discovery.lastRunAt
              ? t('settings.discovery.last', {
                  ago: age(discovery.lastRunAt, now),
                  checked: discovery.checked,
                  added: discovery.added,
                  retired: discovery.retired,
                  active: discovery.active,
                })
              : t('settings.discovery.pending')}
          {discovery.nextRunAt && !discovery.running && <> {t('settings.discovery.next', { time: time(discovery.nextRunAt) })}</>}
        </span>
        {discovery.lastError && <span className="source-err">{discovery.lastError}</span>}
      </div>
    </div>
  )
}


/**
 * Native modal dialog: focus is trapped and Escape closes it for free. Focus
 * returns to whatever opened it.
 */
export const SettingsDialog = forwardRef<SettingsHandle, { sources: SourceView[]; discovery: DiscoveryView }>(function SettingsDialog(
  { sources, discovery },
  ref,
) {
  const { t } = useI18n()
  const { theme, lang, setTheme, setLang } = usePreferences()
  const dialog = useRef<HTMLDialogElement>(null)
  const sourcesHeading = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useImperativeHandle(ref, () => ({
    open(focus = 'top') {
      const el = dialog.current
      if (!el) return
      returnFocus.current = document.activeElement as HTMLElement | null
      if (!el.open) el.showModal()
      if (focus === 'sources') {
        sourcesHeading.current?.focus()
        sourcesHeading.current?.scrollIntoView({ block: 'start' })
      }
    },
  }))

  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      className="settings"
      aria-labelledby="settings-title"
      onClose={() => returnFocus.current?.focus()}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === dialog.current) close()
      }}
    >
      <div className="settings-head">
        <h2 id="settings-title">{t('settings.title')}</h2>
        <button type="button" className="icon-btn" onClick={close} aria-label={t('settings.close')}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="settings-body">
        <fieldset>
          <legend>{t('settings.theme')}</legend>
          <div className="radio-row">
            {THEMES.map((option) => {
              const Icon = THEME_ICON[option]
              return (
                <label key={option} className="radio-card">
                  <input
                    type="radio"
                    name="theme"
                    value={option}
                    checked={theme === option}
                    onChange={() => setTheme(option)}
                  />
                  <Icon aria-hidden="true" />
                  {t(`settings.theme.${option}`)}
                  <Check className="check" aria-hidden="true" />
                </label>
              )
            })}
          </div>
          <p className="settings-hint">{t('settings.motion')}</p>
        </fieldset>

        <fieldset>
          <legend>{t('settings.language')}</legend>
          <div className="radio-row">
            {(['en', 'hi'] as const).map((option) => (
              <label key={option} className="radio-card" lang={option}>
                <input
                  type="radio"
                  name="language"
                  value={option}
                  checked={lang === option}
                  onChange={() => setLang(option)}
                />
                {LANGUAGE_LABEL[option]}
                <Check className="check" aria-hidden="true" />
              </label>
            ))}
          </div>
          <p className="settings-hint">{t('settings.language.hint')}</p>
        </fieldset>

        <section aria-labelledby="sources-title">
          <h3 id="sources-title" ref={sourcesHeading} tabIndex={-1}>
            {t('settings.sources')}
          </h3>
          <p className="settings-hint" style={{ marginTop: 0, marginBottom: 10 }}>
            {t('settings.sources.intro')}
          </p>
          <DiscoveryStatus discovery={discovery} />
          {GROUPS.map((group) => {
            const list = sources.filter(group.match)
            if (list.length === 0) return null
            return (
              <div key={group.key} className="source-group">
                <h4>
                  {t(group.label)} <span className="source-count">{list.length}</span>
                </h4>
                <ul className="source-list">
                  {list.map((source) => (
                    <SourceRow key={source.id} source={source} />
                  ))}
                </ul>
              </div>
            )
          })}
        </section>
      </div>
    </dialog>
  )
})
