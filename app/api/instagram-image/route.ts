import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/instagram-image
 * Proxy images for Instagram - downloads from external source and serves through our domain
 * This is a public endpoint (no auth required) so Instagram can fetch images
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const src = url.searchParams.get('src')

    // Validate src parameter
    if (!src || src.trim().length === 0) {
      return NextResponse.json({ error: 'Missing src parameter' }, { status: 400 })
    }

    // Only allow http/https URLs
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid URL: must start with http:// or https://' },
        { status: 400 }
      )
    }

    console.log('[INSTAGRAM IMAGE PROXY] Fetching image from:', src)

    // Fetch the image from the source
    const imageResponse = await fetch(src, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    if (!imageResponse.ok) {
      console.error(
        '[INSTAGRAM IMAGE PROXY] Failed to fetch image:',
        imageResponse.status,
        imageResponse.statusText
      )
      return NextResponse.json(
        { error: 'Failed to fetch source image', status: imageResponse.status },
        { status: 502 }
      )
    }

    // Get content type from response
    const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg'

    // Validate it's actually an image
    if (!contentType.startsWith('image/')) {
      console.error('[INSTAGRAM IMAGE PROXY] Response is not an image:', contentType)
      return NextResponse.json(
        { error: 'Source URL does not return an image', contentType },
        { status: 400 }
      )
    }

    // Read the image as ArrayBuffer
    const imageBuffer = await imageResponse.arrayBuffer()

    if (!imageBuffer || imageBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Image is empty' }, { status: 502 })
    }

    console.log(
      `[INSTAGRAM IMAGE PROXY] Successfully proxied image: ${imageBuffer.byteLength} bytes, ${contentType}`
    )

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('[INSTAGRAM IMAGE PROXY] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Failed to proxy image',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

