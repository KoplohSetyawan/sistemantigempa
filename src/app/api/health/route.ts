import { NextResponse } from 'next/server'
import { db, isDbReady } from '@/lib/db'
import { isAdminAuthenticated } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/health
 * Health check: status database, file system, auth
 */
export async function GET() {
  const dbFile = path.join(process.cwd(), 'db', 'custom.db')
  const dbExists = fs.existsSync(dbFile)
  const dbSize = dbExists ? fs.statSync(dbFile).size : 0

  const dbReady = await isDbReady()
  let newsCount = 0
  if (dbReady && db) {
    try {
      newsCount = await db.news.count()
    } catch {
      // ignore
    }
  }

  const isAdmin = await isAdminAuthenticated()

  return NextResponse.json({
    success: true,
    status: dbReady ? 'healthy' : 'recovering',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        ready: dbReady,
        fileExists: dbExists,
        fileSize: dbSize,
        path: dbFile,
        newsCount,
      },
      auth: {
        adminLoggedIn: isAdmin,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDbUrl: !!process.env.DATABASE_URL,
        hasAdminUser: !!process.env.ADMIN_USERNAME,
      },
    },
  })
}
