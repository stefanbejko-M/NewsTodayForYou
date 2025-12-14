import { NextRequest, NextResponse } from 'next/server'
import { listSocialPosts } from '@/lib/socialPostService'
import { isAdminAuthenticated } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/social-posts
 * List social posts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = (url.searchParams.get('status') || 'unposted') as 'all' | 'unposted'
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    const posts = await listSocialPosts({
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      ok: true,
      posts,
      count: posts.length,
    })
  } catch (error) {
    console.error('[API SOCIAL POSTS] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


