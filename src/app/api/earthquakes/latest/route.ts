import { NextResponse } from 'next/server'
import { fetchLatestBMKG, fetchUSGS, syncEarthquakeToDB } from '@/lib/earthquake'

/**
 * GET /api/earthquakes/latest
 * Ambil gempa terbaru dari BMKG, fallback ke USGS jika gagal
 */
export async function GET() {
  try {
    let latest = await fetchLatestBMKG()

    // Fallback ke USGS jika BMKG gagal
    if (!latest) {
      const usgsList = await fetchUSGS()
      if (usgsList.length > 0) {
        latest = usgsList[0]
      }
    }

    if (!latest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak dapat mengambil data gempa terbaru',
          data: null,
        },
        { status: 503 }
      )
    }

    // Simpan ke database untuk riwayat
    await syncEarthquakeToDB(latest).catch(() => {})

    return NextResponse.json({
      success: true,
      data: latest,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Latest earthquake API error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal memproses permintaan', data: null },
      { status: 500 }
    )
  }
}
