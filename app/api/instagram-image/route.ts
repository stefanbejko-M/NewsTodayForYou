import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs' // Use Node.js runtime for sharp
export const dynamic = 'force-dynamic' // Ensure this route is dynamic

/**
 * GET /api/instagram-image
 * Proxy images for Instagram - downloads from external source, processes with sharp, and serves through our domain
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
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
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

    // Read the image as ArrayBuffer
    const arrayBuffer = await imageResponse.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Image is empty' }, { status: 502 })
    }

    // Process the image with sharp: resize and convert to JPEG
    // Instagram requirements: max 1080px, JPEG format, reasonable file size
    try {
      const processedBuffer = await sharp(inputBuffer)
        .resize({
          width: 1080,
          height: 1080,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      console.log(
        `[INSTAGRAM IMAGE PROXY] Successfully processed image: ${processedBuffer.byteLength} bytes (original: ${inputBuffer.byteLength} bytes)`
      )

      // Return the processed image as JPEG (Buffer is compatible with NextResponse)
      return new NextResponse(new Uint8Array(processedBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          'Content-Length': processedBuffer.byteLength.toString(),
          'Access-Control-Allow-Origin': '*', // Allow Instagram to fetch
        },
      })
    } catch (sharpError) {
      // If sharp fails (e.g., corrupted image), return a 502 error
      console.error('[INSTAGRAM IMAGE PROXY] Sharp processing error:', sharpError)
      return NextResponse.json(
        { error: 'Failed to process image for Instagram' },
        { status: 502 }
      )
    }
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
