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
 * POST /api/social-posts/[id]/publish
 * Publish a social post to Instagram
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check environment variables
    const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN

    if (!instagramAccountId) {
      return NextResponse.json(
        { error: 'Missing environment variable: INSTAGRAM_BUSINESS_ACCOUNT_ID' },
        { status: 500 }
      )
    }

    if (!instagramAccessToken) {
      return NextResponse.json(
        { error: 'Missing environment variable: INSTAGRAM_ACCESS_TOKEN' },
        { status: 500 }
      )
    }

    // Get post ID from params
    const { id } = await params

    // Fetch the social post from database
    const post = await getSocialPostById(id)

    if (!post) {
      return NextResponse.json({ error: 'Social post not found' }, { status: 404 })
    }

    // Validate post is ready for Instagram publishing
    if (!post.ig_text || post.ig_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Instagram text is missing or empty' },
        { status: 400 }
      )
    }

    if (!post.image_url || post.image_url.trim().length === 0) {
      return NextResponse.json(
        { error: 'Image URL is missing or empty' },
        { status: 400 }
      )
    }

    if (!post.url || post.url.trim().length === 0) {
      return NextResponse.json(
        { error: 'Article URL is missing or empty' },
        { status: 400 }
      )
    }

    // Check if already posted
    if (post.ig_posted) {
      return NextResponse.json(
        { error: 'This post has already been published to Instagram' },
        { status: 400 }
      )
    }

    // Build final caption: combine ig_text, URL, and hashtags
    let caption = post.ig_text.trim()

    // Append article URL
    if (post.url) {
      caption += `\n\n${post.url}`
    }

    // Append hashtags if available
    if (post.hashtags && post.hashtags.trim().length > 0) {
      caption += `\n\n${post.hashtags.trim()}`
    }

    // Step 1: Create media container
    const createMediaUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}/media`
    const createMediaParams = new URLSearchParams({
      image_url: post.image_url,
      caption: caption,
      access_token: instagramAccessToken,
    })

    console.log('[INSTAGRAM PUBLISH] Creating media container...')
    const createMediaResponse = await fetch(createMediaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: createMediaParams.toString(),
    })

    const createMediaData = await createMediaResponse.json()

    if (!createMediaResponse.ok || createMediaData.error) {
      const errorMessage = createMediaData.error?.message || 'Failed to create media container'
      console.error('[INSTAGRAM PUBLISH] Create media error:', createMediaData.error)
      return NextResponse.json(
        {
          error: `Instagram API error: ${errorMessage}`,
          details: createMediaData.error,
        },
        { status: 500 }
      )
    }

    const creationId = createMediaData.id
    if (!creationId) {
      return NextResponse.json(
        { error: 'Instagram API did not return a creation ID' },
        { status: 500 }
      )
    }

    console.log('[INSTAGRAM PUBLISH] Media container created:', creationId)

    // Step 2: Publish the media
    const publishMediaUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}/media_publish`
    const publishMediaParams = new URLSearchParams({
      creation_id: creationId,
      access_token: instagramAccessToken,
    })

    console.log('[INSTAGRAM PUBLISH] Publishing media...')
    const publishMediaResponse = await fetch(publishMediaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishMediaParams.toString(),
    })

    const publishMediaData = await publishMediaResponse.json()

    if (!publishMediaResponse.ok || publishMediaData.error) {
      const errorMessage = publishMediaData.error?.message || 'Failed to publish media'
      console.error('[INSTAGRAM PUBLISH] Publish media error:', publishMediaData.error)
      return NextResponse.json(
        {
          error: `Instagram API error: ${errorMessage}`,
          details: publishMediaData.error,
        },
        { status: 500 }
      )
    }

    const instagramPostId = publishMediaData.id
    console.log('[INSTAGRAM PUBLISH] Successfully published to Instagram:', instagramPostId)

    // Step 3: Update database - mark as posted
    const updatedPost = await updateSocialPost(id, {
      ig_posted: true,
    })

    if (!updatedPost) {
      console.error('[INSTAGRAM PUBLISH] Failed to update database after successful publish')
      // Still return success since the post was published, but log the error
      return NextResponse.json({
        success: true,
        instagramPostId,
        warning: 'Post published but database update failed',
      })
    }

    return NextResponse.json({
      success: true,
      instagramPostId,
      post: updatedPost,
    })
  } catch (error) {
    console.error('[INSTAGRAM PUBLISH] Unexpected error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

