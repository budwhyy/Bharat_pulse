/**
 * Dated, cited context from the Bharat Pulse briefing (11 Oct 2026): election
 * results, the national timeline, the policy tracker and the analyst risk
 * register. Rendered as-is; none of it is presented as live.
 */
import type { Localized, ReleaseDate, SourceRef } from '../domain/types'
import { CITATIONS } from './briefing'

// ---------------------------------------------------------------------------
// Elections

export interface Bloc {
  id: 'nda' | 'india' | 'mgb' | 'others'
  name: Localized
  seats: number
}

export interface SeatDistribution {
  id: string
  title: Localized
  total: number
  blocs: Bloc[]
  released: ReleaseDate
  source: SourceRef
}

const NDA: Localized = { en: 'NDA', hi: 'एनडीए' }
const OTHERS: Localized = { en: 'Others', hi: 'अन्य' }

export const LOK_SABHA_2024: SeatDistribution = {
  id: 'ls2024',
  title: { en: 'Lok Sabha 2024', hi: 'लोकसभा 2024' },
  total: 543,
  blocs: [
    { id: 'nda', name: NDA, seats: 293 },
    { id: 'india', name: { en: 'INDIA bloc', hi: 'इंडिया गठबंधन' }, seats: 234 },
    { id: 'others', name: OTHERS, seats: 16 },
  ],
  released: { date: '2024-06-04', precision: 'day' },
  source: CITATIONS.eci,
}

export const BIHAR_2025: SeatDistribution = {
  id: 'bihar2025',
  title: { en: 'Bihar Assembly 2025', hi: 'बिहार विधानसभा 2025' },
  total: 243,
  blocs: [
    { id: 'nda', name: NDA, seats: 202 },
    { id: 'mgb', name: { en: 'Mahagathbandhan', hi: 'महागठबंधन' }, seats: 34 },
    { id: 'others', name: OTHERS, seats: 7 },
  ],
  released: { date: '2025-11-14', precision: 'day' },
  source: CITATIONS.bihar,
}

export const PARTY_NAMES: Record<string, Localized> = {
  BJP: { en: 'BJP', hi: 'भाजपा' },
  INC: { en: 'Congress', hi: 'कांग्रेस' },
  AITC: { en: 'Trinamool', hi: 'तृणमूल' },
  TVK: { en: 'TVK', hi: 'टीवीके' },
  DMK: { en: 'DMK', hi: 'द्रमुक' },
  AIADMK: { en: 'AIADMK', hi: 'अन्नाद्रमुक' },
  'CPI(M)': { en: 'CPI(M)', hi: 'माकपा' },
  IUML: { en: 'IUML', hi: 'आईयूएमएल' },
  AGP: { en: 'AGP', hi: 'अगप' },
  BOPF: { en: 'BPF', hi: 'बीपीएफ़' },
  AINRC: { en: 'AINRC', hi: 'एआईएनआरसी' },
  PMK: { en: 'PMK', hi: 'पीएमके' },
  CPI: { en: 'CPI', hi: 'भाकपा' },
  KEC: { en: 'Kerala Congress', hi: 'केरल कांग्रेस' },
  Others: OTHERS,
}

export interface PartyResult {
  party: keyof typeof PARTY_NAMES
  seats: number
  /** Vote share, % — null where the cited source gives none. */
  votes: number | null
}

export interface StateResult {
  id: string
  name: Localized
  total: number
  government: Localized
  note: Localized
  parties: PartyResult[]
}

export const STATE_ELECTIONS_2026 = {
  released: { date: '2026-05-04', precision: 'day' } satisfies ReleaseDate,
  source: CITATIONS.states2026,
  states: [
    {
      id: 'west-bengal',
      name: { en: 'West Bengal', hi: 'पश्चिम बंगाल' },
      total: 294,
      government: { en: 'BJP — first time in power', hi: 'भाजपा — पहली बार सत्ता में' },
      note: {
        en: 'Mamata Banerjee lost her own seat. Turnout was a record 92.5%.',
        hi: 'ममता बनर्जी अपनी ही सीट हार गईं। मतदान रिकॉर्ड 92.5% रहा।',
      },
      parties: [
        { party: 'BJP', seats: 207, votes: 45.84 },
        { party: 'AITC', seats: 80, votes: 40.8 },
        { party: 'INC', seats: 2, votes: 2.97 },
        { party: 'CPI(M)', seats: 1, votes: 4.45 },
      ],
    },
    {
      id: 'tamil-nadu',
      name: { en: 'Tamil Nadu', hi: 'तमिलनाडु' },
      total: 234,
      government: { en: 'TVK-led coalition (CM Vijay)', hi: 'टीवीके के नेतृत्व में गठबंधन (मुख्यमंत्री विजय)' },
      note: {
        en: 'First government in about 60 years led by neither the DMK nor the AIADMK; Congress joined the cabinet.',
        hi: 'लगभग 60 वर्षों में पहली सरकार जिसका नेतृत्व न द्रमुक कर रही है न अन्नाद्रमुक; कांग्रेस मंत्रिमंडल में शामिल हुई।',
      },
      parties: [
        { party: 'TVK', seats: 108, votes: 34.92 },
        { party: 'DMK', seats: 59, votes: 24.19 },
        { party: 'AIADMK', seats: 47, votes: 21.21 },
        { party: 'INC', seats: 5, votes: 3.37 },
        { party: 'PMK', seats: 4, votes: null },
      ],
    },
    {
      id: 'kerala',
      name: { en: 'Kerala', hi: 'केरल' },
      total: 140,
      government: { en: 'Congress-led UDF', hi: 'कांग्रेस के नेतृत्व वाला यूडीएफ़' },
      note: {
        en: 'A decisive swing back to the UDF; the Left is out of power in its last state.',
        hi: 'यूडीएफ़ की ओर निर्णायक वापसी; वाम दल अपने आख़िरी राज्य में भी सत्ता से बाहर।',
      },
      parties: [
        { party: 'INC', seats: 63, votes: 28.79 },
        { party: 'CPI(M)', seats: 26, votes: 21.77 },
        { party: 'IUML', seats: 22, votes: 11.01 },
        { party: 'CPI', seats: 8, votes: 0.66 },
        { party: 'KEC', seats: 7, votes: 2.43 },
      ],
    },
    {
      id: 'assam',
      name: { en: 'Assam', hi: 'असम' },
      total: 126,
      government: { en: 'BJP retained power', hi: 'भाजपा ने सत्ता बरकरार रखी' },
      note: {
        en: 'The BJP won a majority on its own; allies AGP and BPF add to it.',
        hi: 'भाजपा ने अपने दम पर बहुमत हासिल किया; सहयोगी अगप और बीपीएफ़ इसे और बढ़ाते हैं।',
      },
      parties: [
        { party: 'BJP', seats: 82, votes: 37.81 },
        { party: 'INC', seats: 19, votes: 29.84 },
        { party: 'AGP', seats: 10, votes: 6.47 },
        { party: 'BOPF', seats: 10, votes: 3.73 },
      ],
    },
    {
      id: 'puducherry',
      name: { en: 'Puducherry', hi: 'पुडुचेरी' },
      total: 30,
      government: { en: 'AINRC-led NDA', hi: 'एआईएनआरसी के नेतृत्व वाला एनडीए' },
      note: {
        en: 'TVK took two seats and 16.7% of the vote on debut.',
        hi: 'टीवीके ने पहले ही चुनाव में दो सीटें और 16.7% वोट हासिल किए।',
      },
      parties: [
        { party: 'AINRC', seats: 12, votes: 23.12 },
        { party: 'DMK', seats: 5, votes: 13.74 },
        { party: 'BJP', seats: 4, votes: 12.19 },
        { party: 'TVK', seats: 2, votes: 16.72 },
      ],
    },
  ] satisfies StateResult[],
}

// ---------------------------------------------------------------------------
// National timeline

export type Area = 'politics' | 'economy' | 'policy' | 'society' | 'trade' | 'security' | 'risk'
export const AREAS: readonly Area[] = ['politics', 'economy', 'policy', 'society', 'trade', 'security', 'risk']

export interface TimelineEvent {
  date: string
  area: Area
  text: Localized
  source: SourceRef | null
}

export const TIMELINE: TimelineEvent[] = [
  { date: '2025-11-14', area: 'politics', source: CITATIONS.bihar, text: { en: 'NDA wins Bihar with 202 of 243 seats', hi: 'बिहार में एनडीए ने 243 में से 202 सीटें जीतीं' } },
  { date: '2025-11-21', area: 'policy', source: CITATIONS.labourCodes, text: { en: 'Four labour codes take effect, replacing 29 central laws', hi: 'चार श्रम संहिताएँ लागू, 29 केंद्रीय क़ानूनों की जगह ली' } },
  { date: '2026-02-02', area: 'trade', source: null, text: { en: 'India–US interim trade understanding; US tariff cut to 18%', hi: 'भारत–अमेरिका अंतरिम व्यापार सहमति; अमेरिकी टैरिफ़ घटकर 18%' } },
  { date: '2026-02-20', area: 'trade', source: CITATIONS.tariff, text: { en: 'US Supreme Court strikes down IEEPA tariffs; deal timeline slips', hi: 'अमेरिकी सुप्रीम कोर्ट ने IEEPA टैरिफ़ रद्द किए; समझौते की समय-सीमा खिसकी' } },
  { date: '2026-02-28', area: 'risk', source: null, text: { en: 'US–Israel–Iran war begins; Strait of Hormuz disrupted', hi: 'अमेरिका–इज़राइल–ईरान युद्ध शुरू; होर्मुज जलडमरूमध्य बाधित' } },
  { date: '2026-03-13', area: 'politics', source: CITATIONS.cec, text: { en: '193 opposition MPs file first-ever notice to remove the CEC', hi: '193 विपक्षी सांसदों ने मुख्य चुनाव आयुक्त को हटाने का पहला नोटिस दिया' } },
  { date: '2026-03-30', area: 'security', source: null, text: { en: 'Home Minister declares India effectively Naxal-free', hi: 'गृह मंत्री ने भारत को लगभग नक्सल-मुक्त घोषित किया' } },
  { date: '2026-04-01', area: 'society', source: CITATIONS.census, text: { en: 'Census 2027 houselisting begins (first digital census)', hi: 'जनगणना 2027 का मकान-सूचीकरण शुरू (पहली डिजिटल जनगणना)' } },
  { date: '2026-05-04', area: 'politics', source: CITATIONS.states2026, text: { en: 'BJP wins Bengal and Assam; TVK largest in Tamil Nadu; UDF wins Kerala', hi: 'भाजपा ने बंगाल और असम जीते; तमिलनाडु में टीवीके सबसे बड़ी पार्टी; केरल में यूडीएफ़ जीता' } },
  { date: '2026-05-10', area: 'politics', source: CITATIONS.vijay, text: { en: 'Vijay sworn in as Tamil Nadu Chief Minister', hi: 'विजय ने तमिलनाडु के मुख्यमंत्री पद की शपथ ली' } },
  { date: '2026-07-20', area: 'society', source: CITATIONS.genz, text: { en: 'Gen Z march on Parliament over exam paper leaks', hi: 'परीक्षा पेपर लीक के ख़िलाफ़ जेन ज़ी का संसद मार्च' } },
  { date: '2026-07-25', area: 'politics', source: CITATIONS.genz, text: { en: 'Education Minister Dharmendra Pradhan resigns', hi: 'शिक्षा मंत्री धर्मेंद्र प्रधान का इस्तीफ़ा' } },
  { date: '2026-08-31', area: 'economy', source: CITATIONS.gdpQ1, text: { en: 'Q1 FY27 GDP growth printed at 7.8%', hi: 'Q1 FY27 में जीडीपी वृद्धि 7.8% दर्ज' } },
  { date: '2026-09-30', area: 'politics', source: CITATIONS.cec, text: { en: 'INDIA bloc meets on a fresh push to remove the CEC', hi: 'मुख्य चुनाव आयुक्त को हटाने की नई मुहिम पर इंडिया गठबंधन की बैठक' } },
  { date: '2026-10-07', area: 'economy', source: CITATIONS.rbi, text: { en: 'RBI raises the repo rate 25 bp to 5.50%', hi: 'आरबीआई ने रेपो दर 25 आधार अंक बढ़ाकर 5.50% की' } },
  { date: '2026-10-15', area: 'policy', source: null, text: { en: '0.4% fee on merchant UPI payments above ₹2,000 begins', hi: '₹2,000 से ऊपर के मर्चेंट यूपीआई भुगतान पर 0.4% शुल्क शुरू' } },
  { date: '2027-02-09', area: 'society', source: CITATIONS.census, text: { en: 'Census population count with caste, 9–28 Feb 2027', hi: 'जाति सहित जनगणना की जनसंख्या गणना, 9–28 फ़रवरी 2027' } },
]

// ---------------------------------------------------------------------------
// Policy tracker

export type PolicyStatus = 'active' | 'upcoming' | 'stalled'
export const POLICY_STATUSES: readonly PolicyStatus[] = ['active', 'upcoming', 'stalled']

export interface PolicyItem {
  id: string
  name: Localized
  status: PolicyStatus
  statusText: Localized
  /** Month the measure started or was announced (YYYY-MM). */
  since: string
  note: Localized
  source: SourceRef | null
}

export const POLICIES: PolicyItem[] = [
  {
    id: 'labour-codes',
    name: { en: 'Four labour codes', hi: 'चार श्रम संहिताएँ' },
    status: 'active',
    statusText: { en: 'In force', hi: 'लागू' },
    since: '2025-11',
    note: {
      en: '29 central labour laws consolidated; central rules notified May 2026; state rules still rolling out.',
      hi: '29 केंद्रीय श्रम क़ानून समेकित; केंद्रीय नियम मई 2026 में अधिसूचित; राज्यों के नियम अभी आ रहे हैं।',
    },
    source: CITATIONS.labourCodes,
  },
  {
    id: 'new-series',
    name: { en: 'New GDP and CPI series', hi: 'नई जीडीपी और सीपीआई शृंखला' },
    status: 'active',
    statusText: { en: 'In use', hi: 'उपयोग में' },
    since: '2026-02',
    note: {
      en: 'GDP base 2022-23 and CPI base 2024; growth and inflation are not directly comparable with older prints.',
      hi: 'जीडीपी का आधार वर्ष 2022-23 और सीपीआई का 2024; वृद्धि और महंगाई के आँकड़े पुराने आँकड़ों से सीधे तुलनीय नहीं।',
    },
    source: CITATIONS.gdpSeries,
  },
  {
    id: 'census',
    name: { en: 'Census 2027 with caste', hi: 'जाति सहित जनगणना 2027' },
    status: 'upcoming',
    statusText: { en: 'Phase 2 due', hi: 'दूसरा चरण बाक़ी' },
    since: '2026-04',
    note: {
      en: 'Houselisting ran Apr–Sep 2026; the population count with an open caste question follows in Feb 2027.',
      hi: 'मकान-सूचीकरण अप्रैल–सितंबर 2026 में हुआ; फ़रवरी 2027 में जाति के खुले प्रश्न के साथ जनसंख्या गणना होगी।',
    },
    source: CITATIONS.census,
  },
  {
    id: 'us-trade',
    name: { en: 'India–US trade agreement', hi: 'भारत–अमेरिका व्यापार समझौता' },
    status: 'stalled',
    statusText: { en: 'Unfinished', hi: 'अधूरा' },
    since: '2026-02',
    note: {
      en: 'The interim understanding stalled after US tariff law changes; a 10% US levy hits about 55% of exports to the US.',
      hi: 'अमेरिकी टैरिफ़ क़ानून में बदलाव के बाद अंतरिम सहमति अटकी; 10% अमेरिकी शुल्क अमेरिका को होने वाले लगभग 55% निर्यात पर लागू।',
    },
    source: CITATIONS.tariff,
  },
  {
    id: 'upi-fee',
    name: { en: 'UPI merchant fee', hi: 'यूपीआई मर्चेंट शुल्क' },
    status: 'upcoming',
    statusText: { en: 'From 15 Oct', hi: '15 अक्टूबर से' },
    since: '2026-10',
    note: {
      en: '0.4% on merchant payments above ₹2,000; person-to-person payments stay free; traders are lobbying against it.',
      hi: '₹2,000 से ऊपर के मर्चेंट भुगतान पर 0.4%; व्यक्ति-से-व्यक्ति भुगतान मुफ़्त रहेंगे; व्यापारी इसका विरोध कर रहे हैं।',
    },
    source: null,
  },
  {
    id: 'tightening',
    name: { en: 'Monetary tightening', hi: 'मौद्रिक सख़्ती' },
    status: 'active',
    statusText: { en: 'Active', hi: 'जारी' },
    since: '2026-10',
    note: {
      en: "Repo at 5.50%, stance 'calibrated tightening'; some banks expect 6% by December.",
      hi: "रेपो 5.50%, रुख़ 'संतुलित सख़्ती'; कुछ बैंकों को दिसंबर तक 6% की उम्मीद।",
    },
    source: CITATIONS.rbi,
  },
]

// ---------------------------------------------------------------------------
// Risk register (analyst assessment)

export type RiskTrend = 'rising' | 'easing' | 'stable' | 'watch'

export interface Risk {
  id: string
  name: Localized
  /** 1 (rare) – 5 (almost certain). */
  likelihood: number
  /** 1 (minor) – 5 (severe). */
  impact: number
  trend: RiskTrend
  why: Localized
  source: SourceRef | null
}

export const RISK_ASSESSED = '2026-10-11'

export const RISKS: Risk[] = [
  {
    id: 'energy',
    name: { en: 'Energy shock via Hormuz', hi: 'होर्मुज के रास्ते ऊर्जा झटका' },
    likelihood: 4,
    impact: 5,
    trend: 'easing',
    why: {
      en: 'About 90% of imported LPG transits Hormuz; supply recovered from mid-2026 lows but stays exposed.',
      hi: 'आयातित एलपीजी का लगभग 90% होर्मुज से गुज़रता है; 2026 के मध्य के निचले स्तर से आपूर्ति सुधरी, पर जोखिम बना हुआ है।',
    },
    source: CITATIONS.lpg,
  },
  {
    id: 'inflation',
    name: { en: 'Inflation and rate tightening', hi: 'महंगाई और ब्याज दरों में सख़्ती' },
    likelihood: 4,
    impact: 3,
    trend: 'rising',
    why: {
      en: 'CPI has risen four months running; wholesale inflation is near 10%; the RBI turned to hikes in October.',
      hi: 'सीपीआई लगातार चार महीने बढ़ी; थोक महंगाई लगभग 10%; आरबीआई ने अक्टूबर में दरें बढ़ानी शुरू कीं।',
    },
    source: CITATIONS.cpi,
  },
  {
    id: 'youth',
    name: { en: 'Youth and jobs discontent', hi: 'युवाओं और रोज़गार को लेकर असंतोष' },
    likelihood: 3,
    impact: 4,
    trend: 'watch',
    why: {
      en: 'Gen Z protests forced a resignation; urban unemployment is still about 6.8%.',
      hi: 'जेन ज़ी प्रदर्शनों के चलते एक इस्तीफ़ा हुआ; शहरी बेरोज़गारी अब भी लगभग 6.8% है।',
    },
    source: CITATIONS.genz,
  },
  {
    id: 'electoral',
    name: { en: 'Electoral-integrity dispute', hi: 'चुनावी निष्पक्षता पर विवाद' },
    likelihood: 4,
    impact: 3,
    trend: 'rising',
    why: {
      en: 'The opposition is pursuing the CEC’s removal over the SIR; trust in the process is a live fault line.',
      hi: 'विपक्ष एसआईआर को लेकर मुख्य चुनाव आयुक्त को हटाने की कोशिश में है; प्रक्रिया पर भरोसा एक सक्रिय दरार है।',
    },
    source: CITATIONS.cec,
  },
  {
    id: 'trade',
    name: { en: 'US trade and tariffs', hi: 'अमेरिकी व्यापार और टैरिफ़' },
    likelihood: 3,
    impact: 3,
    trend: 'stable',
    why: {
      en: 'The deal is unfinished; a 10% US levy applies to roughly 55% of exports to the US.',
      hi: 'समझौता अधूरा है; अमेरिका को होने वाले लगभग 55% निर्यात पर 10% अमेरिकी शुल्क लागू है।',
    },
    source: CITATIONS.tariff,
  },
  {
    id: 'pakistan',
    name: { en: 'India–Pakistan escalation', hi: 'भारत–पाकिस्तान तनाव में बढ़ोतरी' },
    likelihood: 2,
    impact: 5,
    trend: 'watch',
    why: {
      en: 'Infiltration incidents and envoy summons continue after the 2025 conflict.',
      hi: '2025 के संघर्ष के बाद घुसपैठ की घटनाएँ और राजनयिकों को तलब करना जारी है।',
    },
    source: null,
  },
  {
    id: 'federal',
    name: { en: 'Centre–state relations and delimitation', hi: 'केंद्र–राज्य संबंध और परिसीमन' },
    likelihood: 3,
    impact: 3,
    trend: 'rising',
    why: {
      en: 'The caste census and future delimitation worry southern states about representation.',
      hi: 'जाति जनगणना और भविष्य के परिसीमन से दक्षिणी राज्यों में प्रतिनिधित्व को लेकर चिंता है।',
    },
    source: CITATIONS.census,
  },
]
