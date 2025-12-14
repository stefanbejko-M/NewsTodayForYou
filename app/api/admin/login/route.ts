import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/login
 * Simple username/password login for admin panel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminUsername || !adminPassword) {
      console.warn('[ADMIN LOGIN] ADMIN_USERNAME or ADMIN_PASSWORD not configured')
      return NextResponse.json(
        { success: false, error: 'Admin authentication not configured' },
        { status: 500 }
      )
    }

    // Compare credentials
    if (username === adminUsername && password === adminPassword) {
      // Set secure cookie
      const cookieStore = await cookies()
      const isProduction = process.env.NODE_ENV === 'production'
      
      cookieStore.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('[ADMIN LOGIN] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

