import type { Lang } from '../domain/types'

export type ThemePreference = 'system' | 'light' | 'dark'
export const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark']

export const THEME_KEY = 'bharat-pulse:theme'
export const LANG_KEY = 'bharat-pulse:lang'

export interface StoredPreferences {
  theme: ThemePreference
  lang: Lang
}

/** Browser storage can be missing or throw (private mode, blocked site data). */
export function safeStorage(): Storage | null {
  try {
    const storage = window.localStorage
    const probe = '__bp_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

function read(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writePreference(storage: Storage | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value)
  } catch {
    // Preferences still apply for this visit.
  }
}

/** The device's preferred language between Hindi and English; English otherwise. */
export function deviceLanguage(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split('-')[0]
    if (primary === 'hi') return 'hi'
    if (primary === 'en') return 'en'
  }
  return 'en'
}

/** Stored choices win; otherwise theme follows the device and language follows the browser. */
export function readPreferences(storage: Storage | null, languages: readonly string[]): StoredPreferences {
  const theme = read(storage, THEME_KEY)
  const lang = read(storage, LANG_KEY)
  return {
    theme: THEMES.includes(theme as ThemePreference) ? (theme as ThemePreference) : 'system',
    lang: lang === 'en' || lang === 'hi' ? lang : deviceLanguage(languages),
  }
}

export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

/**
 * Runs before first paint (inlined in <head>) so an explicit light/dark choice
 * doesn't flash. It only sets data-theme; React state still reads storage after
 * hydration, so server and client markup stay identical.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`
