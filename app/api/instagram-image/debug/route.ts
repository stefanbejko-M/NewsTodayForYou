import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Check if buffer starts with common image signatures
 */
function detectImageSignature(buffer: Buffer): boolean {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true
  
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true
  
  // WebP: RIFF...WEBP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true
  
  // AVIF: ftyp...avif
  if (buffer.toString('ascii', 4, 8) === 'ftyp' && buffer.toString('ascii', 8, 12).includes('avif')) return true
  
  return false
}

/**
 * Convert buffer to hex string
 */
function bufferToHex(buffer: Buffer, length: number = 32): string {
  return Array.from(buffer.slice(0, length))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
}

/**
 * GET /api/instagram-image/debug
 * Debug endpoint to validate and analyze images for Instagram compatibility
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const src = url.searchParams.get('src')

    if (!src || src.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing src parameter' },
        { status: 400 }
      )
    }

    // Validate URL
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid URL: must start with http:// or https://' },
        { status: 400 }
      )
    }

    console.log('[INSTAGRAM DEBUG] Analyzing image:', src)

    // Fetch with browser-like headers
    const fetchResponse = await fetch(src, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000), // 15 seconds timeout
    })

    const finalUrl = fetchResponse.url
    const status = fetchResponse.status
    const statusText = fetchResponse.statusText

    // Extract response headers
    const contentType = fetchResponse.headers.get('content-type') || ''
    const contentLength = fetchResponse.headers.get('content-length') || ''
    const cacheControl = fetchResponse.headers.get('cache-control') || ''

    // Read first bytes for signature detection
    const arrayBuffer = await fetchResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (!fetchResponse.ok) {
      const firstBytes = buffer.slice(0, 32)
      return NextResponse.json(
        {
          src,
          finalUrl,
          status,
          statusText,
          headers: {
            'content-type': contentType,
            'content-length': contentLength,
            'cache-control': cacheControl,
          },
          firstBytesSignature: bufferToHex(firstBytes),
          detectedIsImage: false,
          error: `Upstream returned ${status} ${statusText}`,
          okForIG: false,
        },
        { status: 422 }
      )
    }

    // Check if empty
    if (buffer.length === 0) {
      return NextResponse.json(
        {
          src,
          finalUrl,
          status,
          statusText,
          headers: {
            'content-type': contentType,
            'content-length': contentLength,
            'cache-control': cacheControl,
          },
          firstBytesSignature: '',
          detectedIsImage: false,
          error: 'Image is empty',
          okForIG: false,
        },
        { status: 422 }
      )
    }

    // Detect if it's an image
    const firstBytes = buffer.slice(0, 32)
    const firstBytesHex = bufferToHex(firstBytes)
    const contentTypeIsImage = contentType.startsWith('image/')
    const signatureIsImage = detectImageSignature(buffer)
    const detectedIsImage = contentTypeIsImage || signatureIsImage

    if (!detectedIsImage) {
      // Try to detect what it actually is
      const textStart = buffer.toString('utf-8', 0, 100).toLowerCase()
      let detectedType = 'unknown'
      if (textStart.includes('<html') || textStart.includes('<!doctype')) {
        detectedType = 'HTML'
      } else if (textStart.includes('%pdf')) {
        detectedType = 'PDF'
      } else if (textStart.includes('<?xml')) {
        detectedType = 'XML'
      }

      return NextResponse.json(
        {
          src,
          finalUrl,
          status,
          statusText,
          headers: {
            'content-type': contentType,
            'content-length': contentLength,
            'cache-control': cacheControl,
          },
          firstBytesSignature: firstBytesHex,
          detectedIsImage: false,
          detectedType,
          error: `Upstream returned ${detectedType || 'non-image'} content (Content-Type: ${contentType})`,
          okForIG: false,
        },
        { status: 422 }
      )
    }

    // It's an image - process with sharp
    try {
      // Get original metadata
      const metadata = await sharp(buffer).metadata()
      const originalFormat = metadata.format || 'unknown'
      const originalWidth = metadata.width || 0
      const originalHeight = metadata.height || 0
      const originalBytes = buffer.length

      // Process image: resize and convert to JPEG
      const processedBuffer = await sharp(buffer)
        .resize({
          width: 1080,
          height: 1080,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      // Get processed metadata
      const processedMetadata = await sharp(processedBuffer).metadata()
      const processedWidth = processedMetadata.width || 0
      const processedHeight = processedMetadata.height || 0
      const processedBytes = processedBuffer.length

      // Check Instagram requirements
      const minDimension = Math.min(processedWidth, processedHeight)
      const maxDimension = Math.max(processedWidth, processedHeight)
      const tooSmall = minDimension < 320
      const tooLarge = maxDimension > 1080 || processedBytes > 8 * 1024 * 1024 // 8MB
      const okForIG = !tooSmall && !tooLarge

      return NextResponse.json({
        src,
        finalUrl,
        status,
        statusText,
        headers: {
          'content-type': contentType,
          'content-length': contentLength,
          'cache-control': cacheControl,
        },
        firstBytesSignature: firstBytesHex,
        detectedIsImage: true,
        original: {
          format: originalFormat,
          width: originalWidth,
          height: originalHeight,
          bytes: originalBytes,
        },
        output: {
          format: 'jpeg',
          width: processedWidth,
          height: processedHeight,
          bytes: processedBytes,
        },
        checks: {
          tooSmall,
          tooLarge,
          okForIG,
        },
        okForIG,
      })
    } catch (sharpError) {
      const errorMessage = sharpError instanceof Error ? sharpError.message : String(sharpError)
      console.error('[INSTAGRAM DEBUG] Sharp processing error:', sharpError)

      return NextResponse.json(
        {
          src,
          finalUrl,
          status,
          statusText,
          headers: {
            'content-type': contentType,
            'content-length': contentLength,
            'cache-control': cacheControl,
          },
          firstBytesSignature: firstBytesHex,
          detectedIsImage: true, // Content-type says image, but sharp failed
          error: `Failed to process image: ${errorMessage}`,
          okForIG: false,
        },
        { status: 422 }
      )
    }
  } catch (error) {
    console.error('[INSTAGRAM DEBUG] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

