import type { Category, Lang } from './types'

type Scored = Exclude<Category, 'general'>

/**
 * Deterministic keyword rules. English terms match whole words unless they end
 * in `*` (a stem). Hindi terms match at a word start, so inflected forms
 * (महिला → महिलाओं) still count. Highest score wins; ties fall to PRIORITY.
 */
const EN: Record<Scored, string[]> = {
  risk: [
    'flood', 'floods', 'flooding', 'cyclone*', 'earthquake*', 'landslide*', 'heatwave*', 'heat wave', 'drought*',
    'wildfire*', 'terror*', 'militant*', 'naxal*', 'maoist*', 'insurgen*', 'infiltrat*', 'ceasefire', 'loc',
    'blast*', 'explosion*', 'attack*', 'killed', 'death toll', 'outbreak*', 'epidemic*', 'pandemic*',
    'disaster*', 'evacuat*', 'curfew*', 'stampede*', 'derail*', 'war', 'missile*', 'hormuz', 'cross-border',
    'shelling', 'airstrike*', 'cyberattack*',
  ],
  politics: [
    'election*', 'poll', 'polls', 'bjp', 'congress', 'aap', 'tmc', 'aitc', 'dmk', 'aiadmk', 'tvk', 'rjd', 'jd(u)',
    'samajwadi', 'shiv sena', 'ncp', 'lok sabha', 'rajya sabha', 'parliament*', 'mp', 'mps', 'mla', 'mlas',
    'chief minister', 'opposition', 'india bloc', 'nda', 'cec', 'election commission', 'governor', 'speaker',
    'campaign*', 'rally', 'vote*', 'voter*', 'assembly', 'by-election*', 'bypoll*', 'prime minister', 'modi',
    'rahul gandhi', 'party', 'coalition',
  ],
  economy: [
    'gdp', 'inflation', 'cpi', 'wpi', 'rbi', 'repo', 'rate hike', 'rate cut', 'monetary', 'econom*', 'fiscal',
    'deficit', 'tax*', 'gst', 'rupee', 'forex', 'export*', 'import*', 'trade', 'tariff*', 'sensex', 'nifty',
    'stock*', 'investor*', 'investment*', 'fdi', 'bank*', 'loan*', 'credit', 'upi', 'payment*', 'crude',
    'fuel price*', 'budget', 'revenue', 'manufacturing', 'pmi', 'iip', 'industr*', 'market*', 'growth',
    'bps', 'basis points', 'bond*', 'yield*',
  ],
  policy: [
    'scheme*', 'policy', 'policies', 'bill', 'act', 'amendment*', 'ordinance', 'notif*', 'guideline*', 'rules',
    'regulat*', 'circular*', 'directive*', 'ministry', 'launch*', 'approves', 'approval', 'mou', 'reform*',
    'programme*', 'program', 'yojana', 'mission', 'portal', 'framework', 'labour code*', 'census',
    'cabinet', 'inaugurat*', 'initiative*',
  ],
  society: [
    'school*', 'education', 'exam*', 'student*', 'universit*', 'health*', 'hospital*', 'doctor*', 'women',
    'woman', 'girl*', 'child', 'children', 'caste*', 'tribal', 'dalit*', 'farmer*', 'rural', 'village*',
    'pollution', 'air quality', 'aqi', 'environment*', 'climate', 'religio*', 'festival*', 'court', 'supreme court',
    'high court', 'verdict*', 'judge*', 'protest*', 'police', 'crime*', 'youth', 'job*', 'employment', 'housing',
    'water', 'sanitation', 'zoo', 'wildlife', 'activist*', 'detain*', 'detention*', 'human rights',
  ],
}

const HI: Record<Scored, string[]> = {
  risk: [
    'बाढ़', 'भूकंप', 'चक्रवात', 'तूफान', 'तूफ़ान', 'भूस्खलन', 'सूखा', 'आतंक', 'नक्सल', 'माओवादी', 'मुठभेड़',
    'घुसपैठ', 'संघर्षविराम', 'सीजफायर', 'धमाका', 'धमाके', 'विस्फोट', 'हमला', 'हमले', 'महामारी', 'संक्रमण',
    'कर्फ्यू', 'कर्फ़्यू', 'भगदड़', 'युद्ध', 'मिसाइल', 'हादसा', 'हादसे', 'दुर्घटना', 'आपदा', 'होर्मुज',
  ],
  politics: [
    'चुनाव', 'मतदान', 'वोट', 'मतदाता', 'भाजपा', 'बीजेपी', 'कांग्रेस', 'सपा', 'बसपा', 'टीएमसी', 'तृणमूल',
    'डीएमके', 'द्रमुक', 'राजद', 'जदयू', 'लोकसभा', 'राज्यसभा', 'संसद', 'सांसद', 'विधायक', 'मुख्यमंत्री',
    'सीएम', 'विपक्ष', 'इंडिया ब्लॉक', 'इंडिया गठबंधन', 'एनडीए', 'चुनाव आयोग', 'मुख्य चुनाव आयुक्त', 'राज्यपाल',
    'रैली', 'प्रधानमंत्री', 'मोदी', 'राहुल गांधी', 'पार्टी', 'गठबंधन', 'विधानसभा', 'उपचुनाव', 'इस्तीफ',
  ],
  economy: [
    'जीडीपी', 'महंगाई', 'मुद्रास्फीति', 'आरबीआई', 'रिजर्व बैंक', 'रिज़र्व बैंक', 'रेपो', 'ब्याज दर', 'अर्थव्यवस्था',
    'आर्थिक', 'विकास दर', 'राजकोषीय', 'घाटा', 'टैक्स', 'जीएसटी', 'रुपया', 'रुपये', 'विदेशी मुद्रा', 'निर्यात',
    'आयात', 'व्यापार', 'टैरिफ', 'शेयर', 'बाजार', 'बाज़ार', 'सेंसेक्स', 'निफ्टी', 'निवेश', 'बैंक', 'कर्ज',
    'ऋण', 'यूपीआई', 'भुगतान', 'कच्चा तेल', 'पेट्रोल', 'डीजल', 'बजट', 'राजस्व', 'उद्योग', 'औद्योगिक',
  ],
  policy: [
    'योजना', 'नीति', 'विधेयक', 'अधिनियम', 'कानून', 'क़ानून', 'संशोधन', 'अध्यादेश', 'अधिसूचना', 'दिशानिर्देश',
    'नियम', 'परिपत्र', 'मंत्रालय', 'शुभारंभ', 'मंजूरी', 'मंज़ूरी', 'समझौत', 'सुधार', 'कार्यक्रम', 'मिशन',
    'पोर्टल', 'जनगणना', 'संहिता', 'कैबिनेट', 'मंत्रिमंडल', 'उद्घाटन', 'पहल',
  ],
  society: [
    'स्कूल', 'शिक्षा', 'परीक्षा', 'छात्र', 'विश्वविद्यालय', 'स्वास्थ्य', 'अस्पताल', 'डॉक्टर', 'महिला', 'बच्च',
    'जाति', 'आदिवासी', 'दलित', 'किसान', 'ग्रामीण', 'गांव', 'गाँव', 'प्रदूषण', 'पर्यावरण', 'जलवायु', 'धर्म',
    'संस्कृति', 'त्योहार', 'अदालत', 'सुप्रीम कोर्ट', 'हाईकोर्ट', 'हाई कोर्ट', 'उच्च न्यायालय', 'फैसला', 'फ़ैसला',
    'प्रदर्शन', 'प्रदर्शनकारी', 'पुलिस', 'अपराध', 'युवा', 'रोजगार', 'रोज़गार', 'नौकरी', 'आवास', 'पानी', 'हिरासत',
    'प्रोटेस्ट',
  ],
}

const PRIORITY: readonly Scored[] = ['risk', 'politics', 'economy', 'policy', 'society']

/**
 * Not news items in their own right, dropped before selection: daily digests
 * and generic live blogs ("read today's top news"), and horoscopes, which some
 * home-page feeds mix in.
 */
const ROUNDUP = [
  /\b(horoscope|zodiac|tarot)\b/i,
  /राशिफल|ज्योतिष|टैरो/u,
  /^(मेष|वृषभ|मिथुन|कर्क|सिंह|कन्या|तुला|वृश्चिक|धनु|मकर|कुंभ|कुम्भ|मीन)\s+राशि/u,
  /^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b.{0,40}(today|daily|weekly|prediction)/i,
  /\blive\s+blog\b/i,
  /\b(top|morning|evening|today'?s)\s+(news|headlines)\b/i,
  /\bnews\s+(today\s+)?live\b/i,
  /\b(news|morning|evening)\s+(brief|briefing|digest|wrap)\b/i,
  /लाइव\s+ब्लॉग/u,
  /(मुख्य|ताज़ा|ताजा|बड़ी)\s+(और\s+(ताज़ा|ताजा)\s+)?(समाचार|ख़बरें|खबरें)/u,
]

export function isRoundup(title: string): boolean {
  return ROUNDUP.some((pattern) => pattern.test(title))
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function compileEn(term: string): RegExp {
  const stem = term.endsWith('*')
  const body = escape(stem ? term.slice(0, -1) : term).replace(/\s+/g, '\\s+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${stem ? '' : '(?![\\p{L}\\p{N}])'}`, 'iu')
}

function compileHi(term: string): RegExp {
  // Word-start boundary only: Devanagari letters and combining marks (U+0900–U+097F).
  return new RegExp(`(?<![\\u0900-\\u097F])${escape(term).replace(/\s+/g, '\\s+')}`, 'u')
}

const RULES: Record<Lang, Record<Scored, RegExp[]>> = {
  en: Object.fromEntries(PRIORITY.map((c) => [c, EN[c].map(compileEn)])) as Record<Scored, RegExp[]>,
  hi: Object.fromEntries(
    PRIORITY.map((c) => [c, [...HI[c].map(compileHi), ...EN[c].map(compileEn)]]),
  ) as Record<Scored, RegExp[]>,
}

export function scoreCategories(text: string, lang: Lang): Record<Scored, number> {
  const scores = { risk: 0, politics: 0, economy: 0, policy: 0, society: 0 }
  for (const category of PRIORITY) {
    for (const rule of RULES[lang][category]) if (rule.test(text)) scores[category] += 1
  }
  return scores
}

/**
 * Classifies a headline (+ optional summary). Headline matches count double.
 * A source's default category adds a weak prior, e.g. an economy feed.
 */
export function categorize(
  input: { title: string; summary?: string | null; lang: Lang; defaultCategory?: Category },
): Category {
  const title = scoreCategories(input.title, input.lang)
  const summary = input.summary ? scoreCategories(input.summary, input.lang) : null
  let best: Category = 'general'
  let bestScore = 0
  for (const category of PRIORITY) {
    let score = title[category] * 2 + (summary?.[category] ?? 0)
    if (input.defaultCategory === category) score += 1
    if (score > bestScore) {
      best = category
      bestScore = score
    }
  }
  return best
}
