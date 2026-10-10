import { useMemo } from 'react'
import {
  formatAge,
  formatDate,
  formatDateTime,
  formatRelease,
  formatTime,
} from '../domain/freshness'
import type { Lang, Localized, ReleaseDate } from '../domain/types'
import { usePreferences } from '../preferences/PreferencesProvider'
import { MESSAGES, interpolate, type MessageKey } from './messages'

export interface I18n {
  lang: Lang
  locale: string
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  pick: (text: Localized) => string
  num: (value: number, decimals?: number) => string
  date: (iso: string) => string
  dateTime: (iso: string) => string
  time: (iso: string) => string
  age: (iso: string, now: Date) => string
  release: (release: ReleaseDate) => string
}

export function makeI18n(lang: Lang): I18n {
  const dict = MESSAGES[lang]
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN'
  const formats = new Map<number, Intl.NumberFormat>()
  return {
    lang,
    locale,
    t: (key, vars) => interpolate(dict[key], vars),
    pick: (text) => text[lang],
    num: (value, decimals = 0) => {
      let format = formats.get(decimals)
      if (!format) {
        format = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        formats.set(decimals, format)
      }
      return format.format(value)
    },
    date: (iso) => formatDate(iso, lang),
    dateTime: (iso) => formatDateTime(iso, lang),
    time: (iso) => formatTime(iso, lang),
    age: (iso, now) => formatAge(iso, now, lang),
    release: (release) => formatRelease(release, lang),
  }
}

export function useI18n(): I18n {
  const { lang } = usePreferences()
  return useMemo(() => makeI18n(lang), [lang])
}
