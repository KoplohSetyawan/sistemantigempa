import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/auth'

/**
 * POST /api/auth/logout
 */
export async function POST() {
  await clearAdminSession()
  return NextResponse.json({ success: true, message: 'Logout berhasil' })
}
