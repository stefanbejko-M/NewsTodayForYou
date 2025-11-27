import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishArticleToAllSocial, type SocialArticlePayload } from '@/lib/facebook'

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

    // Fetch the latest article
    const { data, error } = await client
      .from('post')
      .select('id, slug, title, excerpt, body, image_url, created_at, source_name')
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
    }

    // Publish to all social networks
    await publishArticleToAllSocial(socialPayload)

    return NextResponse.json({
      ok: true,
      articleId: data.id,
      slug: data.slug,
      title: data.title,
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

