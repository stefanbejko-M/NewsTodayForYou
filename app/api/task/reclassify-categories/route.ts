import { NextRequest, NextResponse } from 'next/server'
import { reclassifyPosts } from '@/lib/reclassifyCategories'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Check if request is authorized (for cron jobs)
 */
function isAuthorized(req: NextRequest): boolean {
  // If there is no CRON_SECRET configured, do not restrict access
  if (!CRON_SECRET) return true

  const url = new URL(req.url)
  const header = req.headers.get('authorization')
  const secretParam = url.searchParams.get('secret')

  // 1) Vercel Cron – Authorization: Bearer CRON_SECRET
  if (header === `Bearer ${CRON_SECRET}`) return true

  // 2) Manual call – ?secret=CRON_SECRET
  if (secretParam && secretParam === CRON_SECRET) return true

  // 3) Admin token (for manual testing)
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN
  if (adminToken) {
    const adminHeader = req.headers.get('x-admin-token')
    if (adminHeader === adminToken) return true
  }

  return false
}

/**
 * POST /api/task/reclassify-categories
 * Cron-friendly endpoint for automatic category reclassification
 * Uses the same shared logic as /api/admin/reclassify-categories
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const daysParam = url.searchParams.get('days')
    const days = daysParam ? parseInt(daysParam, 10) : null

    // Use shared reclassification logic
    const result = await reclassifyPosts({ days })

    return NextResponse.json({
      ok: true,
      ...result,
      message: `Reclassification complete. Updated: ${result.updated}, Unchanged: ${result.unchanged}, Errors: ${result.errors}`,
    })
  } catch (error) {
    console.error('[CRON RECLASSIFY] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

