import { NextRequest, NextResponse } from 'next/server'
import { getSocialPostById, updateSocialPost } from '@/lib/socialPostService'

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
 * GET /api/social-posts/[id]
 * Get a single social post by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const post = await getSocialPostById(id)

    if (!post) {
      return NextResponse.json({ error: 'Social post not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      post,
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

/**
 * PATCH /api/social-posts/[id]
 * Update a social post
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Validate allowed fields (matching actual schema)
    const allowedFields = [
      'status',
      'suggested_text',
      'title',
      'url',
      'image_url',
      'platform',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedPost = await updateSocialPost(id, updates)

    if (!updatedPost) {
      return NextResponse.json(
        { error: 'Failed to update social post' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      post: updatedPost,
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

