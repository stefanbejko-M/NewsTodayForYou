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
 * Build Instagram image proxy URL
 * Proxies the original image through our domain so Instagram can fetch it
 */
function buildInstagramImageUrl(originalUrl: string): string {
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    throw new Error('SITE_URL or NEXT_PUBLIC_SITE_URL env var is required for Instagram image proxy.')
  }

  const url = new URL('/api/instagram-image', siteUrl)
  url.searchParams.set('src', originalUrl)
  return url.toString()
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

    // Validate platform is Instagram
    if (!post.platform || !post.platform.toLowerCase().includes('instagram')) {
      return NextResponse.json(
        { error: 'This post is not configured for Instagram (platform must be "instagram")' },
        { status: 400 }
      )
    }

    // Validate status is not already published
    if (post.status === 'published') {
      return NextResponse.json(
        { error: 'This post has already been published' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!post.image_url || post.image_url.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post has no image_url, cannot publish to Instagram' },
        { status: 400 }
      )
    }

    // Build proxied image URL for Instagram
    // Instagram will fetch the image from our proxy endpoint, which downloads it from the original source
    const originalImageUrl = post.image_url.trim()
    let finalImageUrl: string

    try {
      finalImageUrl = buildInstagramImageUrl(originalImageUrl)
      console.log('[INSTAGRAM PUBLISH] Original image URL:', originalImageUrl)
      console.log('[INSTAGRAM PUBLISH] Proxied image URL:', finalImageUrl)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return NextResponse.json(
        { error: `Failed to build image proxy URL: ${errorMsg}` },
        { status: 500 }
      )
    }

    if (!post.url || post.url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is missing or empty' },
        { status: 400 }
      )
    }

    // Build base caption: use suggested_text if present, otherwise fall back to title
    const baseCaption = post.suggested_text?.trim() || post.title?.trim() || ''

    if (baseCaption.length === 0) {
      return NextResponse.json(
        { error: 'Post has no text content (suggested_text or title is required)' },
        { status: 400 }
      )
    }

    // Final caption always includes the article URL on a new line at the end
    const caption = `${baseCaption}\n\n${post.url}`

    // Step 1: Create media container
    // For image posts, we only send: image_url (proxied), caption, and access_token
    // Do NOT send media_type - Instagram API infers it automatically from image_url
    const createMediaUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}/media`
    const createMediaParams = new URLSearchParams({
      image_url: finalImageUrl, // Use proxied URL so Instagram fetches from our domain
      caption: caption,
      access_token: instagramAccessToken,
    })

    // Log the request payload (without access token for security)
    console.log('[INSTAGRAM PUBLISH] Creating media container...')
    console.log('[INSTAGRAM PUBLISH] Request URL:', createMediaUrl)
    console.log('[INSTAGRAM PUBLISH] Request params:', {
      image_url: finalImageUrl,
      caption: caption.substring(0, 100) + '...',
      access_token: '***REDACTED***',
    })
    console.log('[INSTAGRAM PUBLISH] Request body (form-encoded):', createMediaParams.toString().replace(/access_token=[^&]+/, 'access_token=***REDACTED***'))

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
      const errorCode = createMediaData.error?.code
      const errorType = createMediaData.error?.type
      const errorSubcode = createMediaData.error?.error_subcode

      console.error('[INSTAGRAM PUBLISH] Create media error:', {
        message: errorMessage,
        code: errorCode,
        type: errorType,
        subcode: errorSubcode,
        fullError: createMediaData.error,
        responseStatus: createMediaResponse.status,
        responseBody: createMediaData,
      })

      return NextResponse.json(
        {
          error: `Instagram API error: ${errorMessage}`,
          details: {
            code: errorCode,
            type: errorType,
            subcode: errorSubcode,
            fullError: createMediaData.error,
          },
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
      const errorCode = publishMediaData.error?.code
      const errorType = publishMediaData.error?.type
      const errorSubcode = publishMediaData.error?.error_subcode

      console.error('[INSTAGRAM PUBLISH] Publish media error:', {
        message: errorMessage,
        code: errorCode,
        type: errorType,
        subcode: errorSubcode,
        fullError: publishMediaData.error,
        responseStatus: publishMediaResponse.status,
        responseBody: publishMediaData,
      })

      return NextResponse.json(
        {
          error: `Instagram API error: ${errorMessage}`,
          details: {
            code: errorCode,
            type: errorType,
            subcode: errorSubcode,
            fullError: publishMediaData.error,
          },
        },
        { status: 500 }
      )
    }

    const instagramPostId = publishMediaData.id
    console.log('[INSTAGRAM PUBLISH] Successfully published to Instagram:', instagramPostId)

    // Step 3: Update database - set status to "published"
    const updatedPost = await updateSocialPost(id, {
      status: 'published',
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
