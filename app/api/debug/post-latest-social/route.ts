import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSocialPostForArticle } from '@/lib/socialPostService'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      )
    }

    const client = createClient(supabaseUrl, supabaseKey)

    // Fetch the latest article with category
    const { data, error } = await client
      .from('post')
      .select('id, slug, title, excerpt, body, image_url, created_at, source_name, category_id, category:category_id(slug)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[DEBUG POST SOCIAL] Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch article from database' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'No articles found' },
        { status: 404 }
      )
    }

    // Extract category slug from nested relation
    let categorySlug: string | null = null
    if (data.category) {
      const cat = Array.isArray(data.category) ? data.category[0] : data.category
      if (cat && typeof cat === 'object' && 'slug' in cat) {
        categorySlug = typeof cat.slug === 'string' ? cat.slug : null
      }
    }

    // Build article URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
    const articleUrl = `${baseUrl}/news/${data.slug}`

    // Create social post (prepared content, not auto-posting)
    const socialPost = await createSocialPostForArticle({
      id: data.id,
      slug: data.slug || '',
      title: data.title || 'Untitled',
      body: data.body || '',
      excerpt: data.excerpt || null,
      imageUrl: data.image_url || null,
      category: categorySlug,
      sourceName: data.source_name || null,
      url: articleUrl,
    })

    return NextResponse.json({
      ok: true,
      message: 'Social post prepared (not auto-posted). Use admin panel to copy and post manually.',
      articleId: data.id,
      slug: data.slug,
      title: data.title,
      socialPost: {
        id: socialPost.id,
        fbText: socialPost.fb_text.substring(0, 100) + '...',
        igText: socialPost.ig_text.substring(0, 100) + '...',
        threadsText: socialPost.threads_text.substring(0, 100) + '...',
        hashtags: socialPost.hashtags,
        fbPosted: socialPost.fb_posted,
        igPosted: socialPost.ig_posted,
        threadsPosted: socialPost.threads_posted,
      },
    })
  } catch (error) {
    console.error('[DEBUG POST SOCIAL] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

