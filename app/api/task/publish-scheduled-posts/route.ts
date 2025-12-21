import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CRON_SECRET = process.env.CRON_SECRET

// Helper: Check if request is authorized
function isAuthorized(req: NextRequest, dryRun: boolean) {
  // Allow all dry-run calls (for testing)
  if (dryRun) return true

  // If there is no CRON_SECRET configured, do not restrict access
  if (!CRON_SECRET) return true

  const url = new URL(req.url)
  const header = req.headers.get('authorization')
  const secretParam = url.searchParams.get('secret')

  // 1) Vercel Cron – Authorization: Bearer CRON_SECRET
  if (header === `Bearer ${CRON_SECRET}`) return true

  // 2) Manual browser call – ?secret=CRON_SECRET
  if (secretParam && secretParam === CRON_SECRET) return true

  return false
}

// Helper: Get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Publish scheduled posts
 * 
 * This cron job finds posts where:
 * - is_published = false
 * - scheduled_for <= now()
 * 
 * And publishes them by:
 * - Setting is_published = true
 * - Setting published_at = scheduled_for (or now() if scheduled_for is null)
 * - Clearing scheduled_for
 * 
 * IMPORTANT: This does NOT change external API calls.
 * It only controls when posts appear on our site.
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for testing
    const url = new URL(request.url)
    const isDryRun = url.searchParams.get('dry') === '1'
    const limitParam = url.searchParams.get('limit')
    const maxPostsPerRun = limitParam ? parseInt(limitParam, 10) : parseInt(process.env.MAX_POSTS_PER_PUBLISH_RUN || '50', 10)

    // Check authorization
    if (!isAuthorized(request, isDryRun)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseClient()
    const now = new Date().toISOString()

    console.log(`[PUBLISH CRON] Starting scheduled post publishing...`)
    console.log(`[PUBLISH CRON] Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
    console.log(`[PUBLISH CRON] Max posts per run: ${maxPostsPerRun}`)
    console.log(`[PUBLISH CRON] Current time: ${now}`)

    // Find posts that are scheduled and ready to publish
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('post')
      .select('id, slug, title, scheduled_for')
      .eq('is_published', false)
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(maxPostsPerRun)

    if (fetchError) {
      console.error('[PUBLISH CRON] Error fetching scheduled posts:', fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts ready to publish',
        published: 0,
        checked: 0,
      })
    }

    console.log(`[PUBLISH CRON] Found ${scheduledPosts.length} posts ready to publish`)

    let published = 0
    const errors: string[] = []

    for (const post of scheduledPosts) {
      try {
        if (isDryRun) {
          console.log(`[PUBLISH CRON] [DRY RUN] Would publish: ${post.slug} (scheduled for: ${post.scheduled_for})`)
          published++
        } else {
          // Update post to published
          const { error: updateError } = await supabase
            .from('post')
            .update({
              is_published: true,
              published_at: post.scheduled_for || now,
              scheduled_for: null, // Clear scheduled_for after publishing
            })
            .eq('id', post.id)

          if (updateError) {
            console.error(`[PUBLISH CRON] Error publishing post ${post.slug}:`, updateError)
            errors.push(`Failed to publish ${post.slug}: ${updateError.message}`)
          } else {
            console.log(`[PUBLISH CRON] Published: ${post.slug}`)
            published++
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[PUBLISH CRON] Exception publishing post ${post.slug}:`, errorMsg)
        errors.push(`Exception publishing ${post.slug}: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: isDryRun ? 'Dry run completed - no posts published' : 'Scheduled posts published',
      dry_run: isDryRun,
      published,
      checked: scheduledPosts.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[PUBLISH CRON] Error in publish-scheduled-posts route:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

