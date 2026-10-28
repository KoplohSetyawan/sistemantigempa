#!/usr/bin/env node
/**
 * Script: Switch Prisma provider antara SQLite dan PostgreSQL
 *
 * Usage:
 *   node scripts/sync-schema.mjs sqlite      → pakai SQLite (development)
 *   node scripts/sync-schema.mjs postgres    → pakai PostgreSQL (Neon/Vercel)
 *   node scripts/sync-schema.mjs auto        → auto-detect dari DATABASE_URL
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')

function readSchema() {
  return fs.readFileSync(schemaPath, 'utf8')
}

function writeSchema(content) {
  fs.writeFileSync(schemaPath, content, 'utf8')
}

function setProvider(provider) {
  const schema = readSchema()
  const updated = schema.replace(
    /(datasource db \{[\s\S]*?provider\s*=\s*")\w+(")/m,
    `$1${provider}$2`
  )
  writeSchema(updated)
  console.log(`✅ Provider diubah ke: ${provider}`)
}

function getCurrentProvider() {
  const schema = readSchema()
  const match = schema.match(/provider\s*=\s*"(\w+)"/)
  return match ? match[1] : 'unknown'
}

function autoDetect() {
  const url = process.env.DATABASE_URL || ''
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    return 'postgresql'
  }
  return 'sqlite'
}

// Main
const command = process.argv[2] || 'auto'
const current = getCurrentProvider()

if (command === 'sqlite') {
  setProvider('sqlite')
} else if (command === 'postgres' || command === 'postgresql') {
  setProvider('postgresql')
} else if (command === 'auto') {
  const detected = autoDetect()
  if (detected !== current) {
    console.log(`🔄 Auto-detect: ${detected} (current: ${current})`)
    setProvider(detected)
  } else {
    console.log(`✅ Provider sudah benar: ${current}`)
  }
} else {
  console.log('Usage: node scripts/sync-schema.mjs [sqlite|postgres|auto]')
  console.log(`Current provider: ${current}`)
  process.exit(1)
}

console.log(`Current: ${getCurrentProvider()}`)
