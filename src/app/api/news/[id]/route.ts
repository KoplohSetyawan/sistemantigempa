import { NextResponse } from 'next/server'
import { db, isDbReady } from '@/lib/db'
import { isAdminAuthenticated } from '@/lib/auth'

/**
 * PUT /api/news/[id]
 * Admin only: update berita
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: idParam } = await params
    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID tidak valid' },
        { status: 400 }
      )
    }
    const body = await request.json()
    const { type, title, content, youtubeUrl, imageUrl, category, isPublished, pinned } = body

    // Cek berita ada
    const existing = await db.news.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Berita tidak ditemukan' },
        { status: 404 }
      )
    }

    // Extract YouTube ID
    let youtubeId = existing.youtubeId
    if (youtubeUrl !== undefined) {
      const match = youtubeUrl?.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
      )
      youtubeId = match ? match[1] : null
    }

    // Auto thumbnail
    let finalImageUrl = imageUrl !== undefined ? imageUrl : existing.imageUrl
    if (!finalImageUrl && youtubeId) {
      finalImageUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    }

    const updated = await db.news.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content?.trim() || null }),
        ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null, youtubeId }),
        ...(finalImageUrl !== undefined && { imageUrl: finalImageUrl }),
        ...(category && { category }),
        ...(isPublished !== undefined && { isPublished }),
        ...(pinned !== undefined && { pinned }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Berita berhasil diperbarui',
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('News PUT error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui berita' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/news/[id]
 * Admin only: hapus berita
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: idParam } = await params
    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID tidak valid' },
        { status: 400 }
      )
    }

    await db.news.delete({ where: { id } }).catch(() => {
      // ignore if not exists
    })

    return NextResponse.json({
      success: true,
      message: 'Berita berhasil dihapus',
    })
  } catch (e) {
    console.error('News DELETE error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus berita' },
      { status: 500 }
    )
  }
}
