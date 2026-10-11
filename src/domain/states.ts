import type { Localized } from './types'

export interface StateDef {
  code: string
  name: Localized
  /** Tile-grid position (column, row). A cartogram: no borders are drawn, so no boundary depiction is implied. */
  col: number
  row: number
  /** Extra English names/cities that unambiguously imply the state. */
  en: string[]
  /** Extra Hindi names/cities. */
  hi: string[]
}

export const STATES: StateDef[] = [
  { code: 'LA', name: { en: 'Ladakh', hi: 'लद्दाख' }, col: 2, row: 0, en: ['Ladakh', 'Leh', 'Kargil'], hi: ['लद्दाख', 'लेह', 'कारगिल'] },
  { code: 'JK', name: { en: 'Jammu & Kashmir', hi: 'जम्मू-कश्मीर' }, col: 3, row: 0, en: ['Jammu', 'Kashmir', 'Srinagar', 'Pahalgam'], hi: ['जम्मू', 'कश्मीर', 'श्रीनगर', 'पहलगाम'] },
  { code: 'CH', name: { en: 'Chandigarh', hi: 'चंडीगढ़' }, col: 1, row: 1, en: ['Chandigarh'], hi: ['चंडीगढ़'] },
  { code: 'PB', name: { en: 'Punjab', hi: 'पंजाब' }, col: 2, row: 1, en: ['Punjab', 'Amritsar', 'Ludhiana', 'Tarn Taran'], hi: ['पंजाब', 'अमृतसर', 'लुधियाना', 'तरनतारन'] },
  { code: 'HP', name: { en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश' }, col: 3, row: 1, en: ['Himachal', 'Shimla', 'Manali'], hi: ['हिमाचल', 'शिमला', 'मनाली'] },
  { code: 'UK', name: { en: 'Uttarakhand', hi: 'उत्तराखंड' }, col: 4, row: 1, en: ['Uttarakhand', 'Dehradun', 'Uttarkashi', 'Chamoli', 'Haridwar'], hi: ['उत्तराखंड', 'देहरादून', 'उत्तरकाशी', 'चमोली', 'हरिद्वार'] },
  { code: 'SK', name: { en: 'Sikkim', hi: 'सिक्किम' }, col: 6, row: 1, en: ['Sikkim', 'Gangtok'], hi: ['सिक्किम', 'गंगटोक'] },
  { code: 'AR', name: { en: 'Arunachal Pradesh', hi: 'अरुणाचल प्रदेश' }, col: 8, row: 1, en: ['Arunachal', 'Itanagar'], hi: ['अरुणाचल', 'ईटानगर'] },
  { code: 'RJ', name: { en: 'Rajasthan', hi: 'राजस्थान' }, col: 1, row: 2, en: ['Rajasthan', 'Jaipur', 'Jodhpur', 'Udaipur', 'Bikaner', 'Ganganagar'], hi: ['राजस्थान', 'जयपुर', 'जोधपुर', 'उदयपुर', 'बीकानेर'] },
  { code: 'HR', name: { en: 'Haryana', hi: 'हरियाणा' }, col: 2, row: 2, en: ['Haryana', 'Gurugram', 'Gurgaon', 'Faridabad', 'Rohtak'], hi: ['हरियाणा', 'गुरुग्राम', 'फरीदाबाद', 'रोहतक'] },
  { code: 'DL', name: { en: 'Delhi', hi: 'दिल्ली' }, col: 3, row: 2, en: ['Delhi', 'New Delhi', 'Jantar Mantar'], hi: ['दिल्ली', 'जंतर-मंतर', 'जंतर मंतर'] },
  { code: 'UP', name: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' }, col: 4, row: 2, en: ['Uttar Pradesh', 'Lucknow', 'Varanasi', 'Noida', 'Kanpur', 'Raebareli', 'Rae Bareli', 'Ayodhya'], hi: ['उत्तर प्रदेश', 'लखनऊ', 'वाराणसी', 'नोएडा', 'कानपुर', 'रायबरेली', 'अयोध्या'] },
  { code: 'BR', name: { en: 'Bihar', hi: 'बिहार' }, col: 5, row: 2, en: ['Bihar', 'Patna'], hi: ['बिहार', 'पटना'] },
  { code: 'AS', name: { en: 'Assam', hi: 'असम' }, col: 7, row: 2, en: ['Assam', 'Guwahati', 'Dibrugarh'], hi: ['असम', 'गुवाहाटी'] },
  { code: 'NL', name: { en: 'Nagaland', hi: 'नागालैंड' }, col: 8, row: 2, en: ['Nagaland', 'Kohima'], hi: ['नागालैंड', 'कोहिमा'] },
  { code: 'GJ', name: { en: 'Gujarat', hi: 'गुजरात' }, col: 0, row: 3, en: ['Gujarat', 'Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar'], hi: ['गुजरात', 'अहमदाबाद', 'सूरत', 'वडोदरा', 'गांधीनगर'] },
  { code: 'MP', name: { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश' }, col: 2, row: 3, en: ['Madhya Pradesh', 'Bhopal', 'Indore'], hi: ['मध्य प्रदेश', 'भोपाल', 'इंदौर'] },
  { code: 'CG', name: { en: 'Chhattisgarh', hi: 'छत्तीसगढ़' }, col: 3, row: 3, en: ['Chhattisgarh', 'Raipur', 'Bastar'], hi: ['छत्तीसगढ़', 'रायपुर', 'बस्तर'] },
  { code: 'JH', name: { en: 'Jharkhand', hi: 'झारखंड' }, col: 5, row: 3, en: ['Jharkhand', 'Ranchi', 'Deoghar', 'Jamshedpur'], hi: ['झारखंड', 'रांची', 'देवघर', 'जमशेदपुर'] },
  { code: 'WB', name: { en: 'West Bengal', hi: 'पश्चिम बंगाल' }, col: 6, row: 3, en: ['West Bengal', 'Bengal', 'Kolkata', 'Mamata'], hi: ['पश्चिम बंगाल', 'बंगाल', 'कोलकाता'] },
  { code: 'ML', name: { en: 'Meghalaya', hi: 'मेघालय' }, col: 7, row: 3, en: ['Meghalaya', 'Shillong'], hi: ['मेघालय', 'शिलांग'] },
  { code: 'MN', name: { en: 'Manipur', hi: 'मणिपुर' }, col: 8, row: 3, en: ['Manipur', 'Imphal'], hi: ['मणिपुर', 'इंफाल'] },
  { code: 'DN', name: { en: 'Dadra, Daman & Diu', hi: 'दादरा-दमन-दीव' }, col: 0, row: 4, en: ['Daman', 'Dadra', 'Silvassa'], hi: ['दमन', 'दादरा', 'सिलवासा'] },
  { code: 'MH', name: { en: 'Maharashtra', hi: 'महाराष्ट्र' }, col: 2, row: 4, en: ['Maharashtra', 'Mumbai', 'Pune', 'Nagpur', 'Thane'], hi: ['महाराष्ट्र', 'मुंबई', 'पुणे', 'नागपुर'] },
  { code: 'TG', name: { en: 'Telangana', hi: 'तेलंगाना' }, col: 3, row: 4, en: ['Telangana', 'Hyderabad'], hi: ['तेलंगाना', 'हैदराबाद'] },
  { code: 'OD', name: { en: 'Odisha', hi: 'ओडिशा' }, col: 5, row: 4, en: ['Odisha', 'Bhubaneswar', 'Cuttack', 'Puri'], hi: ['ओडिशा', 'भुवनेश्वर', 'कटक'] },
  { code: 'TR', name: { en: 'Tripura', hi: 'त्रिपुरा' }, col: 7, row: 4, en: ['Tripura', 'Agartala'], hi: ['त्रिपुरा', 'अगरतला'] },
  { code: 'MZ', name: { en: 'Mizoram', hi: 'मिजोरम' }, col: 8, row: 4, en: ['Mizoram', 'Aizawl'], hi: ['मिजोरम', 'आइजोल'] },
  { code: 'GA', name: { en: 'Goa', hi: 'गोवा' }, col: 1, row: 5, en: ['Goa', 'Panaji'], hi: ['गोवा', 'पणजी'] },
  { code: 'KA', name: { en: 'Karnataka', hi: 'कर्नाटक' }, col: 2, row: 5, en: ['Karnataka', 'Bengaluru', 'Bangalore', 'Mysuru', 'Mangaluru'], hi: ['कर्नाटक', 'बेंगलुरु', 'बेंगलूरु', 'मैसूर'] },
  { code: 'AP', name: { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश' }, col: 3, row: 5, en: ['Andhra Pradesh', 'Andhra', 'Amaravati', 'Visakhapatnam', 'Vijayawada'], hi: ['आंध्र प्रदेश', 'आंध्र', 'अमरावती', 'विशाखापत्तनम'] },
  { code: 'LD', name: { en: 'Lakshadweep', hi: 'लक्षद्वीप' }, col: 1, row: 6, en: ['Lakshadweep'], hi: ['लक्षद्वीप'] },
  { code: 'KL', name: { en: 'Kerala', hi: 'केरल' }, col: 2, row: 6, en: ['Kerala', 'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Pathanamthitta'], hi: ['केरल', 'तिरुवनंतपुरम', 'कोच्चि'] },
  { code: 'TN', name: { en: 'Tamil Nadu', hi: 'तमिलनाडु' }, col: 3, row: 6, en: ['Tamil Nadu', 'Chennai', 'Coimbatore', 'Madurai', 'Nilgiris', 'Tirunelveli', 'Kanniyakumari'], hi: ['तमिलनाडु', 'चेन्नई', 'कोयंबटूर', 'मदुरै'] },
  { code: 'PY', name: { en: 'Puducherry', hi: 'पुडुचेरी' }, col: 4, row: 6, en: ['Puducherry', 'Pondicherry'], hi: ['पुडुचेरी', 'पांडिचेरी'] },
  { code: 'AN', name: { en: 'Andaman & Nicobar', hi: 'अंडमान-निकोबार' }, col: 7, row: 6, en: ['Andaman', 'Nicobar', 'Port Blair'], hi: ['अंडमान', 'निकोबार', 'पोर्ट ब्लेयर'] },
]

export const GRID_COLS = 9
export const GRID_ROWS = 7

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function compile(): { code: string; re: RegExp }[] {
  return STATES.map((state) => {
    const en = state.en.map((n) => `(?<![\\p{L}])${escape(n)}(?![\\p{L}])`)
    // Devanagari has no \b: require that the name is not preceded by a Devanagari letter, so
    // "देश" style traps can't occur, and allow suffixes (दिल्ली में, पंजाब के).
    const hi = state.hi.map((n) => `(?<![\\u0900-\\u097F])${escape(n)}`)
    return { code: state.code, re: new RegExp([...en, ...hi].join('|'), 'iu') }
  })
}

const MATCHERS = compile()

/** Which states/UTs a text mentions, by name or well-known city. Deterministic; no inference beyond the words. */
export function tagStates(...texts: (string | null | undefined)[]): string[] {
  const text = texts.filter(Boolean).join(' · ')
  if (!text) return []
  return MATCHERS.filter((m) => m.re.test(text)).map((m) => m.code)
}

export const STATE_BY_CODE = new Map(STATES.map((s) => [s.code, s]))
