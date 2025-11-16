import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') || ''

  const ALLOWED_BOTS = ['Googlebot', 'AdsBot-Google', 'Mediapartners-Google', 'bingbot', 'Applebot']
  const BLOCKED_PATTERNS = [
    'AhrefsBot',
    'SemrushBot',
    'MJ12bot',
    'DotBot',
    'Scrapy',
    'curl/',
    'python-requests',
    'HttpClient',
    'Java/',
    'Go-http-client',
    'wget',
    'libwww-perl',
    'axios',
    'DataForSeoBot',
    'spider',
    'crawler'
  ]

  const isAllowedBot = ALLOWED_BOTS.some(token => ua.includes(token))
  const looksLikeGenericBot = /bot|crawler|spider|scrape|crawl/i.test(ua)
  const matchesBlockedPattern = BLOCKED_PATTERNS.some(token => ua.includes(token))

  if (!isAllowedBot && (looksLikeGenericBot || matchesBlockedPattern)) {
    return new NextResponse('Blocked', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}

