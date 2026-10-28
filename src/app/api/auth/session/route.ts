import { NextResponse } from 'next/server'
import { isAdminAuthenticated, getAdminUser } from '@/lib/auth'

/**
 * GET /api/auth/session
 * Cek status login admin
 */
export async function GET() {
  const authenticated = await isAdminAuthenticated()
  const username = await getAdminUser()

  return NextResponse.json({
    success: true,
    authenticated,
    user: authenticated ? { username } : null,
  })
}
