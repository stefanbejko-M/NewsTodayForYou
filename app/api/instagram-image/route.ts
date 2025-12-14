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

    // Fetch the image from the source with redirect following
    const imageResponse = await fetch(src, {
      method: 'GET',
      redirect: 'follow', // Follow redirects
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000), // 15 seconds timeout
    })

    if (!imageResponse.ok) {
      console.error(
        '[INSTAGRAM IMAGE PROXY] Failed to fetch image:',
        imageResponse.status,
        imageResponse.statusText,
        'URL:',
        src
      )
      return NextResponse.json(
        { error: 'Failed to fetch source image', status: imageResponse.status, statusText: imageResponse.statusText },
        { status: 502 }
      )
    }

    // Check Content-Type from upstream
    const upstreamContentType = imageResponse.headers.get('content-type') || ''
    console.log('[INSTAGRAM IMAGE PROXY] Upstream Content-Type:', upstreamContentType)
    
    if (!upstreamContentType.startsWith('image/')) {
      console.error(
        '[INSTAGRAM IMAGE PROXY] Upstream returned non-image Content-Type:',
        upstreamContentType,
        'URL:',
        src
      )
      return NextResponse.json(
        { error: 'Source URL does not return an image', contentType: upstreamContentType },
        { status: 422 }
      )
    }

    // Read the image as ArrayBuffer
    const arrayBuffer = await imageResponse.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.error('[INSTAGRAM IMAGE PROXY] Image is empty, URL:', src)
      return NextResponse.json({ error: 'Image is empty' }, { status: 502 })
    }

    // Check file size (Instagram has ~8MB limit, but we'll be more conservative)
    const maxSizeBytes = 8 * 1024 * 1024 // 8MB
    if (inputBuffer.byteLength > maxSizeBytes) {
      console.warn(
        '[INSTAGRAM IMAGE PROXY] Image is large:',
        inputBuffer.byteLength,
        'bytes, will resize'
      )
    }

    // Process the image with sharp: resize and convert to JPEG
    // Instagram requirements:
    // - MIN 320px on smallest side
    // - MAX 1080px on largest side
    // - JPEG format
    // - Reasonable file size
    try {
      // Get image metadata first to check dimensions
      const metadata = await sharp(inputBuffer).metadata()
      console.log('[INSTAGRAM IMAGE PROXY] Original image metadata:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: inputBuffer.byteLength,
      })

      // Resize to fit Instagram requirements
      // fit: 'inside' ensures we maintain aspect ratio and fit within bounds
      // withoutEnlargement: true prevents upscaling small images
      const processedBuffer = await sharp(inputBuffer)
        .resize({
          width: 1080,
          height: 1080,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      // Verify final dimensions meet Instagram minimum (320px on smallest side)
      const finalMetadata = await sharp(processedBuffer).metadata()
      const minDimension = Math.min(finalMetadata.width || 0, finalMetadata.height || 0)
      
      if (minDimension < 320) {
        console.warn(
          '[INSTAGRAM IMAGE PROXY] Processed image is too small:',
          finalMetadata.width,
          'x',
          finalMetadata.height,
          'Minimum required: 320px on smallest side'
        )
        // Still return it, but log the warning - Instagram will reject if it's too small
      }

      console.log(
        `[INSTAGRAM IMAGE PROXY] Successfully processed image: ${processedBuffer.byteLength} bytes (original: ${inputBuffer.byteLength} bytes), dimensions: ${finalMetadata.width}x${finalMetadata.height}`
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
      // If sharp fails (e.g., corrupted image, unsupported format), return a 502 error
      console.error('[INSTAGRAM IMAGE PROXY] Sharp processing error:', sharpError)
      console.error('[INSTAGRAM IMAGE PROXY] Error details:', {
        message: sharpError instanceof Error ? sharpError.message : String(sharpError),
        stack: sharpError instanceof Error ? sharpError.stack : undefined,
        sourceUrl: src,
        upstreamContentType: upstreamContentType || 'unknown',
      })
      return NextResponse.json(
        { error: 'Failed to process image for Instagram', details: sharpError instanceof Error ? sharpError.message : String(sharpError) },
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
