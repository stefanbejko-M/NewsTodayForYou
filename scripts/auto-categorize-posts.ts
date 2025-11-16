import { createClient } from '@supabase/supabase-js'
import { getFinalCategorySlug } from '../lib/categoryClassifier'
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
const VALID_TYPES = [1, 2, 3, 4, 5, 6]

interface Post {
  id: number
  title: string | null
  slug: string | null
  body: string | null
  source_name: string | null
  category_id: number | null
}

/**
 * Classify a post using shared deterministic + keyword-based logic
 */
async function classifyPost(
  title: string | null,
  slug: string | null,
  sourceName: string | null,
  body: string | null
): Promise<string> {
  const titleText = title || 'Unknown'
  const bodyText = body || ''
  const sourceText = sourceName || null
  const slugResolved = getFinalCategorySlug({}, titleText, bodyText, sourceText)
  return (slugResolved in CATEGORY_IDS) ? slugResolved : 'daily-highlights'
}

/**
 * Main function to categorize posts
 */
async function main() {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const missingVars: string[] = []
    if (!supabaseUrl) {
      missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    }
    if (!supabaseKey) {
      missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
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

    console.log('Fetching all posts for re-classification...')

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

    // Re-classify ALL posts using shared logic
    const postsToCategorize = posts as Post[]
    console.log(`Will re-classify ${postsToCategorize.length} posts`)

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

        const categorySlug = await classifyPost(
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

        if (post.category_id === categoryId) {
          console.log(`No change (already ${categorySlug}), skipping.`)
          continue
        }

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

        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error)
        errorCount++
      }
    }

    console.log(`\n=== Summary ===`)
    console.log('Successfully categorized:', successCount)
    console.log('Errors:', errorCount)
    console.log('Total processed:', postsToCategorize.length)
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

