import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { categorizePost } from '@/lib/categoryClassifier'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Check if request has valid admin token
 */
function isAuthorized(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN

  // If no token configured, allow access (for development)
  if (!adminToken) {
    console.warn('[ADMIN] No ADMIN_DASHBOARD_TOKEN configured. Allowing access.')
    return true
  }

  const headerToken = request.headers.get('x-admin-token')
  if (headerToken === adminToken) {
    return true
  }

  const url = new URL(request.url)
  const queryToken = url.searchParams.get('token')
  if (queryToken === adminToken) {
    return true
  }

  return false
}

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
 * POST /api/admin/reclassify-categories
 * Reclassify existing posts based on their title and excerpt
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const daysParam = url.searchParams.get('days')
    const days = daysParam ? parseInt(daysParam, 10) : null // null means all posts

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
    if (days !== null && days > 0) {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', cutoffDate)
    }

    // Process in batches
    while (true) {
      const { data: posts, error: fetchError } = await query.range(offset, offset + BATCH_SIZE - 1)

      if (fetchError) {
        console.error('[RECLASSIFY] Error fetching posts:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch posts', details: fetchError.message },
          { status: 500 }
        )
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

          // Classify the post
          const newCategorySlug = categorizePost({
            title: post.title || '',
            excerpt: post.excerpt || null,
            source_name: post.source_name || null,
            body: post.body || null,
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

    return NextResponse.json({
      ok: true,
      updated,
      unchanged,
      errors,
      message: `Reclassification complete. Updated: ${updated}, Unchanged: ${unchanged}, Errors: ${errors}`,
    })
  } catch (error) {
    console.error('[RECLASSIFY] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

