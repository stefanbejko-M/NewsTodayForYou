import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishArticleToAllSocial, type SocialArticlePayload, type SocialPostResult } from '@/lib/facebook'

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

    // Build social payload
    const summary = data.excerpt || (data.body ? data.body.slice(0, 200) : '')

    const socialPayload: SocialArticlePayload = {
      id: data.id,
      slug: data.slug || '',
      title: data.title || 'Untitled',
      summary,
      body: data.body || undefined,
      imageUrl: data.image_url || null,
      createdAt: data.created_at || null,
      sourceName: data.source_name || null,
      category: categorySlug,
    }

    // Publish to all social networks and get results
    const results = await publishArticleToAllSocial(socialPayload)

    // Build response with network statuses
    const response: {
      ok: boolean
      articleId: number | null
      slug: string | null
      title: string | null
      facebook?: { ok: boolean; status?: string; error?: string }
      instagram?: { ok: boolean; status?: string; error?: string }
      threads?: { ok: boolean; status?: string; error?: string }
    } = {
      ok: true,
      articleId: data.id,
      slug: data.slug,
      title: data.title,
    }

    // Add network statuses
    for (const result of results) {
      if (result.network === 'facebook') {
        response.facebook = { ok: result.ok, status: result.status, error: result.error }
      } else if (result.network === 'instagram') {
        response.instagram = { ok: result.ok, status: result.status, error: result.error }
      } else if (result.network === 'threads') {
        response.threads = { ok: result.ok, status: result.status, error: result.error }
      }
    }

    return NextResponse.json(response)
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

