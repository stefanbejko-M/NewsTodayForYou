import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Check if request has valid admin session cookie
 */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get('admin_session')
    return adminSession?.value === 'authenticated'
  } catch (error) {
    console.error('[ADMIN AUTH] Error checking session:', error)
    return false
  }
}

