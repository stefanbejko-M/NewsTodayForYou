import { NextRequest, NextResponse } from 'next/server'
import { reclassifyPosts } from '@/lib/reclassifyCategories'

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
 * POST /api/admin/reclassify-categories
 * Reclassify existing posts based on their title and excerpt using AI-first classifier
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

    // Use shared reclassification logic
    const result = await reclassifyPosts({ days })

    return NextResponse.json({
      ok: true,
      ...result,
      message: `Reclassification complete. Updated: ${result.updated}, Unchanged: ${result.unchanged}, Errors: ${result.errors}`,
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
