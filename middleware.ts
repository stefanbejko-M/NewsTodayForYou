import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const ua = req.headers.get('user-agent') || ''

  // Bot blocking logic (apply to all routes)
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

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    // Check for admin_session cookie
    const adminSession = req.cookies.get('admin_session')

    if (!adminSession || adminSession.value !== 'authenticated') {
      // Redirect to login page
      const loginUrl = new URL('/admin/login', req.url)
      // Preserve the original URL as a redirect parameter
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}


