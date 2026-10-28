/**
 * 🔗 NEON DATABASE — KONEKSI GAMPANG
 * ==================================
 *
 * File ini kaitkan program ke database Neon.
 * Tinggal set DATABASE_URL di Vercel = connection string Neon.
 *
 * CARA PAKAI (3 langkah):
 * 1. Dapat connection string dari https://neon.tech
 * 2. Set di Vercel → Settings → Environment Variables:
 *    Key:   DATABASE_URL
 *    Value: postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require
 * 3. Deploy! Sistem otomatis koneksi ke Neon.
 *
 * GAMPANG KAN? 😊
 */

import { PrismaClient } from '@prisma/client'

// Ambil DATABASE_URL dari environment
const DATABASE_URL = process.env.DATABASE_URL || ''

// Deteksi: Neon atau SQLite?
const isNeon = DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://')

// Info database (untuk debugging)
export const dbInfo = {
  type: isNeon ? 'Neon PostgreSQL' : 'SQLite',
  isNeon,
  isConnected: !!DATABASE_URL,
}

// Log saat startup
if (isNeon) {
  console.log('✅ [NEON] Terhubung ke Neon PostgreSQL')
} else if (DATABASE_URL.startsWith('file:')) {
  console.log('✅ [DB] Menggunakan SQLite (lokal)')
} else {
  console.log('⚠️ [DB] DATABASE_URL belum diset')
}

// Buat Prisma Client (otomatis pakai Neon atau SQLite)
let prisma: PrismaClient | null = null

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
  })
} catch (error) {
  console.error('❌ [DB] Gagal koneksi:', error)
  prisma = null
}

// Export untuk dipakai di API routes
export const db = prisma

/**
 * Cek database siap atau tidak
 */
export async function isDbReady(): Promise<boolean> {
  if (!db) return false
  try {
    await db.news.count()
    return true
  } catch {
    return false
  }
}
