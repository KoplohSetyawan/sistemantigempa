/**
 * 🔗 DATABASE — KONEKSI OTOMATIS
 * ===============================
 *
 * File ini otomatis pilih database:
 * - Neon PostgreSQL (untuk Vercel/production)
 * - SQLite (untuk development lokal)
 *
 * Tidak perlu edit apa-apa. Set DATABASE_URL di Vercel = jadi!
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

// Deteksi tipe database
const DATABASE_URL = process.env.DATABASE_URL || ''
const isNeon = DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://')
const isSQLite = DATABASE_URL.startsWith('file:')

const DB_FILE = path.join(process.cwd(), 'db', 'custom.db')

/**
 * AUTO-HEAL untuk SQLite (development lokal)
 * Neon tidak perlu ini karena managed oleh Neon
 */
function ensureSQLiteReady() {
  if (!isSQLite) return

  // Buat folder db jika belum ada
  const dbDir = path.dirname(DB_FILE)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Buat file database jika belum ada
  let needPush = false
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, Buffer.alloc(0))
    needPush = true
  } else {
    // Cek apakah schema sudah di-push
    const stats = fs.statSync(DB_FILE)
    if (stats.size < 1000) {
      needPush = true
    }
  }

  // Auto-push schema jika perlu
  if (needPush) {
    try {
      console.log('🔧 [DB] Setup database...')
      execSync('npx prisma db push --accept-data-loss --skip-generate', {
        stdio: 'pipe',
        timeout: 30000,
        env: process.env,
      })
      console.log('✅ [DB] Database siap')
    } catch (e) {
      console.warn('⚠️ [DB] Gagal setup:', e)
    }
  }
}

/**
 * Buat Prisma Client
 */
function createPrismaClient(): PrismaClient | null {
  try {
    if (isSQLite) {
      ensureSQLiteReady()
    }

    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
    })

    if (isNeon) {
      console.log('✅ [NEON] Prisma Client siap (PostgreSQL)')
    } else {
      console.log('✅ [DB] Prisma Client siap (SQLite)')
    }

    return client
  } catch (e) {
    console.error('❌ [DB] Gagal buat Prisma Client:', e)
    return null
  }
}

// === GLOBAL SINGLETON ===
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null }

let db: PrismaClient | null

if (globalForPrisma.prisma) {
  db = globalForPrisma.prisma
} else {
  db = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = db
  }
}

/**
 * Cek database siap atau tidak
 * Auto-recover jika bermasalah
 */
export async function isDbReady(): Promise<boolean> {
  if (!db) return false

  try {
    await db.news.count()
    return true
  } catch {
    // Coba recover
    console.log('🔧 [DB] Recovery...')
    try {
      globalForPrisma.prisma = null
      db = createPrismaClient()
      globalForPrisma.prisma = db
      if (!db) return false
      await db.news.count()
      return true
    } catch {
      return false
    }
  }
}

export { db }
