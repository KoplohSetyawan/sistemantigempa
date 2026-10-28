import { NextResponse } from 'next/server'
import { db, isDbReady } from '@/lib/db'
import { isAdminAuthenticated } from '@/lib/auth'

export interface NewsItem {
  id: string
  type: string
  title: string
  content: string | null
  youtubeId: string | null
  youtubeUrl: string | null
  imageUrl: string | null
  category: string
  author: string
  isPublished: boolean
  pinned: boolean
  createdAt: string
  updatedAt: string
}

/**
 * GET /api/news
 * Public: ambil daftar berita yang sudah dipublikasi
 * Query: ?type=youtube|press_release&category=gempa&limit=20
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // youtube | press_release
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const adminView = searchParams.get('admin') === 'true'

    // Jika admin view, tampilkan semua (termasuk draft)
    const isAdmin = adminView ? await isAdminAuthenticated() : false

    // Auto-heal: cek & recover DB jika bermasalah
    const dbReady = await isDbReady()
    if (!dbReady || !db) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Database sedang recovery, coba lagi sebentar',
      })
    }

    // Build where clause
    const where: Record<string, unknown> = {}
    if (!isAdmin) where.isPublished = true
    if (type) where.type = type
    if (category && category !== 'all') where.category = category

    const news = await db.news.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })

    const data: NewsItem[] = news.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }))

    return NextResponse.json({ success: true, data, count: data.length })
  } catch (e) {
    console.error('News GET error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil berita', data: [] },
      { status: 500 }
    )
  }
}

/**
 * POST /api/news
 * Admin only: buat berita baru
 */
export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminAuthenticated()
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 403 }
      )
    }

    // Auto-heal: cek & recover DB jika bermasalah
    const dbReady = await isDbReady()
    if (!dbReady || !db) {
      return NextResponse.json(
        { success: false, error: 'Database sedang recovery. Tunggu sebentar lalu coba lagi.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { type, title, content, youtubeUrl, imageUrl, category, isPublished, pinned } = body

    // Validasi
    if (!type || !title) {
      return NextResponse.json(
        { success: false, error: 'Type dan title wajib diisi' },
        { status: 400 }
      )
    }

    if (type !== 'youtube' && type !== 'press_release') {
      return NextResponse.json(
        { success: false, error: 'Type harus "youtube" atau "press_release"' },
        { status: 400 }
      )
    }

    if (type === 'youtube' && !youtubeUrl) {
      return NextResponse.json(
        { success: false, error: 'URL YouTube wajib diisi untuk berita tipe YouTube' },
        { status: 400 }
      )
    }

    if (type === 'press_release' && !content) {
      return NextResponse.json(
        { success: false, error: 'Konten wajib diisi untuk siaran pers' },
        { status: 400 }
      )
    }

    // Extract YouTube ID dari URL
    let youtubeId: string | null = null
    if (youtubeUrl) {
      const match = youtubeUrl.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
      )
      youtubeId = match ? match[1] : null
    }

    // Auto thumbnail dari YouTube jika tidak ada imageUrl
    let finalImageUrl = imageUrl || null
    if (!finalImageUrl && youtubeId) {
      finalImageUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    }

    const { getAdminUser } = await import('@/lib/auth')
    const authorName = (await getAdminUser()) || 'Admin PS-212'

    const news = await db.news.create({
      data: {
        type,
        title: title.trim(),
        content: content?.trim() || null,
        youtubeId,
        youtubeUrl: youtubeUrl || null,
        imageUrl: finalImageUrl,
        category: category || 'gempa',
        author: authorName,
        isPublished: isPublished !== false,
        pinned: pinned === true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Berita berhasil dibuat',
      data: {
        ...news,
        createdAt: news.createdAt.toISOString(),
        updatedAt: news.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('News POST error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal membuat berita' },
      { status: 500 }
    )
  }
}
