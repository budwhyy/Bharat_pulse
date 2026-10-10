import { describe, expect, it } from 'vitest'
import { categorize, isRoundup } from './categorize'
import { ageTier, formatAge, formatRelease, isReleaseOverdue, sourceHealth } from './freshness'

const NOW = new Date('2026-10-11T06:00:00Z')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()

describe('freshness labels', () => {
  it.each([
    [0, 'just now', 'अभी-अभी'],
    [12, '12 min ago', '12 मिनट पहले'],
    [180, '3 h ago', '3 घंटे पहले'],
    [60 * 30, 'yesterday', 'कल'],
    [60 * 24 * 3, '3 days ago', '3 दिन पहले'],
  ])('%i minutes → "%s" / "%s"', (minutes, en, hi) => {
    expect(formatAge(ago(minutes), NOW, 'en')).toBe(en)
    expect(formatAge(ago(minutes), NOW, 'hi')).toBe(hi)
  })

  it('falls back to a date after a week, and treats clock skew as just now', () => {
    expect(formatAge(ago(60 * 24 * 9), NOW, 'en')).toBe('2 Oct 2026')
    expect(formatAge(new Date(NOW.getTime() + 60_000).toISOString(), NOW, 'en')).toBe('just now')
  })

  it('tiers item age', () => {
    expect(ageTier(ago(30), NOW)).toBe('fresh')
    expect(ageTier(ago(600), NOW)).toBe('today')
    expect(ageTier(ago(60 * 30), NOW)).toBe('older')
  })

  it('formats release dates at the precision the source gives', () => {
    expect(formatRelease({ date: '2026-08-31', precision: 'day' }, 'en')).toBe('31 Aug 2026')
    expect(formatRelease({ date: '2026-09-01', precision: 'month' }, 'en')).toBe('Sept 2026')
    expect(formatRelease({ date: '2025-06-01', precision: 'year' }, 'en')).toBe('2025')
    expect(formatRelease({ date: '2026-09-01', precision: 'month' }, 'hi')).toBe('सित॰ 2026')
  })

  it('flags release records once a newer release is due (with grace)', () => {
    expect(isReleaseOverdue('2026-10-08', NOW)).toBe(true)
    expect(isReleaseOverdue('2026-10-10', NOW)).toBe(false)
    expect(isReleaseOverdue(null, NOW)).toBe(false)
  })
})

describe('source health', () => {
  const ok = { lastAttemptAt: ago(5), lastSuccessAt: ago(5), lastError: null, consecutiveFailures: 0, itemCount: 20 }

  it('is pending before any attempt and error when attempts never succeeded', () => {
    expect(sourceHealth(undefined, 10, NOW)).toBe('pending')
    expect(sourceHealth({ ...ok, lastSuccessAt: null, lastError: 'HTTP 503' }, 10, NOW)).toBe('error')
  })

  it('is ok while recent, stale after three missed refreshes, error after a failed attempt', () => {
    expect(sourceHealth(ok, 10, NOW)).toBe('ok')
    expect(sourceHealth({ ...ok, lastSuccessAt: ago(31), lastAttemptAt: ago(31) }, 10, NOW)).toBe('stale')
    expect(sourceHealth({ ...ok, lastError: 'Timed out' }, 10, NOW)).toBe('error')
    // Daily indicators are not stale after an hour.
    expect(sourceHealth({ ...ok, lastSuccessAt: ago(60) }, 24 * 60, NOW)).toBe('ok')
  })
})

describe('categorize', () => {
  it.each([
    ['RBI raises repo rate by 25 bps to 5.50%', 'en', 'economy'],
    ['Flash floods kill 12 in Uttarakhand', 'en', 'risk'],
    ['BJP names candidates for Bihar bypolls', 'en', 'politics'],
    ['Cabinet approves new scheme for drone manufacturing', 'en', 'policy'],
    ['Supreme Court seeks report on hospital fire safety', 'en', 'society'],
    ['Warm weather expected this week', 'en', 'general'],
    ['आरबीआई ने रेपो दर बढ़ाई', 'hi', 'economy'],
    ['असम में बाढ़ से हालात गंभीर', 'hi', 'risk'],
    ['विधानसभा चुनाव में भाजपा की जीत', 'hi', 'politics'],
    ['महिलाओं के लिए स्वास्थ्य शिविर', 'hi', 'society'],
  ] as const)('%s → %s', (title, lang, expected) => {
    expect(categorize({ title, lang })).toBe(expected)
  })

  it('does not match short terms inside longer words', () => {
    // "war" must not match "warning"/"award"; "mp" must not match "camp".
    expect(categorize({ title: 'Award ceremony and warning signs at camp', lang: 'en' })).toBe('general')
  })

  it.each([
    ['पढ़ें 11 अक्टूबर के मुख्य और ताजा समाचार - लाइव ब्लॉग', true],
    ['Top news today: what to watch', true],
    ['Morning brief: five things to know', true],
    ['Delhi protest: police detain hundreds near Jantar Mantar', false],
    ['RBI raises repo rate by 25 bps', false],
    ['बिहार में चुनाव की तैयारी तेज', false],
    ['मकर राशि', true],
    ['आज का राशिफल 11 अक्टूबर', true],
    ['Capricorn horoscope today: a good day for finances', true],
    ['Leo Varadarajan named new envoy', false],
  ] as const)('roundup filter: %s → %s', (title, expected) => {
    expect(isRoundup(title)).toBe(expected)
  })

  it('uses the source default as a tie-breaking prior', () => {
    expect(categorize({ title: 'Quarterly update released', lang: 'en', defaultCategory: 'economy' })).toBe('economy')
  })
})
