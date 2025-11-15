import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'

// Load environment variables from .env.local and .env
const localResult = dotenv.config({ path: '.env.local' })
const envResult = dotenv.config({ path: '.env' })

if (localResult.error && envResult.error) {
  console.log('Note: .env.local and .env files not found, using system environment variables')
} else if (localResult.parsed || envResult.parsed) {
  console.log('✓ Environment variables loaded from .env files')
}

// Category slug to ID mapping
const CATEGORY_IDS: Record<string, number> = {
  'celebrity': 1,
  'politics': 2,
  'ai-news': 3,
  'daily-highlights': 4,
  'sports': 5,
  'games': 6
}

// Valid category IDs
const VALID_CATEGORY_IDS = [1, 2, 3, 4, 5, 6]

interface Post {
  id: number
  title: string | null
  slug: string | null
  body: string | null
  source_name: string | null
  category_id: number | null
}

/**
 * Classify a post using OpenAI
 */
async function classifyPost(
  openai: OpenAI,
  title: string | null,
  slug: string | null,
  sourceName: string | null,
  body: string | null
): Promise<string> {
  const titleText = title || 'Untitled'
  const slugText = slug || ''
  const sourceText = sourceName || 'Unknown Source'
  const bodyText = body ? body.substring(0, 400) : ''

  const prompt = `Classify the following news article into ONE of these categories:
- celebrity
- politics
- ai-news
- daily-highlights
- sports
- games

If the category is unclear, use "daily-highlights".

Return ONLY the category slug (e.g., "politics" or "sports"), nothing else.

Title: ${titleText}
Source: ${sourceText}
Body: ${bodyText}

Category:`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a news classification assistant. Return only the category slug.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    })

    const categorySlug = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'daily-highlights'
    
    // Validate the category slug
    if (categorySlug in CATEGORY_IDS) {
      return categorySlug
    }
    
    // If invalid, default to daily-highlights
    console.warn(`Invalid category "${categorySlug}" returned, defaulting to "daily-highlights"`)
    return 'daily-highlights'
  } catch (error) {
    console.error('Error classifying post:', error)
    // Default to daily-highlights on error
    return 'daily-highlights'
  }
}

/**
 * Main function to categorize posts
 */
async function main() {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    const missingVars: string[] = []
    if (!supabaseUrl) {
      missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    }
    if (!supabaseKey) {
      missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    }
    if (!openaiKey) {
      missingVars.push('OPENAI_API_KEY')
    }

    if (missingVars.length > 0) {
      console.error('\n❌ Missing required environment variables:')
      missingVars.forEach(v => console.error(`   - ${v}`))
      console.error('\nPlease ensure these variables are set in .env.local or .env file')
      console.error('or as system environment variables.\n')
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`)
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl!, supabaseKey!)
    const openai = new OpenAI({ apiKey: openaiKey! })

    console.log('Fetching posts with invalid or missing category_id...')

    // Fetch all posts
    const { data: posts, error: fetchError } = await supabase
      .from('post')
      .select('id, title, slug, body, source_name, category_id')

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`)
    }

    if (!posts || posts.length === 0) {
      console.log('No posts found in database')
      return
    }

    console.log(`Found ${posts.length} total posts`)

    // Filter posts that need categorization
    const postsToCategorize = posts.filter((post: Post) => {
      const categoryId = post.category_id
      // Filter out posts with valid category_id (1-6)
      if (categoryId && VALID_CATEGORY_IDS.includes(categoryId)) {
        return false
      }
      // Include posts with null, undefined, 0, or invalid category_id
      return true
    }) as Post[]

    console.log(`Found ${postsToCategorize.length} posts that need categorization`)

    if (postsToCategorize.length === 0) {
      console.log('All posts already have valid categories')
      return
    }

    // Process each post
    let successCount = 0
    let errorCount = 0

    for (const post of postsToCategorize) {
      try {
        if (!post.id) {
          console.warn('Skipping post without ID')
          continue
        }

        console.log(`\nProcessing post ${post.id}: "${post.title || 'Untitled'}"`)

        // Classify the post
        const categorySlug = await classifyPost(
          openai,
          post.title,
          post.slug,
          post.source_name,
          post.body
        )

        const categoryId = CATEGORY_IDS[categorySlug]

        if (!categoryId) {
          console.error(`Invalid category slug "${categorySlug}" for post ${post.id}`)
          errorCount++
          continue
        }

        // Update the post in Supabase
        const { error: updateError } = await supabase
          .from('post')
          .update({ category_id: categoryId })
          .eq('id', post.id)

        if (updateError) {
          console.error(`Failed to update post ${post.id}:`, updateError.message)
          errorCount++
          continue
        }

        console.log(`Post ${post.id} classified as ${categorySlug} (id=${categoryId})`)
        successCount++

        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error)
        errorCount++
      }
    }

    console.log(`\n=== Summary ===`)
    console.log(`Successfully categorized: ${successCount}`)
    console.log(`Errors: ${errorCount}`)
    console.log(`Total processed: ${postsToCategorize.length}`)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => {
    console.log('\nScript completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

