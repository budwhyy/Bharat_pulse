// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { useI18n } from '../i18n/i18n'
import { PreferencesProvider, usePreferences } from './PreferencesProvider'
import { LANG_KEY, THEME_KEY, deviceLanguage, readPreferences } from './storage'

function Probe() {
  const { theme, lang, hydrated, setLang, setTheme } = usePreferences()
  const { t } = useI18n()
  return (
    <div>
      <p data-testid="state">{`${theme}|${lang}|${hydrated}`}</p>
      <h1>{t('nav.economy')}</h1>
      <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>toggle language</button>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('system')}>system</button>
    </div>
  )
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  }
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.lang = 'en'
})

describe('preference defaults', () => {
  it('follows the device language between Hindi and English', () => {
    expect(deviceLanguage(['hi-IN', 'en-US'])).toBe('hi')
    expect(deviceLanguage(['en-IN', 'hi'])).toBe('en')
    expect(deviceLanguage(['ta-IN', 'fr'])).toBe('en')
  })

  it('ignores invalid stored values', () => {
    const storage = memoryStorage({ [THEME_KEY]: 'neon', [LANG_KEY]: 'fr' })
    expect(readPreferences(storage, ['hi-IN'])).toEqual({ theme: 'system', lang: 'hi' })
  })
})

describe('PreferencesProvider', () => {
  it('renders English on the server regardless of stored preferences (no hydration mismatch)', () => {
    const storage = memoryStorage({ [LANG_KEY]: 'hi', [THEME_KEY]: 'dark' })
    const html = renderToString(
      <PreferencesProvider getStorage={() => storage} getLanguages={() => ['hi-IN']}>
        <Probe />
      </PreferencesProvider>,
    )
    expect(html).toContain('system|en|false')
    expect(html).toContain('Economy')
  })

  it('applies stored Hindi and dark theme after hydration', async () => {
    const storage = memoryStorage({ [LANG_KEY]: 'hi', [THEME_KEY]: 'dark' })
    render(
      <PreferencesProvider getStorage={() => storage} getLanguages={() => ['en-US']}>
        <Probe />
      </PreferencesProvider>,
    )
    expect(await screen.findByText('dark|hi|true')).toBeInTheDocument()
    expect(screen.getByRole('heading')).toHaveTextContent('अर्थव्यवस्था')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.lang).toBe('hi')
  })

  it('defaults to the device language and theme when nothing is stored', async () => {
    const storage = memoryStorage()
    render(
      <PreferencesProvider getStorage={() => storage} getLanguages={() => ['hi-IN', 'en']}>
        <Probe />
      </PreferencesProvider>,
    )
    expect(await screen.findByText('system|hi|true')).toBeInTheDocument()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('persists changes and survives storage that throws', async () => {
    const storage = memoryStorage()
    const user = userEvent.setup()
    const { unmount } = render(
      <PreferencesProvider getStorage={() => storage} getLanguages={() => ['en']}>
        <Probe />
      </PreferencesProvider>,
    )
    await screen.findByText('system|en|true')
    await user.click(screen.getByText('toggle language'))
    await user.click(screen.getByText('dark'))
    expect(storage.getItem(LANG_KEY)).toBe('hi')
    expect(storage.getItem(THEME_KEY)).toBe('dark')
    await user.click(screen.getByText('system'))
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    unmount()

    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    render(
      <PreferencesProvider getStorage={() => broken} getLanguages={() => ['en']}>
        <Probe />
      </PreferencesProvider>,
    )
    await screen.findByText('system|en|true')
    await act(async () => {
      await user.click(screen.getByText('toggle language'))
    })
    expect(screen.getByTestId('state')).toHaveTextContent('system|hi|true')
  })
})
