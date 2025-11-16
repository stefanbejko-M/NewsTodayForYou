export type FinalCategorySlug =
  | 'celebrity'
  | 'politics'
  | 'ai-news'
  | 'sports'
  | 'games'
  | 'daily-highlights'

function collectCategoryStrings(article: any): string[] {
  const out: string[] = []
  const pushStr = (v: any) => {
    if (typeof v === 'string') out.push(v)
  }
  const pullFromArray = (arr: any) => {
    if (!Array.isArray(arr)) return
    for (const it of arr) {
      if (typeof it === 'string') {
        out.push(it)
      } else if (it && typeof it === 'object') {
        if (typeof it.uri === 'string') out.push(it.uri)
        if (typeof it.label === 'string') out.push(it.label)
        if (typeof it.name === 'string') out.push(it.name)
      }
    }
  }

  if (!article) return out
  pushStr((article as any)?.categoryUri)
  pullFromArray((article as any)?.categoryUri)
  pullFromArray((article as any)?.categories)
  pullFromArray((article as any)?.data?.categories)
  return out.map(s => String(s).toLowerCase())
}

const dmozMap: Array<{ needles: string[]; slug: FinalCategorySlug }> = [
  { needles: ['dmoz/society/people/celebrity', 'celebrity'], slug: 'celebrity' },
  { needles: ['dmoz/society/politics', 'politic', 'election', 'parliament', 'government', 'senate', 'president', 'prime minister'], slug: 'politics' },
  { needles: ['dmoz/computers/artificial_intelligence', 'artificial intelligence', 'ai', 'machine learning', 'chatgpt', 'openai', 'neural network'], slug: 'ai-news' },
  { needles: ['dmoz/sports', 'sport', 'football', 'soccer', 'basketball', 'tennis', 'cricket', 'match', 'tournament', 'league', 'world cup'], slug: 'sports' },
  { needles: ['dmoz/games', 'video game', 'playstation', 'xbox', 'nintendo', 'esports', 'steam'], slug: 'games' },
]

const kwSports = ['sport','football','soccer','basketball','tennis','cricket','match','tournament','league','cup','world cup','goal','score','win','loss','victory','defeat','coach','team']
const kwPolitics = ['president','prime minister','election','campaign','parliament','senate','congress','government','policy','law','vote']
const kwAI = ['artificial intelligence','ai-powered','machine learning','neural network','chatgpt','gpt','large language model','llm','openai','deepmind','algorithm']
const kwCeleb = ['actor','actress','singer','rapper','hollywood','bollywood','pop star','movie star','tv star','celebrity','influencer']
const kwGames = ['video game','playstation','xbox','nintendo','esports','pc game','steam','battle royale','fortnite','minecraft','call of duty','valorant']

/**
 * getFinalCategorySlug
 * Deterministically map Event Registry categories first, then strong keyword fallback on text, else default.
 */
export function getFinalCategorySlug(
  article: any,
  rewrittenTitle: string,
  rewrittenBody: string,
  sourceName: string | null
): FinalCategorySlug {
  // Step 1: collect ER category strings
  const catStrings = collectCategoryStrings(article)

  // Step 2: deterministic mapping by category URIs/labels
  const hay = catStrings.join(' | ')
  for (const rule of dmozMap) {
    if (rule.needles.some(n => hay.includes(n))) {
      return rule.slug
    }
  }

  // Step 3: strong keyword fallback on rewritten title/body + source
  const text = `${rewrittenTitle || ''} ${rewrittenBody || ''} ${(sourceName || '')}`.toLowerCase()
  if (kwSports.some(k => text.includes(k))) return 'sports'
  if (kwPolitics.some(k => text.includes(k))) return 'politics'
  if (kwAI.some(k => text.includes(k))) return 'ai-news'
  if (kwCeleb.some(k => text.includes(k))) return 'celebrity'
  if (kwGames.some(k => text.includes(k))) return 'games'

  // Step 4: default
  return 'daily-highlights'
}


