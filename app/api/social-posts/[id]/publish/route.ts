import { NextRequest, NextResponse } from 'next/server'
import { getSocialPostById, updateSocialPost } from '@/lib/socialPostService'
import { isAdminAuthenticated } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
 * Validate that the Instagram image proxy returns a valid image
 * Returns { ok: true } if valid, { ok: false, reason: string } if invalid
 */
async function validateInstagramImage(proxyUrl: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    console.log('[INSTAGRAM VALIDATION] Testing proxy URL:', proxyUrl)
    
    // Do a HEAD request first to check Content-Type without downloading full image
    const headResponse = await fetch(proxyUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    })

    if (!headResponse.ok) {
      const reason = `Proxy returned status ${headResponse.status} ${headResponse.statusText}`
      console.error('[INSTAGRAM VALIDATION]', reason)
      return { ok: false, reason }
    }

    const contentType = headResponse.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      const reason = `Proxy returned non-image Content-Type: ${contentType}`
      console.error('[INSTAGRAM VALIDATION]', reason)
      return { ok: false, reason }
    }

    // If HEAD worked, do a small GET to verify the image is actually processable
    // We'll fetch just the first few KB to verify it's an image
    const getResponse = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-8192', // First 8KB should be enough to verify it's an image
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!getResponse.ok) {
      const reason = `Proxy GET returned status ${getResponse.status} ${getResponse.statusText}`
      console.error('[INSTAGRAM VALIDATION]', reason)
      return { ok: false, reason }
    }

    const finalContentType = getResponse.headers.get('content-type') || ''
    if (!finalContentType.startsWith('image/')) {
      const reason = `Proxy GET returned non-image Content-Type: ${finalContentType}`
      console.error('[INSTAGRAM VALIDATION]', reason)
      return { ok: false, reason }
    }

    console.log('[INSTAGRAM VALIDATION] Proxy validation successful:', {
      status: getResponse.status,
      contentType: finalContentType,
    })

    return { ok: true }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error during validation'
    console.error('[INSTAGRAM VALIDATION] Validation error:', error)
    return { ok: false, reason }
  }
}

/**
 * POST /api/social-posts/[id]/publish
 * Publish a social post to Instagram
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get post ID from params early so it's available in catch block
  const { id } = await params
  
  try {
    // Check authorization
    if (!(await isAdminAuthenticated(request))) {
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

    // Validate the proxy image before attempting Instagram publish
    console.log('[INSTAGRAM PUBLISH] Validating image proxy before Instagram publish...')
    const validation = await validateInstagramImage(finalImageUrl)
    if (!validation.ok) {
      console.error('[INSTAGRAM PUBLISH] Image proxy validation failed:', validation.reason)
      
      const errorMessage = 'Image for this article could not be processed for Instagram. Try another image.'
      
      // Update database with failure status
      await updateSocialPost(id, {
        status: 'failed',
        last_error: errorMessage + (validation.reason ? ` (${validation.reason})` : ''),
      })
      
      return NextResponse.json(
        {
          error: errorMessage,
          details: validation.reason,
        },
        { status: 422 }
      )
    }
    console.log('[INSTAGRAM PUBLISH] Image proxy validation passed')

    if (!post.url || post.url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is missing or empty' },
        { status: 400 }
      )
    }

    // Build base caption: use suggested_text if present, otherwise fall back to title
    // baseCaption already includes the English AI text and hashtags
    const baseCaption = post.suggested_text?.trim() || post.title?.trim() || ''

    if (baseCaption.length === 0) {
      return NextResponse.json(
        { error: 'Post has no text content (suggested_text or title is required)' },
        { status: 400 }
      )
    }

    // Sanitize URL: remove all whitespace (newlines, spaces, etc.)
    const rawUrl = post.url ?? ''
    const cleanUrl = rawUrl.replace(/\s/g, '')

    console.log('[INSTAGRAM PUBLISH] Publishing social post URL:', {
      rawUrl,
      cleanUrl,
    })

    // Build final caption with explicit format:
    // <AI text + hashtags>
    // Location: <location_name> (if present)
    // Read more: <url>
    let caption = baseCaption

    // If we have a location_name, add a "Location:" line
    const locationName = (post as any).location_name
    if (locationName && typeof locationName === 'string' && locationName.trim().length > 0) {
      caption += `\n\nLocation: ${locationName.trim()}`
    }

    // Always append the URL as "Read more: <url>" (using sanitized cleanUrl)
    caption += `\n\nRead more: ${cleanUrl}`

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
    console.log('[INSTAGRAM PUBLISH] Final image URL being sent to Instagram:', finalImageUrl)
    console.log('[INSTAGRAM PUBLISH] Original image URL from database:', originalImageUrl)
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

    // Detailed logging for /media endpoint
    console.log('[INSTAGRAM PUBLISH] /media response status:', createMediaResponse.status)
    console.log('[INSTAGRAM PUBLISH] /media response JSON:', JSON.stringify(createMediaData, null, 2))
    
    if (createMediaData.error) {
      console.error('[INSTAGRAM PUBLISH] /media error details:', {
        error_type: createMediaData.error.type,
        code: createMediaData.error.code,
        message: createMediaData.error.message,
        error_subcode: createMediaData.error.error_subcode,
        fbtrace_id: createMediaData.error.fbtrace_id,
        error_user_title: createMediaData.error.error_user_title,
        error_user_msg: createMediaData.error.error_user_msg,
      })
    }

    if (!createMediaResponse.ok) {
      console.error('[INSTAGRAM PUBLISH] Create media error (non-OK response):', {
        status: createMediaResponse.status,
        statusText: createMediaResponse.statusText,
        responseBody: createMediaData,
      })

      // Return user-friendly error message
      const userMessage = createMediaData.error?.error_user_msg || 
                          createMediaData.error?.message || 
                          `Instagram rejected this image. Try changing the article image or choose another story.`

      // Update database with failure status
      await updateSocialPost(id, {
        status: 'failed',
        last_error: userMessage,
      })

      return NextResponse.json(
        {
          error: userMessage,
          stage: 'media',
          instagramError: createMediaData,
          request: {
            image_url: finalImageUrl,
            original_image_url: originalImageUrl,
            hasLocationId: false,
          },
        },
        { status: 500 }
      )
    }

    if (createMediaData.error) {
      console.error('[INSTAGRAM PUBLISH] Create media error (error in response):', createMediaData.error)

      const userMessage = createMediaData.error.error_user_msg || 
                          createMediaData.error.message || 
                          `Instagram rejected this image. Try changing the article image or choose another story.`

      // Update database with failure status
      await updateSocialPost(id, {
        status: 'failed',
        last_error: userMessage,
      })

      return NextResponse.json(
        {
          error: userMessage,
          stage: 'media',
          instagramError: createMediaData,
          request: {
            image_url: finalImageUrl,
            original_image_url: originalImageUrl,
            hasLocationId: false,
          },
        },
        { status: 500 }
      )
    }

    const creationId = createMediaData.id
    if (!creationId) {
      console.error('[INSTAGRAM PUBLISH] Create media response missing id:', createMediaData)

      const errorMessage = 'Instagram /media response did not contain an id'
      
      // Update database with failure status
      await updateSocialPost(id, {
        status: 'failed',
        last_error: errorMessage,
      })

      return NextResponse.json(
        {
          error: errorMessage,
          stage: 'media',
          instagramError: createMediaData,
          request: {
            image_url: finalImageUrl,
            original_image_url: originalImageUrl,
            hasLocationId: false,
          },
        },
        { status: 500 }
      )
    }

    console.log('[INSTAGRAM PUBLISH] Media container created successfully. Creation ID:', creationId)

    // Step 2: Publish the media
    const publishMediaUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}/media_publish`
    const publishMediaParams = new URLSearchParams({
      creation_id: creationId,
      access_token: instagramAccessToken,
    })

    console.log('[INSTAGRAM PUBLISH] Publishing media...')
    console.log('[INSTAGRAM PUBLISH] /media_publish request URL:', publishMediaUrl)
    console.log('[INSTAGRAM PUBLISH] /media_publish creation_id:', creationId)
    
    const publishMediaResponse = await fetch(publishMediaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishMediaParams.toString(),
    })

    const publishMediaData = await publishMediaResponse.json()

    // Detailed logging for /media_publish endpoint
    console.log('[INSTAGRAM PUBLISH] /media_publish response status:', publishMediaResponse.status)
    console.log('[INSTAGRAM PUBLISH] /media_publish response JSON:', JSON.stringify(publishMediaData, null, 2))
    
    if (publishMediaData.error) {
      console.error('[INSTAGRAM PUBLISH] /media_publish error details:', {
        error_type: publishMediaData.error.type,
        code: publishMediaData.error.code,
        message: publishMediaData.error.message,
        error_subcode: publishMediaData.error.error_subcode,
        fbtrace_id: publishMediaData.error.fbtrace_id,
        error_user_title: publishMediaData.error.error_user_title,
        error_user_msg: publishMediaData.error.error_user_msg,
      })
    }

    if (!publishMediaResponse.ok) {
      console.error('[INSTAGRAM PUBLISH] Publish media error (non-OK response):', {
        status: publishMediaResponse.status,
        statusText: publishMediaResponse.statusText,
        responseBody: publishMediaData,
        creation_id: creationId,
      })

      const userMessage = publishMediaData.error?.error_user_msg || 
                          publishMediaData.error?.message || 
                          `Instagram rejected this image. Try changing the article image or choose another story.`

      // Update database with failure status
      await updateSocialPost(id, {
        status: 'failed',
        last_error: userMessage,
      })

      return NextResponse.json(
        {
          error: userMessage,
          stage: 'media_publish',
          instagramError: publishMediaData,
          creation_id: creationId,
        },
        { status: 500 }
      )
    }

    if (publishMediaData.error) {
      console.error('[INSTAGRAM PUBLISH] Publish media error (error in response):', publishMediaData.error)

      const userMessage = publishMediaData.error.error_user_msg || 
                          publishMediaData.error.message || 
                          `Instagram rejected this image. Try changing the article image or choose another story.`

      // Update database with failure status
      await updateSocialPost(id, {
        status: 'failed',
        last_error: userMessage,
      })

      return NextResponse.json(
        {
          error: userMessage,
          stage: 'media_publish',
          instagramError: publishMediaData,
          creation_id: creationId,
        },
        { status: 500 }
      )
    }

    const instagramPostId = publishMediaData.id
    if (!instagramPostId) {
      console.error('[INSTAGRAM PUBLISH] Publish media response missing id:', publishMediaData)

      const errorMessage = 'Instagram /media_publish response did not contain an id'
      
      // Update database with failure status
      await updateSocialPost(id, {
        status: 'failed',
        last_error: errorMessage,
      })

      return NextResponse.json(
        {
          error: errorMessage,
          stage: 'media_publish',
          instagramError: publishMediaData,
          creation_id: creationId,
        },
        { status: 500 }
      )
    }

    console.log('[INSTAGRAM PUBLISH] Successfully published to Instagram. Post ID:', instagramPostId)

    // Step 3: Update database with full tracking information
    // Extract permalink if available (Instagram API may provide this in some responses)
    const permalink = publishMediaData.permalink || null
    
    const updatedPost = await updateSocialPost(id, {
      status: 'published',
      instagram_post_id: instagramPostId,
      instagram_permalink: permalink,
      published_at: new Date().toISOString(),
      last_error: null,
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
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Try to update database with failure status (best effort, don't fail if this fails)
    try {
      await updateSocialPost(id, {
        status: 'failed',
        last_error: errorMessage,
      })
    } catch (dbError) {
      console.error('[INSTAGRAM PUBLISH] Failed to update database with error status:', dbError)
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
