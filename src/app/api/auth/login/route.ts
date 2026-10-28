import { NextResponse } from 'next/server'
import { verifyAdminCredentials, setAdminSession } from '@/lib/auth'

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password wajib diisi' },
        { status: 400 }
      )
    }

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      )
    }

    await setAdminSession(username)

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: { username },
    })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal memproses login' },
      { status: 500 }
    )
  }
}
