import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../domain/types'
import {
  LANG_KEY,
  THEME_KEY,
  applyTheme,
  readPreferences,
  safeStorage,
  writePreference,
  type ThemePreference,
} from './storage'

interface PreferencesValue {
  theme: ThemePreference
  lang: Lang
  /** True once stored preferences have been read in the browser. */
  hydrated: boolean
  setTheme: (theme: ThemePreference) => void
  setLang: (lang: Lang) => void
}

const PreferencesContext = createContext<PreferencesValue | null>(null)

/**
 * Theme and language preferences. The first render (server and hydration)
 * always uses the defaults — device theme, English — so markup matches; stored
 * choices are read in an effect after hydration and persisted on change.
 */
export function PreferencesProvider({
  children,
  getStorage = safeStorage,
  getLanguages = () => (typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]),
}: {
  children: ReactNode
  getStorage?: () => Storage | null
  getLanguages?: () => readonly string[]
}) {
  const [theme, setThemeState] = useState<ThemePreference>('system')
  const [lang, setLangState] = useState<Lang>('en')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = readPreferences(getStorage(), getLanguages())
    setThemeState(stored.theme)
    setLangState(stored.lang)
    setHydrated(true)
    // Read once on mount only.
  }, [])

  useEffect(() => {
    if (hydrated) applyTheme(theme)
  }, [theme, hydrated])

  useEffect(() => {
    if (hydrated) document.documentElement.lang = lang
  }, [lang, hydrated])

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setThemeState(next)
      writePreference(getStorage(), THEME_KEY, next)
    },
    [getStorage],
  )

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next)
      writePreference(getStorage(), LANG_KEY, next)
    },
    [getStorage],
  )

  const value = useMemo(() => ({ theme, lang, hydrated, setTheme, setLang }), [theme, lang, hydrated, setTheme, setLang])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider')
  return value
}
