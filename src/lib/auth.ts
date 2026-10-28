/**
 * Library autentikasi admin sederhana berbasis cookie
 * Menggunakan signed token (base64 + secret) untuk sesi admin
 */

import { cookies } from 'next/headers'

const SESSION_COOKIE = 'ps212_admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 hari

// Kredensial admin default (bisa di-override via env)
// Di production, set ADMIN_USERNAME & ADMIN_PASSWORD di .env
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'gempa212'

// Secret untuk signing token (jangan hardcode di production!)
const SESSION_SECRET = process.env.SESSION_SECRET || 'ps-212-sistem-anti-gempa-secret-2024'

/**
 * Buat signed token sederhana (base64 payload + signature)
 */
function createToken(payload: { username: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = simpleHash(data + SESSION_SECRET)
  return `${data}.${sig}`
}

/**
 * Verifikasi token
 */
function verifyToken(token: string): { username: string; exp: number } | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    if (simpleHash(data + SESSION_SECRET) !== sig) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Hash sederhana (bukan kriptografi kuat, cukup untuk demo)
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/**
 * Verifikasi kredensial login admin
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
}

/**
 * Set session cookie (dipanggil setelah login berhasil)
 */
export async function setAdminSession(username: string) {
  const token = createToken({
    username,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Hapus session cookie (logout)
 */
export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * Cek apakah request saat ini dari admin yang sudah login
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return false
  const payload = verifyToken(token)
  return payload !== null
}

/**
 * Ambil username admin yang sedang login
 */
export async function getAdminUser(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken(token)
  return payload?.username || null
}

export { ADMIN_USERNAME }
