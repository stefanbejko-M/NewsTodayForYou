import OpenAI from 'openai'

export const FINAL_CATEGORY_SLUGS = [
  'sports',
  'politics',
  'ai-news',
  'celebrity',
  'games',
  'daily-highlights',
] as const

export type FinalCategorySlug = (typeof FINAL_CATEGORY_SLUGS)[number]

// Legacy type alias for backward compatibility
export type FinalCategorySlugLegacy = FinalCategorySlug

/**
 * Get OpenAI client (reused from socialPostGenerator pattern)
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })
}

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

/**
 * categorizePostWithAI - AI-first category classifier using OpenAI
 * Returns null if AI fails, so caller can fall back to keyword rules
 */
export async function categorizePostWithAI(post: {
  title: string
  excerpt?: string | null
  body?: string | null
  source_name?: string | null
}): Promise<FinalCategorySlug | null> {
  const text = [
    `Title: ${post.title}`,
    post.excerpt ? `Excerpt: ${post.excerpt}` : '',
    post.body ? `Body: ${post.body.substring(0, 1000)}` : '', // Limit body to avoid token limits
    post.source_name ? `Source: ${post.source_name}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const systemPrompt = `
You are a news editor for an English-language news site (target audience: US, Canada, UK, Australia).
Your job is to assign EXACTLY ONE category slug to each article.

Allowed category slugs and their meanings:
- sports: sports news, matches, tournaments, players, teams, transfers, results (NBA, NFL, football, golf, tennis, F1, etc.)
- politics: geopolitics, government, elections, laws, diplomacy, wars, conflicts, international relations
- ai-news: artificial intelligence, machine learning, big tech AI news, ChatGPT, OpenAI, Google, etc.
- celebrity: celebrities, entertainment, movies, music, influencers, royal family, lifestyle gossip
- games: video games, esports, game releases, gaming industry, consoles, PC gaming
- daily-highlights: daily briefings, general world news, everything else that does not clearly fit above

Rules:
- ALWAYS respond with only one of these exact slugs: sports, politics, ai-news, celebrity, games, daily-highlights.
- Do not output anything else.
`

  const userPrompt = `
Decide the BEST category slug for this article:

${text}

Answer with only one slug from:
sports, politics, ai-news, celebrity, games, daily-highlights
`

  try {
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: userPrompt.trim() },
      ],
      max_tokens: 10,
      temperature: 0,
    })

    const raw = response.choices[0]?.message?.content?.trim().toLowerCase()
    const match = FINAL_CATEGORY_SLUGS.find((slug) => raw?.includes(slug))
    return match ?? null
  } catch (err) {
    console.error('[CATEGORY AI] categorizePostWithAI error:', err)
    return null
  }
}

/**
 * categorizePostFallback - Keyword-based category classifier (synchronous fallback)
 * This is used when AI classification fails or is unavailable
 */
export function categorizePostFallback(post: {
  title: string
  excerpt?: string | null
  source_name?: string | null
  body?: string | null
}): FinalCategorySlug {
  const text = `${post.title || ''} ${post.excerpt || ''} ${post.body || ''} ${post.source_name || ''}`.toLowerCase()

  // Sports keywords - must be strong matches
  if (
    /\b(football|soccer|basketball|nba|nfl|mlb|golf|tennis|cricket|f1|formula 1|grand prix|world cup|championship|tournament|match|game|score|goal|win|loss|victory|defeat|coach|team|player|athlete|sport)\b/i.test(text)
  ) {
    return 'sports'
  }

  // Politics / government / elections
  if (
    /\b(president|prime minister|election|parliament|government|politics?|policy|diplomatic|ceasefire|war|conflict|senate|congress|vote|campaign|law|legislation)\b/i.test(text)
  ) {
    return 'politics'
  }

  // AI / tech news
  if (
    /\b(ai\b|artificial intelligence|machine learning|chatgpt|openai|neural network|tech|technology|robot|algorithm|llm|large language model|gpt)\b/i.test(text)
  ) {
    return 'ai-news'
  }

  // Celebrity / entertainment
  if (
    /\b(celebrity|actor|actress|singer|movie|film|hollywood|bollywood|pop star|royal family|entertainment|star)\b/i.test(text)
  ) {
    return 'celebrity'
  }

  // Games (video games, esports)
  if (
    /\b(video game|gaming|esports?|playstation|xbox|nintendo|pc game|game release|steam|fortnite|minecraft|call of duty)\b/i.test(text)
  ) {
    return 'games'
  }

  // Daily Highlights – things like "Top stories", "Daily recap"
  if (
    /\b(daily|today|highlights|roundup|top stories|briefing|recap)\b/i.test(text)
  ) {
    return 'daily-highlights'
  }

  // Default fallback – general/daily highlights
  // Note: 'world' category doesn't exist in DB, so we use 'daily-highlights' as fallback
  return 'daily-highlights'
}

/**
 * getFinalCategorySlugForPost - AI-first category classifier with keyword fallback
 * This is the main function to use for categorizing posts (both new and existing)
 */
export async function getFinalCategorySlugForPost(post: {
  title: string
  excerpt?: string | null
  body?: string | null
  source_name?: string | null
}): Promise<FinalCategorySlug> {
  // 1) Try AI first
  const aiCategory = await categorizePostWithAI(post)
  if (aiCategory) {
    console.log(`[CATEGORY AI] AI classified as: ${aiCategory}`)
    return aiCategory
  }

  // 2) Fallback to keyword rules
  console.log('[CATEGORY AI] AI failed, using keyword fallback')
  return categorizePostFallback(post)
}

/**
 * categorizePost - Legacy function name, now just calls the fallback
 * Kept for backward compatibility
 */
export function categorizePost(post: {
  title: string
  excerpt?: string | null
  source_name?: string | null
  body?: string | null
}): FinalCategorySlug {
  return categorizePostFallback(post)
}


