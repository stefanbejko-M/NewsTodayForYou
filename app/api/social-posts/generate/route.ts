import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInstagramSuggestedText } from '@/lib/socialPostGenerator'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Check if request has valid admin token
 */
function isAuthorized(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN

  // If no token is configured, allow access (for development)
  if (!adminToken) {
    console.warn('[ADMIN] No ADMIN_DASHBOARD_TOKEN configured. Allowing access.')
    return true
  }

  // Check header
  const headerToken = request.headers.get('x-admin-token')
  if (headerToken === adminToken) {
    return true
  }

  // Check query parameter
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
 * POST /api/social-posts/generate
 * Automatically generate Instagram social posts for articles that don't have them yet
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseClient()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'

    // Find recent articles (last 7 days) that don't have Instagram social posts yet
    // We match by URL to avoid duplicates
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    console.log('[SOCIAL POSTS GENERATE] Fetching recent articles...')

    // Get all recent posts
    const { data: recentPosts, error: postsError } = await supabase
      .from('post')
      .select('id, title, slug, body, excerpt, image_url, category_id, created_at, source_name')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(100)

    if (postsError) {
      console.error('[SOCIAL POSTS GENERATE] Error fetching posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch articles', details: postsError.message },
        { status: 500 }
      )
    }

    if (!recentPosts || recentPosts.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No recent articles found',
        generated: 0,
        skipped: 0,
      })
    }

    console.log(`[SOCIAL POSTS GENERATE] Found ${recentPosts.length} recent articles`)

    // Get existing Instagram social posts to check for duplicates
    const { data: existingSocialPosts, error: socialPostsError } = await supabase
      .from('social_posts')
      .select('url')
      .eq('platform', 'instagram')

    if (socialPostsError) {
      console.error('[SOCIAL POSTS GENERATE] Error fetching existing social posts:', socialPostsError)
      return NextResponse.json(
        { error: 'Failed to fetch existing social posts', details: socialPostsError.message },
        { status: 500 }
      )
    }

    // Create a set of existing URLs for quick lookup
    const existingUrls = new Set(
      (existingSocialPosts || []).map((sp) => sp.url).filter((url): url is string => !!url)
    )

    // Get category information for posts that have category_id
    const categoryIds = [...new Set(recentPosts.map((p) => p.category_id).filter(Boolean))]
    let categoriesMap: Record<number, { slug: string; name: string }> = {}

    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('category')
        .select('id, slug, name')
        .in('id', categoryIds)

      if (categories) {
        categoriesMap = Object.fromEntries(
          categories.map((cat) => [cat.id, { slug: cat.slug, name: cat.name }])
        ) as Record<number, { slug: string; name: string }>
      }
    }

    let generated = 0
    let skipped = 0
    let skippedNoImage = 0
    const errors: string[] = []

    // Process each article
    for (const post of recentPosts) {
      try {
        // Skip if post doesn't have required fields
        if (!post.title || !post.slug) {
          skipped++
          continue
        }

        // Skip if article has no image_url (Instagram requires images)
        const imageUrl = post.image_url?.trim()
        if (!imageUrl) {
          skippedNoImage++
          console.log(`[SOCIAL POSTS GENERATE] Skipping article without image: ${post.title}`)
          continue
        }

        // Build article URL using URL constructor to ensure it's a single clean string
        // This prevents any newlines or whitespace issues
        const siteUrl = baseUrl.trim()
        const articleUrl = new URL(`/news/${post.slug}`, siteUrl).toString()

        // Skip if social post already exists for this URL
        if (existingUrls.has(articleUrl)) {
          skipped++
          continue
        }

        // Get category slug if available
        const category =
          post.category_id && categoriesMap[post.category_id]
            ? categoriesMap[post.category_id].slug
            : null

        // Generate suggested_text using AI
        console.log(`[SOCIAL POSTS GENERATE] Generating Instagram post for: ${post.title}`)
        const suggestedText = await generateInstagramSuggestedText({
          id: post.id,
          slug: post.slug,
          title: post.title,
          body: post.body || '',
          excerpt: post.excerpt || null,
          imageUrl: post.image_url || null,
          category: category || null,
          sourceName: post.source_name || null,
          url: articleUrl,
        })

        // Insert into social_posts table (imageUrl is guaranteed to be non-empty at this point)
        const { error: insertError } = await supabase.from('social_posts').insert({
          title: post.title,
          url: articleUrl,
          image_url: imageUrl, // Use the validated imageUrl
          platform: 'instagram',
          status: 'pending',
          suggested_text: suggestedText,
        })

        if (insertError) {
          // Check if it's a duplicate (unique constraint violation)
          if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
            skipped++
            console.log(`[SOCIAL POSTS GENERATE] Duplicate skipped: ${post.title}`)
          } else {
            throw insertError
          }
        } else {
          generated++
          console.log(`[SOCIAL POSTS GENERATE] Created Instagram post for: ${post.title}`)
          // Add to existing URLs set to avoid duplicates in the same run
          existingUrls.add(articleUrl)
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error)
        errors.push(`Post ${post.id} (${post.title}): ${errorMsg}`)
        console.error(`[SOCIAL POSTS GENERATE] Error processing post ${post.id}:`, error)
        skipped++
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Generated ${generated} Instagram social posts`,
      generated,
      skipped,
      skippedNoImage,
      total: recentPosts.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[SOCIAL POSTS GENERATE] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/social-posts/generate
 * Get status/info about the generation process
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseClient()

    // Count pending Instagram posts
    const { count: pendingCount, error: countError } = await supabase
      .from('social_posts')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'instagram')
      .neq('status', 'published')

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to count posts', details: countError.message },
        { status: 500 }
      )
    }

    // Count total Instagram posts
    const { count: totalCount, error: totalError } = await supabase
      .from('social_posts')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'instagram')

    if (totalError) {
      return NextResponse.json(
        { error: 'Failed to count total posts', details: totalError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      pendingInstagramPosts: pendingCount || 0,
      totalInstagramPosts: totalCount || 0,
    })
  } catch (error) {
    console.error('[SOCIAL POSTS GENERATE] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

