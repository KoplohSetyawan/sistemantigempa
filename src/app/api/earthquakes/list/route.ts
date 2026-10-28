import { NextResponse } from 'next/server'
import { fetchRecentBMKG, fetchFeltBMKG, fetchUSGS, syncEarthquakeToDB, type EarthquakeData } from '@/lib/earthquake'

/**
 * GET /api/earthquakes/list
 * Ambil daftar gempa terkini (gabungan BMKG + USGS)
 * Query params: ?type=recent|felt|all
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'recent'

    let earthquakes: EarthquakeData[] = []

    if (type === 'felt') {
      earthquakes = await fetchFeltBMKG()
    } else if (type === 'recent') {
      earthquakes = await fetchRecentBMKG()
    } else {
      // all: gabungan
      const [recent, felt, usgs] = await Promise.all([
        fetchRecentBMKG(),
        fetchFeltBMKG(),
        fetchUSGS(),
      ])
      const merged = [...recent, ...felt, ...usgs]
      // Deduplikasi berdasarkan sourceId & waktu (terdekat)
      const seen = new Set<string>()
      earthquakes = merged
        .filter((eq) => {
          if (seen.has(eq.sourceId)) return false
          seen.add(eq.sourceId)
          return true
        })
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    }

    // Simpan ke DB secara async (tanpa blocking)
    Promise.all(earthquakes.map((eq) => syncEarthquakeToDB(eq).catch(() => {}))).catch(() => {})

    return NextResponse.json({
      success: true,
      data: earthquakes,
      count: earthquakes.length,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Earthquake list API error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar gempa', data: [] },
      { status: 500 }
    )
  }
}
