import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getFinalCategorySlug } from '../../../../lib/categoryClassifier'
// import { createSocialPostForArticle } from '@/lib/socialPostService' // Removed - function no longer exists with new schema

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CRON_SECRET = process.env.CRON_SECRET

console.log('[DEBUG] OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY)

// Helper: Check if request is authorized
function isAuthorized(req: NextRequest, dryRun: boolean) {
  // Allow all dry-run calls (for testing)
  if (dryRun) return true

  // If there is no CRON_SECRET configured, do not restrict access
  if (!CRON_SECRET) return true

  const url = new URL(req.url)
  const header = req.headers.get('authorization')
  const secretParam = url.searchParams.get('secret')

  // 1) Vercel Cron – Authorization: Bearer CRON_SECRET
  if (header === `Bearer ${CRON_SECRET}`) return true

  // 2) Manual browser call – ?secret=CRON_SECRET
  if (secretParam && secretParam === CRON_SECRET) return true

  return false
}

// Helper: Get Supabase client (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

// Helper: Get OpenAI client (lazy initialization)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })
}

interface EventRegistryArticle {
  uri: string
  title: string
  body: string
  source: {
    title: string
    uri: string
  }
  dateTime: string
  url: string
  // some feeds may include an image url under different keys
  image?: string | null
  imageUrl?: string | null
  image_url?: string | null
  // some feeds may include category information
  categories?: Array<{ uri?: string; label?: string; name?: string }>
  categoryUri?: string | string[]
}

interface AIRewriteResult {
  new_title: string
  new_slug: string
  new_content: string
  new_excerpt?: string
  source_name: string
}

// Helper: Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
}

// Helper: Detect category from title and source
function detectCategory(title: string, source: string): string {
  const titleLower = title.toLowerCase()
  const sourceLower = source.toLowerCase()
  const combined = `${titleLower} ${sourceLower}`

  // Sports detection
  const sportsKeywords = [
    'sport', 'nba', 'nfl', 'mlb', 'soccer', 'football',
    'premier league', 'uefa', 'fifa', 'olympic', 'basketball',
    'hockey', 'nhl', 'tennis', 'cricket', 'rugby', 'boxing',
    'ufc', 'mma', 'athletics', 'championship', 'world cup'
  ]
  if (sportsKeywords.some(keyword => combined.includes(keyword))) {
    return 'sports'
  }

  // Games detection
  const gamesKeywords = [
    'game', 'gaming', 'xbox', 'playstation', 'ps5', 'nintendo',
    'steam', 'esports', 'tournament', 'gamer', 'console',
    'pc gaming', 'fortnite', 'minecraft', 'call of duty',
    'league of legends', 'dota', 'valorant', 'twitch'
  ]
  if (gamesKeywords.some(keyword => combined.includes(keyword))) {
    return 'games'
  }

  // Celebrity detection
  const celebrityKeywords = [
    'celebrity', 'actor', 'actress', 'singer', 'musician',
    'hollywood', 'kardashian', 'beyonce', 'taylor swift',
    'kanye', 'entertainment', 'grammy', 'oscar', 'emmy'
  ]
  if (celebrityKeywords.some(keyword => combined.includes(keyword))) {
    return 'celebrity'
  }

  // Politics detection
  const politicsKeywords = [
    'politic', 'president', 'senator', 'congress', 'parliament',
    'minister', 'government', 'election', 'vote', 'democrat',
    'republican', 'biden', 'trump', 'white house', 'capitol'
  ]
  if (politicsKeywords.some(keyword => combined.includes(keyword))) {
    return 'politics'
  }

  // AI News detection
  const aiKeywords = [
    'artificial intelligence', 'machine learning', 'ai', 'chatgpt',
    'openai', 'deepmind', 'neural network', 'deep learning',
    'automation', 'robot', 'autonomous', 'algorithm'
  ]
  if (aiKeywords.some(keyword => combined.includes(keyword))) {
    return 'ai-news'
  }

  // Default fallback
  return 'ai-news'
}

// Prefer deterministic mapping from Event Registry category fields to our known slugs
function getCategorySlugFromArticle(article: EventRegistryArticle | any): 'celebrity' | 'politics' | 'ai-news' | 'sports' | 'games' | 'daily-highlights' {
  try {
    const parts: string[] = []
    const pushStr = (v: any) => { if (typeof v === 'string') { parts.push(v) } }
    const tryArr = (arr: any) => { if (Array.isArray(arr)) { for (const it of arr) { if (typeof it === 'string') pushStr(it); else if (it && typeof it === 'object') { pushStr(it.uri); pushStr(it.label); pushStr(it.name) } } } }

    // Collect possible category indicators from various shapes
    pushStr((article as any)?.categoryUri)
    tryArr((article as any)?.categoryUri)
    tryArr((article as any)?.categories)
    tryArr((article as any)?.data?.categories)

    const hay = parts.join(' | ').toLowerCase()
    if (hay.includes('society/people/celebrity') || hay.includes('celebrity')) return 'celebrity'
    if (hay.includes('society/politics') || hay.includes('politic')) return 'politics'
    if (hay.includes('computers/artificial_intelligence') || hay.includes('artificial intelligence') || hay.includes('artificial_intelligence')) return 'ai-news'
    if (hay.includes('sports')) return 'sports'
    if (hay.includes('games')) return 'games'
    return 'daily-highlights'
  } catch {
    return 'daily-highlights'
  }
}

// Helper: Get or create category ID
async function getCategoryId(categorySlug: string): Promise<number | null> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('category')
    .select('id')
    .eq('slug', categorySlug)
    .single()

  if (error || !data) {
    console.error(`Category "${categorySlug}" not found in database`)
    return null
  }

  return data.id
}

// Helper: Check if article already exists
async function articleExists(slug: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('post')
    .select('slug')
    .eq('slug', slug)
    .single()
  
  return !!data && !error
}

// Helper: Fetch news from Event Registry
async function fetchFromEventRegistry(): Promise<EventRegistryArticle[]> {
  const apiKey = process.env.EVENT_REGISTRY_API_KEY
  
  if (!apiKey) {
    throw new Error('EVENT_REGISTRY_API_KEY is not set')
  }

  // Get articles from last 3 hours (matching cron schedule)
  const now = new Date()
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  
  const dateStart = threeHoursAgo.toISOString().split('T')[0]
  const timeStart = threeHoursAgo.toISOString().split('T')[1].substring(0, 5)

  // Event Registry API endpoint
  const url = 'https://eventregistry.org/api/v1/article/getArticles'
  
  const payload = {
    action: 'getArticles',
    keyword: '',
    articlesPage: 1,
    articlesCount: 60, // Increased from 50 to 60 for 3-hour window
    articlesSortBy: 'date',
    articlesSortByAsc: false,
    articlesArticleBodyLen: -1,
    resultType: 'articles',
    dataType: ['news'],
    apiKey: apiKey,
    forceMaxDataTimeWindow: 31,
    lang: 'eng',
    includeArticleImage: true,
    categoryUri: [
      'dmoz/Society/People/Celebrity',
      'dmoz/Society/Politics',
      'dmoz/Computers/Artificial_Intelligence',
      'dmoz/Sports',
      'dmoz/Games'
    ],
    dateStart: dateStart,
    timeStart: timeStart,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Event Registry API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return data.articles?.results || []
  } catch (error) {
    console.error('Error fetching from Event Registry:', error)
    return []
  }
}

// Ensure the storage bucket for post images exists (best-effort)
async function ensurePostImagesBucket() {
  try {
    const supabase = getSupabaseClient()
    await (supabase as any).storage.createBucket('post-images', { public: true })
  } catch (_e) {
    // ignore if already exists or insufficient permissions
  }
}

async function uploadImageToStorage(fileName: string, data: Uint8Array): Promise<string | null> {
  const supabase = getSupabaseClient()
  await ensurePostImagesBucket()
  const { data: uploadRes, error } = await (supabase as any).storage.from('post-images').upload(`post-images/${fileName}`, data, {
    upsert: true,
    contentType: 'image/png'
  })
  if (error) {
    console.error('[ERROR] Uploading image to storage failed:', error)
    return null
  }
  const { data: publicUrl } = (supabase as any).storage.from('post-images').getPublicUrl(`post-images/${fileName}`)
  return publicUrl?.publicUrl ?? null
}

async function generateImageUrlForArticle(title: string): Promise<string | null> {
  try {
    const openai = getOpenAIClient() as any
    const prompt = `Realistic news photo: ${title}`
    const img = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x576'
    })
    const b64 = img?.data?.[0]?.b64_json
    if (!b64) return null
    const buffer = Buffer.from(b64, 'base64')
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    return await uploadImageToStorage(safeName, buffer)
  } catch (e) {
    console.error('[ERROR] Image generation failed:', e)
    return null
  }
}

async function resolveImageUrl(article: EventRegistryArticle, rewritten: AIRewriteResult): Promise<string | null> {
  const fromSource = (article.image_url || article.imageUrl || article.image || '').trim?.() ?? ''
  if (fromSource) {
    return fromSource
  }
  return await generateImageUrlForArticle(rewritten.new_title || article.title)
}

// Helper: Rewrite article using OpenAI
async function rewriteArticleWithAI(
  title: string,
  body: string,
  sourceName: string
): Promise<AIRewriteResult | null> {
  const prompt = `Rewrite the following news article facts into a new, fully original human-written English news story. 

Follow these rules:

- Write for US/Canada/UK/Australia audience.
- DO NOT copy any phrasing or wording from original text.
- Use short clear sentences.
- Keep journalistic tone.
- Maintain factual accuracy.
- Add natural transitions.
- Include context when appropriate.
- Add 2–3 H2 sub-headings using ## markdown.
- Add a final short 'Summary' paragraph.
- Title MUST be rewritten and SEO-optimized.
- Provide a unique SEO-friendly slug based on the new title.
- DO NOT fabricate facts.
- DO NOT hallucinate names or statistics.
- IMPORTANT: Write a comprehensive article of at least 350–600 words when enough source text exists. Make it detailed and informative.
- Create a short SEO-friendly excerpt (1–2 sentences, max 150 characters) that summarizes the article.
- Final line MUST be exactly:

Source: ${sourceName}

NO LINKS, no HTML except markdown headings, no formatting.

Original Title: ${title}

Original Body: ${body.substring(0, 2000)}

Return ONLY valid JSON with this exact structure:
{
  "new_title": "...",
  "new_slug": "...",
  "new_content": "...",
  "new_excerpt": "...",
  "source_name": "${sourceName}"
}`

  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional news editor who rewrites articles in clear, engaging English. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI')
    }

    const result: AIRewriteResult = JSON.parse(jsonMatch[0])
    
    // Validate response
    if (!result.new_title || !result.new_slug || !result.new_content) {
      throw new Error('Incomplete AI response')
    }

    return result
  } catch (error) {
    // Re-throw error so it can be caught and logged in the main loop
    throw error
  }
}

// Helper: Insert article into Supabase
async function insertArticle(
  article: AIRewriteResult, 
  categoryId: number | null,
  imageUrl?: string | null
): Promise<{ success: true; id: number } | { success: false; reason: 'slug_exists' | 'insert_failed' }> {
  try {
    // Check if slug already exists
    const exists = await articleExists(article.new_slug)
    if (exists) {
      console.log(`[DEBUG] SKIP: slug already exists:`, article.new_slug)
      return { success: false, reason: 'slug_exists' }
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('post').insert([
      {
        title: article.new_title,
        slug: article.new_slug,
        body: article.new_content,
        excerpt: article.new_excerpt || null,
        source_name: article.source_name,
        source_url: '',
        category_id: categoryId,
        created_at: new Date().toISOString(),
        image_url: imageUrl ?? null,
      },
    ]).select('id').single()

    if (error) {
      console.error('[ERROR] Supabase insert error:', error)
      return { success: false, reason: 'insert_failed' }
    }

    if (!data || !data.id) {
      console.error('[ERROR] Supabase insert returned no ID')
      return { success: false, reason: 'insert_failed' }
    }

    return { success: true, id: data.id }
  } catch (error) {
    console.error('[ERROR] Exception in insertArticle:', error)
    return { success: false, reason: 'insert_failed' }
  }
}

// Main handler
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for testing
    const url = new URL(request.url)
    const isDryRun = url.searchParams.get('dry') === '1'
    const limitParam = url.searchParams.get('limit')
    const processLimit = limitParam ? parseInt(limitParam, 10) : 20

    // Check authorization
    if (!isAuthorized(request, isDryRun)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check for OpenAI API key before processing
    if (!process.env.OPENAI_API_KEY) {
      console.error('[ERROR] Missing OPENAI_API_KEY in environment')
      return NextResponse.json(
        { success: false, message: 'Missing OPENAI_API_KEY on server' },
        { status: 500 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'

    console.log('Starting news fetch and rewrite process...')
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no DB writes)' : 'LIVE'}`)
    console.log(`Process limit: ${processLimit}`)

    // Step 1: Fetch articles from Event Registry
    const articles = await fetchFromEventRegistry()
    console.log('[DEBUG] fetchedArticles count:', articles.length)

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new articles found',
        processed: 0,
      })
    }

    // Step 2: Process each article
    const articlesToProcess = articles.slice(0, processLimit)
    console.log('[DEBUG] articlesToProcess count:', articlesToProcess.length)

    let attempted = 0
    let inserted = 0
    let lastAiError: string | null = null
    const categoryStats: Record<string, number> = {}
    const dryRunResults: any[] = []
    const skipStats = {
      missing_category: 0,
      slug_exists: 0,
      rewrite_failed: 0,
      insert_failed: 0,
      other: 0
    }

    for (const article of articlesToProcess) {
      try {
        const sourceName = article.source?.title || 'Unknown Source'

        // Log before calling OpenAI
        console.log('[DEBUG] REWRITE START:', article.title)

        // Rewrite article with AI
        let rewritten: AIRewriteResult | null = null
        try {
          rewritten = await rewriteArticleWithAI(
            article.title,
            article.body,
            sourceName
          )
        } catch (err) {
          console.error('[AI ERROR] rewrite failed:', err)

          let errMsg = 'unknown_error'
          if (err instanceof Error && err.message) {
            errMsg = err.message
          } else if (typeof err === 'object') {
            try {
              errMsg = JSON.stringify(err)
            } catch (_) {
              errMsg = String(err)
            }
          } else {
            errMsg = String(err)
          }

          lastAiError = errMsg
          skipStats.rewrite_failed++
          console.log('[DEBUG] SKIP: rewrite failed for article:', article.title, 'error:', errMsg)
          continue
        }

        if (!rewritten) {
          console.log(`[DEBUG] SKIP: rewrite failed for article:`, article.title)
          skipStats.rewrite_failed++
          continue
        }

        // Increment attempted counter after successful OpenAI response
        attempted++

        // Determine final category via deterministic ER + keyword fallback
        let categorySlug = getFinalCategorySlug(
          article,
          typeof rewritten.new_title === 'string' ? rewritten.new_title : '',
          typeof rewritten.new_content === 'string' ? rewritten.new_content : '',
          sourceName
        )
        // Track stats
        categoryStats[categorySlug] = (categoryStats[categorySlug] || 0) + 1

        // Resolve category id with fallback to daily-highlights if missing
        let categoryId = await getCategoryId(categorySlug)
        if (!categoryId) {
          console.warn('[CATEGORY DEBUG] fallback to daily-highlights for:', {
            title: rewritten.new_title,
            chosen: categorySlug
          })
          categorySlug = 'daily-highlights'
          categoryId = await getCategoryId('daily-highlights')
        }
        if (!categoryId) {
          console.error('[ERROR] No valid category_id (even after fallback). Skipping:', rewritten.new_title)
          skipStats.missing_category++
          continue
        }

        // Resolve image URL (prefer source image, else generate via AI)
        let imageUrl: string | null = null
        try {
          imageUrl = await resolveImageUrl(article, rewritten)
        } catch (e) {
          console.error('[ERROR] resolveImageUrl failed:', e)
        }

        if (isDryRun) {
          // Dry run mode: just log what would be inserted
          dryRunResults.push({
            title: rewritten.new_title,
            slug: rewritten.new_slug,
            category: categorySlug,
            category_id: categoryId,
            source_name: sourceName,
            image_url: imageUrl ?? null,
            content_preview: rewritten.new_content.substring(0, 100) + '...'
          })
          console.log(`[DRY RUN] Would insert: ${rewritten.new_title} (${categorySlug})`)
          inserted++
        } else {
          // Live mode: insert into database
          const insertResult = await insertArticle(rewritten, categoryId, imageUrl)
          if (insertResult.success) {
            inserted++
            console.log('[DEBUG] INSERT OK:', rewritten.new_slug, 'ID:', insertResult.id)

            // TODO: Create social post using new schema (social_posts table)
            // The old createSocialPostForArticle function no longer exists.
            // Social posts should be created manually in admin panel for now.
            try {
              // Placeholder for future social post creation with new schema
              console.log('[SOCIAL] Social post creation temporarily disabled for article:', rewritten.new_slug)
            } catch (err) {
              // Don't block ingestion if social post creation fails
              console.error('[SOCIAL] Error (social post creation disabled):', {
                slug: rewritten.new_slug,
                error: err instanceof Error ? err.message : String(err),
              })
            }
          } else if (insertResult.reason === 'slug_exists') {
            skipStats.slug_exists++
          } else {
            console.error('[ERROR] Supabase insert failed for slug:', rewritten.new_slug)
            skipStats.insert_failed++
          }
        }

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`[ERROR] Exception processing article "${article.title}":`, error)
        skipStats.other++
      }
    }

    const response: any = {
      success: true,
      message: isDryRun ? 'Dry run completed - no data written' : 'News fetch and rewrite completed',
      dry_run: isDryRun,
      processed: attempted,
      inserted: inserted,
      total_fetched: articles.length,
      category_stats: categoryStats,
      skip_stats: skipStats,
      last_ai_error: lastAiError
    }

    if (attempted === 0 && articlesToProcess.length > 0) {
      response.reason = 'no_eligible_articles'
    }

    if (isDryRun && dryRunResults.length > 0) {
      response.preview = dryRunResults.slice(0, 5)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in fetch-news route:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

