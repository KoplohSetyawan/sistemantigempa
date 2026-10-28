/**
 * Library untuk fetching dan memproses data gempa
 * Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) + USGS fallback
 */

export interface EarthquakeData {
  sourceId: string
  source: 'BMKG' | 'USGS'
  magnitude: number
  depth: number
  latitude: number
  longitude: number
  location: string
  description?: string
  felt: boolean
  tsunamiRisk: boolean
  dateTime: string // ISO string
}

export interface BMKGEarthquake {
  Infogempa: {
    gempa: Array<{
      Tanggal: string
      Jam: string
      DateTime: string
      Coordinates: string // "lat,lon"
      Lintang: string
      Bujur: string
      Magnitude: string
      Kedalaman: string
      Wilayah: string
      Potensi: string
      Dirasakan?: string
    }>
  }
}

export interface USGSEarthquake {
  type: 'FeatureCollection'
  features: Array<{
    id: string
    properties: {
      mag: number
      place: string
      time: number
      tsunami: boolean
      title: string
    }
    geometry: {
      type: 'Point'
      coordinates: [number, number, number] // [lon, lat, depth]
    }
  }>
}

/**
 * Fetch gempa terbaru dari BMKG
 */
export async function fetchLatestBMKG(): Promise<EarthquakeData | null> {
  try {
    const res = await fetch('https://data.bmkg.go.id/autogempa.xml', {
      headers: { 'Accept': 'application/xml, text/xml' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const xml = await res.text()

    // Parse XML sederhana
    const get = (tag: string): string => {
      const m = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's'))
      return m ? m[1].trim() : ''
    }

    const coords = get('Coordinates')
    const [lat, lon] = coords.split(',').map((s) => parseFloat(s.trim()))

    if (isNaN(lat) || isNaN(lon)) return null

    const magnitude = parseFloat(get('Magnitude'))
    const depthStr = get('Kedalaman')
    const depth = parseFloat(depthStr.replace(/[^\d.]/g, ''))
    const potensi = get('Potensi').toLowerCase()
    const dirasakan = get('Dirasakan')

    return {
      sourceId: `bmkg-${get('DateTime')}`,
      source: 'BMKG',
      magnitude,
      depth,
      latitude: lat,
      longitude: lon,
      location: get('Wilayah') || 'Indonesia',
      description: get('Potensi'),
      felt: !!dirasakan,
      tsunamiRisk: potensi.includes('tsunami'),
      dateTime: get('DateTime'),
    }
  } catch (e) {
    console.error('BMKG fetch error:', e)
    return null
  }
}

/**
 * Fetch daftar gempa terkini dari BMKG (M >= 5.0)
 */
export async function fetchRecentBMKG(): Promise<EarthquakeData[]> {
  try {
    const res = await fetch('https://data.bmkg.go.id/gempaterkini.json', {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data: BMKGEarthquake = await res.json()

    return (data.Infogempa?.gempa || []).map((g) => {
      const [lat, lon] = g.Coordinates.split(',').map((s) => parseFloat(s.trim()))
      const potensi = (g.Potensi || '').toLowerCase()
      return {
        sourceId: `bmkg-${g.DateTime}`,
        source: 'BMKG' as const,
        magnitude: parseFloat(g.Magnitude),
        depth: parseFloat(g.Kedalaman.replace(/[^\d.]/g, '')),
        latitude: lat,
        longitude: lon,
        location: g.Wilayah,
        description: g.Potensi,
        felt: false,
        tsunamiRisk: potensi.includes('tsunami'),
        dateTime: g.DateTime,
      }
    })
  } catch (e) {
    console.error('BMKG recent fetch error:', e)
    return []
  }
}

/**
 * Fetch gempa yang dirasakan dari BMKG
 */
export async function fetchFeltBMKG(): Promise<EarthquakeData[]> {
  try {
    const res = await fetch('https://data.bmkg.go.id/gempadirasakan.json', {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data: BMKGEarthquake = await res.json()

    return (data.Infogempa?.gempa || []).map((g) => {
      const [lat, lon] = g.Coordinates.split(',').map((s) => parseFloat(s.trim()))
      const potensi = (g.Potensi || '').toLowerCase()
      return {
        sourceId: `bmkg-${g.DateTime}`,
        source: 'BMKG' as const,
        magnitude: parseFloat(g.Magnitude),
        depth: parseFloat(g.Kedalaman.replace(/[^\d.]/g, '')),
        latitude: lat,
        longitude: lon,
        location: g.Wilayah,
        description: g.Dirasakan || g.Potensi,
        felt: true,
        tsunamiRisk: potensi.includes('tsunami'),
        dateTime: g.DateTime,
      }
    })
  } catch (e) {
    console.error('BMKG felt fetch error:', e)
    return []
  }
}

/**
 * Cek apakah koordinat berada dalam wilayah Indonesia
 * Menggunakan bounding box yang meliputi seluruh teritorial Indonesia:
 * - Dari Sabang (6°N, 95°E) sampai Merauke (8°S, 141°E)
 * - Termasuk perairan ZEE Indonesia
 */
export function isInIndonesia(lat: number, lon: number, place?: string): boolean {
  // Cek berdasarkan nama tempat terlebih dahulu (paling akurat untuk USGS)
  if (place) {
    const p = place.toLowerCase()
    // Daftar negara tetangga yang BUKAN Indonesia - harus dikecualikan
    const nonIndonesia = [
      'philippines', 'filipina',
      'malaysia', 'malay',
      'papua new guinea', 'png',
      'micronesia',
      'timor-leste', 'timor leste', 'east timor',
      'brunei',
      'singapore', 'singapura',
      'thailand', 'siam',
      'vietnam',
      'china', 'taiwan',
      'palau',
      'solomon',
      'australia',
      'india', 'andaman', 'nicobar',
    ]
    if (nonIndonesia.some((c) => p.includes(c))) {
      return false
    }
    // Jika nama tempat eksplisit menyebut Indonesia, pasti masuk
    if (p.includes('indonesia') || p.includes('sumatra') || p.includes('sumatera') ||
        p.includes('java') || p.includes('jawa') || p.includes('bali') ||
        p.includes('kalimantan') || p.includes('borneo') ||
        p.includes('sulawesi') || p.includes('celebes') ||
        p.includes('papua') || p.includes('maluku') ||
        p.includes('nusa tenggara') || p.includes('lesser sunda') ||
        p.includes(' banda sea') || p.includes('flores sea') ||
        p.includes('celebes sea') || p.includes('java sea') ||
        p.includes('sulu sea') || p.includes('molucca') ||
        p.includes('mentawai') || p.includes('enggano') ||
        p.includes('sumba') || p.includes('flores') || p.includes('timor') ||
        p.includes('seram') || p.includes('halmahera') || p.includes('buru')) {
      return true
    }
  }

  // Bounding box teritorial Indonesia (inklusif ZEE)
  // Dipersempit untuk mengexclude Filipina, PNG, Micronesia
  // Wilayah Indonesia: 6°N - 11°S, 95°E - 141°E
  if (lat < 6.5 && lat > -11.5 && lon > 94.5 && lon < 141.5) {
    // Exclude area Laut Sulu/Filipina (utara Kalimantan/Sulawesi)
    // Laut Sulu: lat > 6, lon < 122 → wilayah Filipina
    if (lat > 6 && lon < 122) return false
    // Exclude ujung tenggara (Solomon/PNG timur)
    if (lat < -2 && lon > 138) return false
    // Exclude timur laut (Palau/Micronesia)
    if (lat > 2 && lon > 135) return false
    return true
  }
  return false
}

/**
 * Fetch gempa dari USGS - hanya wilayah Indonesia
 */
export async function fetchUSGS(): Promise<EarthquakeData[]> {
  try {
    // Area Indonesia: minlat=-11, maxlat=7, minlon=95, maxlon=141
    const url =
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-11&maxlatitude=7&minlongitude=95&maxlongitude=141&minmagnitude=3.0&orderby=time&limit=100'
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data: USGSEarthquake = await res.json()

    return (data.features || [])
      .map((f) => {
        const [lon, lat, depth] = f.geometry.coordinates
        return {
          sourceId: `usgs-${f.id}`,
          source: 'USGS' as const,
          magnitude: f.properties.mag,
          depth,
          latitude: lat,
          longitude: lon,
          location: f.properties.place || 'Indonesia',
          description: f.properties.title,
          felt: false,
          tsunamiRisk: !!f.properties.tsunami,
          dateTime: new Date(f.properties.time).toISOString(),
        }
      })
      // Filter ketat: hanya yang benar-benar di wilayah Indonesia
      .filter((eq) => isInIndonesia(eq.latitude, eq.longitude, eq.location))
  } catch (e) {
    console.error('USGS fetch error:', e)
    return []
  }
}

/**
 * Hitung jarak antara dua titik koordinat (Haversine formula) dalam km
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Tentukan level alert berdasarkan magnitudo
 */
export function getAlertLevel(magnitude: number): {
  level: 'info' | 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme'
  color: string
  label: string
} {
  if (magnitude >= 8.0) return { level: 'extreme', color: '#7c1d1d', label: 'EKSTREM' }
  if (magnitude >= 7.0) return { level: 'severe', color: '#dc2626', label: 'BERAT' }
  if (magnitude >= 6.0) return { level: 'strong', color: '#ea580c', label: 'KUAT' }
  if (magnitude >= 5.0) return { level: 'moderate', color: '#ca8a04', label: 'SEDANG' }
  if (magnitude >= 4.0) return { level: 'minor', color: '#65a30d', label: 'RINGAN' }
  return { level: 'info', color: '#0891b2', label: 'INFO' }
}

/**
 * Tentukan radius dampak gempa berdasarkan magnitudo (km)
 * Estimasi radius dimana gempa dirasakan (MMI III+)
 * Berdasarkan hubungan empiris magnitudo-radius:
 *   M3 ~ 10km, M4 ~ 30km, M5 ~ 80km, M6 ~ 190km, M7 ~ 500km, M8 ~ 1300km
 */
export function getImpactRadius(magnitude: number): number {
  // Formula: 10^(0.43*M - 0.3), dengan minimum 15 km
  const radius = Math.pow(10, 0.43 * magnitude - 0.3)
  return Math.max(15, Math.min(1500, radius))
}

/**
 * Format magnitudo ke label MM (Modified Mercalli)
 */
export function getMMI(magnitude: number, distanceKm: number, depth: number): string {
  // Estimasi sederhana MMI berdasarkan magnitudo, jarak, kedalaman
  if (distanceKm === 0) distanceKm = 1
  const mmi = 1.5 * magnitude - 2.5 * Math.log10(distanceKm) - 0.3 * Math.log10(depth + 5) + 1
  const clamped = Math.max(1, Math.min(12, Math.round(mmi)))
  const labels = [
    '',
    'I (Tidak dirasakan)',
    'II (Lemah)',
    'III (Lemah)',
    'IV (Ringan)',
    'V (Sedang)',
    'VI (Cukup)',
    'VII (Kuat)',
    'VIII (Sangat Kuat)',
    'IX (Hebat)',
    'X (Sangat Hebat)',
    'XI (Ekstrem)',
    'XII (Total)',
  ]
  return labels[clamped]
}

/**
 * Simpan / update data gempa ke database (deduplikasi berdasarkan sourceId)
 * Aman jika DB tidak tersedia (di hosting serverless) — operasi dibungkus try/catch
 */
export async function syncEarthquakeToDB(eq: EarthquakeData) {
  try {
    const { db } = await import('./db')
    if (!db) return // DB tidak tersedia (serverless) — skip, app tetap jalan
    await db.earthquake.upsert({
      where: { sourceId: eq.sourceId },
      create: {
        sourceId: eq.sourceId,
        source: eq.source,
        magnitude: eq.magnitude,
        depth: eq.depth,
        latitude: eq.latitude,
        longitude: eq.longitude,
        location: eq.location,
        description: eq.description,
        felt: eq.felt,
        tsunamiRisk: eq.tsunamiRisk,
        dateTime: new Date(eq.dateTime),
      },
      update: {
        magnitude: eq.magnitude,
        depth: eq.depth,
        location: eq.location,
        felt: eq.felt,
        tsunamiRisk: eq.tsunamiRisk,
      },
    })
  } catch (e) {
    // DB error (serverless/ephemeral filesystem) — diabaikan, app tetap jalan
    console.warn('DB sync skipped:', e instanceof Error ? e.message : 'unknown')
  }
}
