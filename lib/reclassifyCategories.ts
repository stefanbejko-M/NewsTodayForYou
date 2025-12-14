import { createClient } from '@supabase/supabase-js'
import { getFinalCategorySlugForPost } from './categoryClassifier'

/**
 * Get Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Get category ID from slug
 */
async function getCategoryId(categorySlug: string): Promise<number | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('category')
    .select('id')
    .eq('slug', categorySlug)
    .maybeSingle()

  if (error || !data) {
    console.error(`[RECLASSIFY] Category "${categorySlug}" not found in database`)
    return null
  }

  return data.id
}

/**
 * Core reclassification logic (shared between admin and cron routes)
 */
export async function reclassifyPosts(options: { days?: number | null } = {}) {
  const { days } = options
  const supabase = getSupabaseClient()
  const BATCH_SIZE = 200

  let offset = 0
  let updated = 0
  let unchanged = 0
  let errors = 0

  // Build query
  let query = supabase
    .from('post')
    .select('id, title, excerpt, body, source_name, category_id, category:category_id(slug)')
    .order('id', { ascending: true })

  // If days is specified, filter by created_at
  if (days !== null && days !== undefined && days > 0) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', cutoffDate)
  }

  // Process in batches
  while (true) {
    const { data: posts, error: fetchError } = await query.range(offset, offset + BATCH_SIZE - 1)

    if (fetchError) {
      console.error('[RECLASSIFY] Error fetching posts:', fetchError)
      throw new Error(`Failed to fetch posts: ${fetchError.message}`)
    }

    if (!posts || posts.length === 0) {
      break // No more posts
    }

    console.log(`[RECLASSIFY] Processing batch: ${offset} to ${offset + posts.length - 1}`)

    for (const post of posts) {
      try {
        // Extract current category slug
        let currentCategorySlug: string | null = null
        if (post.category) {
          const cat = Array.isArray(post.category) ? post.category[0] : post.category
          if (cat && typeof cat === 'object' && 'slug' in cat) {
            currentCategorySlug = typeof cat.slug === 'string' ? cat.slug : null
          }
        }

        // Classify the post using AI-first classifier
        const newCategorySlug = await getFinalCategorySlugForPost({
          title: post.title || '',
          excerpt: post.excerpt || null,
          body: post.body || null,
          source_name: post.source_name || null,
        })

        // If category hasn't changed, skip
        if (currentCategorySlug === newCategorySlug) {
          unchanged++
          continue
        }

        // Get new category ID
        const newCategoryId = await getCategoryId(newCategorySlug)
        if (!newCategoryId) {
          console.error(
            `[RECLASSIFY] Category "${newCategorySlug}" not found for post ${post.id}. Skipping.`
          )
          errors++
          continue
        }

        // Update the post
        const { error: updateError } = await supabase
          .from('post')
          .update({ category_id: newCategoryId })
          .eq('id', post.id)

        if (updateError) {
          console.error(`[RECLASSIFY] Error updating post ${post.id}:`, updateError)
          errors++
        } else {
          updated++
          console.log(
            `[RECLASSIFY] Updated post ${post.id}: "${post.title?.substring(0, 50)}" from "${currentCategorySlug}" to "${newCategorySlug}"`
          )
        }
      } catch (error) {
        console.error(`[RECLASSIFY] Error processing post ${post.id}:`, error)
        errors++
      }
    }

    offset += BATCH_SIZE

    // If we got fewer posts than batch size, we're done
    if (posts.length < BATCH_SIZE) {
      break
    }
  }

  return {
    updated,
    unchanged,
    errors,
  }
}


