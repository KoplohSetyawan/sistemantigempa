/**
 * 🗄️ DATABASE CONFIGURATION — Auto-switch SQLite / Neon PostgreSQL
 *
 * File ini otomatis mendeteksi database yang digunakan:
 * - Jika DATABASE_URL dimulai dengan "postgresql://" → pakai Neon (untuk Vercel/production)
 * - Jika DATABASE_URL dimulai dengan "file:" → pakai SQLite (untuk development lokal)
 *
 * CARA PAKAI:
 *
 * 1️⃣ DEVELOPMENT LOKAL (SQLite):
 *    File .env:
 *    DATABASE_URL=file:./db/custom.db
 *
 * 2️⃣ PRODUCTION VERCEL (Neon PostgreSQL):
 *    Set Environment Variable di Vercel:
 *    DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
 *
 * Sistem akan otomatis pilih provider yang sesuai.
 */

import { PrismaClient, Prisma } from '@prisma/client'

export type DatabaseProvider = 'sqlite' | 'postgresql'

/**
 * Deteksi provider database dari DATABASE_URL
 */
export function getDatabaseProvider(): DatabaseProvider {
  const url = process.env.DATABASE_URL || ''
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    return 'postgresql'
  }
  return 'sqlite' // default: file:./db/custom.db
}

/**
 * Info database yang sedang aktif
 */
export const DB_INFO = {
  provider: getDatabaseProvider(),
  url: process.env.DATABASE_URL || 'file:./db/custom.db',
  isNeon: getDatabaseProvider() === 'postgresql',
  isSQLite: getDatabaseProvider() === 'sqlite',
}

/**
 * Validasi konfigurasi database
 */
export function validateDatabaseConfig(): { valid: boolean; message: string } {
  const url = process.env.DATABASE_URL

  if (!url) {
    return {
      valid: false,
      message: 'DATABASE_URL belum diset. Untuk lokal: file:./db/custom.db. Untuk Vercel: postgresql://... (Neon)',
    }
  }

  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    if (!url.includes('sslmode=require') && !url.includes('sslmode=no-verify')) {
      return {
        valid: false,
        message: 'Neon PostgreSQL: tambahkan ?sslmode=require di akhir DATABASE_URL',
      }
    }
    return { valid: true, message: 'Neon PostgreSQL terdeteksi (production mode)' }
  }

  if (url.startsWith('file:')) {
    return { valid: true, message: 'SQLite terdeteksi (development mode)' }
  }

  return {
    valid: false,
    message: 'DATABASE_URL tidak valid. Gunakan format file:./db/custom.db atau postgresql://...',
  }
}

/**
 * Export Prisma types untuk reuse
 */
export { PrismaClient, Prisma }
export { DB_INFO as default }
