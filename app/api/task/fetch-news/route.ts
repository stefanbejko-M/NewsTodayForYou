import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

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
}

interface AIRewriteResult {
  new_title: string
  new_slug: string
  new_content: string
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

  // Get articles from last 1 hour
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  const dateStart = oneHourAgo.toISOString().split('T')[0]
  const timeStart = oneHourAgo.toISOString().split('T')[1].substring(0, 5)

  // Event Registry API endpoint
  const url = 'https://eventregistry.org/api/v1/article/getArticles'
  
  const payload = {
    action: 'getArticles',
    keyword: '',
    articlesPage: 1,
    articlesCount: 50,
    articlesSortBy: 'date',
    articlesSortByAsc: false,
    articlesArticleBodyLen: -1,
    resultType: 'articles',
    dataType: ['news'],
    apiKey: apiKey,
    forceMaxDataTimeWindow: 31,
    lang: 'eng',
    categoryUri: [
      'dmoz/Society/People/Celebrity',
      'dmoz/Society/Politics',
      'dmoz/Computers/Artificial_Intelligence'
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
- Keep article length between 180–350 words.
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
      max_tokens: 1500,
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
    console.error('Error rewriting with AI:', error)
    return null
  }
}

// Helper: Insert article into Supabase
async function insertArticle(article: AIRewriteResult): Promise<boolean> {
  try {
    // Check if slug already exists
    const exists = await articleExists(article.new_slug)
    if (exists) {
      console.log(`Article with slug "${article.new_slug}" already exists. Skipping.`)
      return false
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.from('post').insert([
      {
        title: article.new_title,
        slug: article.new_slug,
        body: article.new_content,
        source_name: article.source_name,
        source_url: '',
        created_at: new Date().toISOString(),
      },
    ])

    if (error) {
      console.error('Error inserting article:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in insertArticle:', error)
    return false
  }
}

// Main handler
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting news fetch and rewrite process...')

    // Step 1: Fetch articles from Event Registry
    const articles = await fetchFromEventRegistry()
    console.log(`Fetched ${articles.length} articles from Event Registry`)

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new articles found',
        processed: 0,
      })
    }

    // Step 2: Process each article
    let processedCount = 0
    let insertedCount = 0

    for (const article of articles.slice(0, 20)) {
      try {
        const sourceName = article.source?.title || 'Unknown Source'
        
        // Rewrite article with AI
        console.log(`Rewriting: ${article.title}`)
        const rewritten = await rewriteArticleWithAI(
          article.title,
          article.body,
          sourceName
        )

        if (!rewritten) {
          console.log(`Failed to rewrite article: ${article.title}`)
          continue
        }

        // Insert into database
        const inserted = await insertArticle(rewritten)
        if (inserted) {
          insertedCount++
          console.log(`Inserted: ${rewritten.new_title}`)
        }

        processedCount++

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error processing article "${article.title}":`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'News fetch and rewrite completed',
      processed: processedCount,
      inserted: insertedCount,
      total_fetched: articles.length,
    })
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

