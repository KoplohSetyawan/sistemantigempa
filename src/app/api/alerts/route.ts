import { NextResponse } from 'next/server'
import { fetchLatestBMKG, fetchRecentBMKG, getAlertLevel, type EarthquakeData } from '@/lib/earthquake'

/**
 * GET /api/alerts
 * Cek apakah ada gempa yang memerlukan alert aktif (M >= 5.0 dalam 24 jam terakhir)
 */
export async function GET() {
  try {
    const latest = await fetchLatestBMKG()
    let recent: EarthquakeData[] = []
    try {
      recent = await fetchRecentBMKG()
    } catch {}

    // Filter gempa signifikan (M >= 5.0)
    const significant = [
      ...(latest ? [latest] : []),
      ...recent,
    ].filter((eq) => eq.magnitude >= 5.0)

    // Ambil yang dalam 24 jam terakhir
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const activeAlerts = significant
      .filter((eq) => new Date(eq.dateTime).getTime() >= dayAgo)
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 5)

    const alerts = activeAlerts.map((eq) => {
      const alert = getAlertLevel(eq.magnitude)
      return {
        ...eq,
        alertLevel: alert.level,
        alertColor: alert.color,
        alertLabel: alert.label,
        message: `${alert.label} - Gempa M${eq.magnitude} ${eq.location}`,
      }
    })

    // Tentukan alert utama
    const primaryAlert = alerts[0] || null
    const hasActiveAlert = primaryAlert !== null

    return NextResponse.json({
      success: true,
      data: {
        hasActiveAlert,
        primaryAlert,
        alerts,
        lastChecked: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.error('Alerts API error:', e)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil alert', data: null },
      { status: 500 }
    )
  }
}
