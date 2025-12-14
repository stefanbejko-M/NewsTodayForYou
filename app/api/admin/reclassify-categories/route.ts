import { NextRequest, NextResponse } from 'next/server'
import { reclassifyPosts } from '@/lib/reclassifyCategories'
import { isAdminAuthenticated } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/reclassify-categories
 * Reclassify existing posts based on their title and excerpt using AI-first classifier
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    if (!(await isAdminAuthenticated(request))) {
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
