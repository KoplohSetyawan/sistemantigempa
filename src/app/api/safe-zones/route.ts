import { NextResponse } from 'next/server'
import { fetchLatestBMKG, fetchUSGS, syncEarthquakeToDB, type EarthquakeData } from '@/lib/earthquake'
import { findSafeZones, generateAISafetyAdvice, getImpactZones, type SafeZoneResult } from '@/lib/safe-zones'

/**
 * POST /api/safe-zones
 * Body: { earthquake?: EarthquakeData }
 * Jika tidak ada body, gunakan gempa terbaru
 * Return: zona aman + rekomendasi AI + zona dampak
 */
export async function POST(request: Request) {
  try {
    let earthquake: EarthquakeData | null = null

    try {
      const body = await request.json()
      if (body?.earthquake) {
        earthquake = body.earthquake as EarthquakeData
      }
    } catch {
      // Body kosong, ambil gempa terbaru
    }

    if (!earthquake) {
      earthquake = await fetchLatestBMKG()
      if (!earthquake) {
        const usgs = await fetchUSGS()
        if (usgs.length > 0) earthquake = usgs[0]
      }
    }

    if (!earthquake) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada data gempa tersedia', data: null },
        { status: 503 }
      )
    }

    // Simpan ke DB
    await syncEarthquakeToDB(earthquake).catch(() => {})

    // Cari zona aman
    const safeZones: SafeZoneResult[] = findSafeZones(earthquake, 8)

    // Generate AI advice (timeout 15 detik)
    const aiAdvicePromise = generateAISafetyAdvice(earthquake, safeZones)
    const aiAdvice = await Promise.race([
      aiAdvicePromise,
      new Promise<string>((resolve) => setTimeout(() => resolve(''), 15000)),
    ])

    // Zona dampak untuk visualisasi peta
    const impactZones = getImpactZones(earthquake)

    return NextResponse.json({
      success: true,
      data: {
        earthquake,
        safeZones,
        impactZones,
        aiAdvice,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Safe zones API error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal mencari zona aman', data: null },
      { status: 500 }
    )
  }
}

/**
 * GET /api/safe-zones
 * Ambil gempa terbaru & zona aman
 */
export async function GET() {
  return POST(new Request('http://localhost/api/safe-zones', { method: 'POST' }))
}
