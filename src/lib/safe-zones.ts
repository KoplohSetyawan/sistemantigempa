/**
 * Library untuk pencarian zona aman saat gempa terjadi
 * Menggunakan perhitungan geografis + AI (LLM) untuk rekomendasi
 */

import { haversineDistance, getImpactRadius, type EarthquakeData } from './earthquake'

export interface SafeZoneResult {
  name: string
  latitude: number
  longitude: number
  distanceKm: number
  elevationM?: number
  safetyScore: number // 0-100
  zoneType: 'open_field' | 'elevated' | 'shelter' | 'evacuation' | 'coastal_safe'
  reason: string
}

// Daftar kota-kota & kabupaten di Indonesia dengan ketinggian rata-rata (meter)
// Diperluas dengan kota-kota kabupaten agar ada kandidat dalam radius 10-50 km dari pusat gempa
const INDONESIA_CITIES = [
  // Sumatra (utara - rawan gempa)
  { name: 'Medan', lat: 3.5952, lon: 98.6722, elev: 25 },
  { name: 'Binjai', lat: 3.6, lon: 98.4833, elev: 25 },
  { name: 'Tebing Tinggi', lat: 3.3333, lon: 99.1667, elev: 50 },
  { name: 'Pematangsiantar', lat: 2.9667, lon: 99.0667, elev: 400 },
  { name: 'Sibolga', lat: 1.7333, lon: 98.7833, elev: 5 },
  { name: 'Padang Sidempuan', lat: 1.3833, lon: 99.2667, elev: 285 },
  { name: 'Gunung Tua', lat: 0.9667, lon: 99.7833, elev: 360 },
  { name: 'Nias (Gunungsitoli)', lat: 1.2833, lon: 97.6167, elev: 15 },
  { name: 'Padang', lat: -0.9492, lon: 100.3543, elev: 5 },
  { name: 'Pekanbaru', lat: 0.5071, lon: 101.4478, elev: 10 },
  { name: 'Dumai', lat: 1.6667, lon: 101.45, elev: 5 },
  { name: 'Jambi', lat: -1.6, lon: 103.6167, elev: 17 },
  { name: 'Bengkulu', lat: -3.8, lon: 102.2667, elev: 10 },
  { name: 'Curup', lat: -3.45, lon: 102.35, elev: 380 },
  { name: 'Muko-muko', lat: -2.3167, lon: 101.1333, elev: 10 },
  { name: 'Palembang', lat: -2.9761, lon: 104.7754, elev: 5 },
  { name: 'Prabumulih', lat: -3.4333, lon: 104.2333, elev: 15 },
  { name: 'Lahat', lat: -3.7833, lon: 103.8833, elev: 150 },
  { name: 'Baturaja', lat: -4.1333, lon: 104.1667, elev: 75 },
  { name: 'Bandar Lampung', lat: -5.4292, lon: 105.2611, elev: 89 },
  { name: 'Metro', lat: -5.1167, lon: 105.3, elev: 65 },
  { name: 'Liwa', lat: -5.0333, lon: 104.05, elev: 950 },
  { name: 'Krui', lat: -4.5333, lon: 103.4167, elev: 10 },
  { name: 'Banda Aceh', lat: 5.5483, lon: 95.3238, elev: 4 },
  { name: 'Lhokseumawe', lat: 5.1833, lon: 97.1333, elev: 8 },
  { name: 'Meulaboh', lat: 4.45, lon: 96.1833, elev: 6 },
  { name: 'Calang', lat: 5.0, lon: 95.5667, elev: 10 },
  { name: 'Tapak Tuan', lat: 3.2667, lon: 97.1833, elev: 10 },
  { name: 'Sinabang', lat: 2.4833, lon: 97.7667, elev: 10 },
  { name: 'Bukittinggi', lat: -0.3056, lon: 100.3694, elev: 921 },
  { name: 'Payakumbuh', lat: -0.2167, lon: 100.6333, elev: 514 },
  { name: 'Solok', lat: -0.7833, lon: 100.6667, elev: 376 },
  { name: 'Sawahlunto', lat: -0.6667, lon: 100.7, elev: 276 },
  { name: 'Padang Panjang', lat: -0.4, lon: 100.4167, elev: 850 },
  { name: 'Pariaman', lat: -0.6167, lon: 100.1167, elev: 8 },
  { name: 'Painan', lat: -1.1167, lon: 100.1167, elev: 10 },
  { name: 'Mentawai (Tuapejat)', lat: -0.85, lon: 99.3, elev: 5 },
  { name: 'Mukomuko', lat: -2.3167, lon: 101.1333, elev: 10 },
  { name: 'Kerinci (Sungai Penuh)', lat: -1.9833, lon: 101.2667, elev: 800 },
  { name: 'Sungai Penuh', lat: -2.0167, lon: 101.3833, elev: 815 },
  { name: 'Takengon', lat: 4.6167, lon: 96.85, elev: 1100 },
  { name: 'Kabanjahe', lat: 3.2333, lon: 98.5, elev: 1200 },
  { name: 'Brastagi', lat: 3.2, lon: 98.5, elev: 1300 },
  // Jawa
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456, elev: 8 },
  { name: 'Bogor', lat: -6.595, lon: 106.789, elev: 265 },
  { name: 'Bandung', lat: -6.9175, lon: 107.6191, elev: 768 },
  { name: 'Cianjur', lat: -6.8167, lon: 107.15, elev: 538 },
  { name: 'Sukabumi', lat: -6.9277, lon: 106.927, elev: 584 },
  { name: 'Garut', lat: -7.227, lon: 107.908, elev: 717 },
  { name: 'Tasikmalaya', lat: -7.327, lon: 108.202, elev: 349 },
  { name: 'Banjar', lat: -7.3667, lon: 108.55, elev: 200 },
  { name: 'Cilacap', lat: -7.7333, lon: 109.0167, elev: 10 },
  { name: 'Kebumen', lat: -7.8083, lon: 109.65, elev: 30 },
  { name: 'Purworejo', lat: -7.7167, lon: 110.0167, elev: 40 },
  { name: 'Cirebon', lat: -6.7167, lon: 108.55, elev: 6 },
  { name: 'Indramayu', lat: -6.3264, lon: 108.3228, elev: 8 },
  { name: 'Tegal', lat: -6.8694, lon: 109.1402, elev: 9 },
  { name: 'Pemalang', lat: -7.15, lon: 109.3833, elev: 10 },
  { name: 'Pekalongan', lat: -6.8833, lon: 109.6667, elev: 5 },
  { name: 'Semarang', lat: -6.9667, lon: 110.4167, elev: 4 },
  { name: 'Kendal', lat: -7.0167, lon: 110.2, elev: 30 },
  { name: 'Salatiga', lat: -7.3333, lon: 110.5, elev: 750 },
  { name: 'Yogyakarta', lat: -7.8014, lon: 110.3645, elev: 113 },
  { name: 'Bantul', lat: -7.8889, lon: 110.3289, elev: 100 },
  { name: 'Klaten', lat: -7.7056, lon: 110.5958, elev: 120 },
  { name: 'Sleman', lat: -7.7167, lon: 110.35, elev: 200 },
  { name: 'Magelang', lat: -7.4667, lon: 110.2167, elev: 380 },
  { name: 'Surabaya', lat: -7.2575, lon: 112.7521, elev: 5 },
  { name: 'Malang', lat: -7.9667, lon: 112.633, elev: 477 },
  { name: 'Kediri', lat: -7.833, lon: 112.017, elev: 67 },
  { name: 'Madiun', lat: -7.6298, lon: 111.5239, elev: 65 },
  { name: 'Solo (Surakarta)', lat: -7.5755, lon: 110.8243, elev: 105 },
  { name: 'Purwokerto', lat: -7.4286, lon: 109.2444, elev: 89 },
  { name: 'Banyumas', lat: -7.5167, lon: 109.25, elev: 100 },
  { name: 'Jember', lat: -8.2, lon: 113.7, elev: 95 },
  { name: 'Banyuwangi', lat: -8.2167, lon: 114.3667, elev: 85 },
  { name: 'Probolinggo', lat: -7.75, lon: 113.2167, elev: 15 },
  { name: 'Pasuruan', lat: -7.6333, lon: 112.9, elev: 10 },
  { name: 'Sidoarjo', lat: -7.4478, lon: 112.7122, elev: 10 },
  { name: 'Mojokerto', lat: -7.4667, lon: 112.4333, elev: 25 },
  { name: 'Nganjuk', lat: -7.5333, lon: 111.9, elev: 35 },
  { name: 'Bojonegoro', lat: -7.2167, lon: 111.8833, elev: 20 },
  { name: 'Tuban', lat: -6.9667, lon: 112.0333, elev: 10 },
  { name: 'Rembang', lat: -6.7167, lon: 111.35, elev: 10 },
  { name: 'Sukabumi Pelabuhan Ratu', lat: -6.9833, lon: 106.55, elev: 5 },
  { name: 'Pelabuhan Ratu', lat: -6.9833, lon: 106.55, elev: 5 },
  // Bali & Nusa Tenggara (banyak gempa terjadi di sini)
  { name: 'Denpasar', lat: -8.65, lon: 115.2167, elev: 4 },
  { name: 'Singaraja', lat: -8.1167, lon: 115.0833, elev: 15 },
  { name: 'Negara', lat: -8.5333, lon: 114.6667, elev: 10 },
  { name: 'Amlapura', lat: -8.4333, lon: 115.5333, elev: 100 },
  { name: 'Tabanan', lat: -8.5333, lon: 115.0667, elev: 320 },
  { name: 'Mataram', lat: -8.5833, lon: 116.1167, elev: 15 },
  { name: 'Praya', lat: -8.7167, lon: 116.2833, elev: 100 },
  { name: 'Selong', lat: -8.65, lon: 116.5167, elev: 200 },
  { name: 'Sumbawa Besar', lat: -8.4881, lon: 117.4194, elev: 18 },
  { name: 'Bima', lat: -8.46, lon: 118.7333, elev: 12 },
  { name: 'Dompu', lat: -8.3333, lon: 118.4667, elev: 50 },
  { name: 'Taliwang', lat: -8.7167, lon: 116.8333, elev: 15 },
  { name: 'Sape', lat: -8.4667, lon: 118.9667, elev: 10 },
  { name: 'Kupang', lat: -10.1772, lon: 123.607, elev: 64 },
  { name: 'Soe', lat: -9.8667, lon: 124.2667, elev: 350 },
  { name: 'Kefamenanu', lat: -9.45, lon: 124.3833, elev: 380 },
  { name: 'Atambua', lat: -9.1, lon: 124.9, elev: 352 },
  { name: 'Ende', lat: -8.8333, lon: 121.65, elev: 30 },
  { name: 'Maumere', lat: -8.6097, lon: 122.2431, elev: 14 },
  { name: 'Larantuka', lat: -8.3531, lon: 122.9858, elev: 12 },
  { name: 'Mola (Sikka)', lat: -8.6333, lon: 122.2167, elev: 20 },
  { name: 'Ruteng', lat: -8.5833, lon: 120.4628, elev: 1204 },
  { name: 'Reo', lat: -8.55, lon: 120.4833, elev: 15 },
  { name: 'Borong', lat: -8.5667, lon: 120.6333, elev: 250 },
  { name: 'Lelak', lat: -8.5333, lon: 120.4, elev: 10 },
  { name: 'Cancar', lat: -8.4, lon: 120.25, elev: 400 },
  { name: 'Todo', lat: -8.65, lon: 120.55, elev: 800 },
  { name: 'Bajawa', lat: -8.8167, lon: 120.9667, elev: 1100 },
  { name: 'Mataloko', lat: -8.85, lon: 121.0, elev: 950 },
  { name: 'Bajawa Soa', lat: -8.8833, lon: 121.05, elev: 1000 },
  { name: 'Labuan Bajo', lat: -8.5013, lon: 119.8888, elev: 12 },
  { name: 'Komodo', lat: -8.55, lon: 119.4833, elev: 5 },
  { name: 'Sano (Wae Sano)', lat: -8.6667, lon: 120.05, elev: 450 },
  { name: 'Waingapu', lat: -9.6333, lon: 120.2667, elev: 47 },
  { name: 'Waikabubak', lat: -9.65, lon: 119.4, elev: 200 },
  { name: 'Tambolaka', lat: -9.3833, lon: 119.1167, elev: 95 },
  { name: 'Lewoleba', lat: -8.35, lon: 123.4333, elev: 15 },
  { name: 'Kalabahi', lat: -8.2, lon: 124.8, elev: 20 },
  // Kalimantan (stabil, jauh dari zona gempa)
  { name: 'Pontianak', lat: -0.0264, lon: 109.3425, elev: 3 },
  { name: 'Mempawah', lat: 0.7333, lon: 108.9667, elev: 5 },
  { name: 'Ketapang', lat: -1.85, lon: 110.1833, elev: 8 },
  { name: 'Sintang', lat: 0.0667, lon: 111.4833, elev: 30 },
  { name: 'Banjarmasin', lat: -3.3186, lon: 114.5944, elev: 1 },
  { name: 'Banjarbaru', lat: -3.4528, lon: 114.8186, elev: 22 },
  { name: 'Martapura', lat: -3.4167, lon: 114.85, elev: 15 },
  { name: 'Pelaihari', lat: -3.7833, lon: 114.75, elev: 30 },
  { name: 'Samarinda', lat: -0.5022, lon: 117.1536, elev: 10 },
  { name: 'Balikpapan', lat: -1.2379, lon: 116.8529, elev: 11 },
  { name: 'Tanjung Redeb (Berau)', lat: 2.1333, lon: 117.4667, elev: 8 },
  { name: 'Tarakan', lat: 3.3, lon: 117.6333, elev: 5 },
  { name: 'Palangka Raya', lat: -2.2096, lon: 113.9108, elev: 9 },
  { name: 'Pangkalan Bun', lat: -2.7, lon: 111.6333, elev: 8 },
  { name: 'Tanjung Selor', lat: 2.8333, lon: 117.3667, elev: 5 },
  // Sulawesi
  { name: 'Makassar', lat: -5.1477, lon: 119.4327, elev: 10 },
  { name: 'Maros', lat: -4.9833, lon: 119.5833, elev: 20 },
  { name: 'Pangkajene', lat: -4.8333, lon: 119.3333, elev: 8 },
  { name: 'Sungguminasa (Gowa)', lat: -5.35, lon: 119.4833, elev: 50 },
  { name: 'Palu', lat: -0.8917, lon: 119.8707, elev: 5 },
  { name: 'Donggala', lat: -0.6833, lon: 119.7333, elev: 10 },
  { name: 'Parigi', lat: -0.6167, lon: 120.3167, elev: 15 },
  { name: 'Poso', lat: -1.3958, lon: 120.7539, elev: 215 },
  { name: 'Tentena', lat: -1.7667, lon: 120.6, elev: 350 },
  { name: 'Kendari', lat: -3.9985, lon: 122.513, elev: 28 },
  { name: 'Bau-Bau', lat: -5.4667, lon: 122.6333, elev: 15 },
  { name: 'Raha', lat: -4.8333, lon: 122.7333, elev: 10 },
  { name: 'Wangi-Wangi', lat: -5.3167, lon: 123.6, elev: 8 },
  { name: 'Manado', lat: 1.4931, lon: 124.8413, elev: 12 },
  { name: 'Tomohon', lat: 1.3167, lon: 124.8333, elev: 750 },
  { name: 'Bitung', lat: 1.45, lon: 125.2, elev: 5 },
  { name: 'Tondano', lat: 1.3, lon: 124.8833, elev: 700 },
  { name: 'Kotamobagu', lat: 0.3333, lon: 124.3167, elev: 200 },
  { name: 'Gorontalo', lat: 0.5435, lon: 123.0568, elev: 5 },
  { name: 'Limboto', lat: 0.6333, lon: 122.9667, elev: 15 },
  { name: 'Mamuju', lat: -2.6747, lon: 118.8885, elev: 10 },
  { name: 'Majene', lat: -2.5, lon: 118.95, elev: 5 },
  { name: 'Polewali', lat: -3.4333, lon: 119.35, elev: 10 },
  { name: 'Palopo', lat: -2.9936, lon: 120.1939, elev: 15 },
  { name: 'Wajo (Sengkang)', lat: -4.1167, lon: 120.0167, elev: 13 },
  { name: 'Watansoppeng', lat: -4.1167, lon: 119.8667, elev: 100 },
  { name: 'Pinrang', lat: -3.9833, lon: 119.1167, elev: 25 },
  { name: 'Parepare', lat: -3.9833, lon: 119.6333, elev: 10 },
  { name: 'Barru', lat: -4.4, lon: 119.6167, elev: 15 },
  { name: 'Sinjai', lat: -5.2, lon: 120.1, elev: 10 },
  { name: 'Bulukumba', lat: -5.55, lon: 120.2667, elev: 10 },
  // Maluku & Papua
  { name: 'Ambon', lat: -3.6954, lon: 128.1814, elev: 12 },
  { name: 'Namlea', lat: -3.25, lon: 126.6833, elev: 8 },
  { name: 'Namrole', lat: -3.8333, lon: 127.0833, elev: 10 },
  { name: 'Ternate', lat: 0.7833, lon: 127.3667, elev: 8 },
  { name: 'Sofifi', lat: 0.7333, lon: 127.55, elev: 5 },
  { name: 'Tobelo', lat: 1.3833, lon: 127.9833, elev: 10 },
  { name: 'Daruba', lat: 1.7167, lon: 127.9, elev: 8 },
  { name: 'Saumlaki', lat: -7.9833, lon: 131.3, elev: 14 },
  { name: 'Dobo', lat: -5.75, lon: 134.2, elev: 5 },
  { name: 'Tual', lat: -5.6333, lon: 132.75, elev: 10 },
  { name: 'Banda Neira', lat: -4.5167, lon: 129.8833, elev: 10 },
  { name: 'Masohi', lat: -3.2833, lon: 128.95, elev: 30 },
  { name: 'Piru', lat: -3.3667, lon: 128.6667, elev: 15 },
  { name: 'Jayapura', lat: -2.5916, lon: 140.669, elev: 99 },
  { name: 'Sentani', lat: -2.6, lon: 140.5833, elev: 75 },
  { name: 'Sorong', lat: -0.8762, lon: 131.2571, elev: 3 },
  { name: 'Raja Ampat (Waisai)', lat: -0.1833, lon: 130.7333, elev: 8 },
  { name: 'Manokwari', lat: -0.8614, lon: 134.062, elev: 8 },
  { name: 'Fakfak', lat: -2.9167, lon: 132.3, elev: 15 },
  { name: 'Bintuni', lat: -2.0833, lon: 133.5333, elev: 10 },
  { name: 'Kaimana', lat: -3.65, lon: 133.7, elev: 10 },
  { name: 'Merauke', lat: -8.4667, lon: 140.3833, elev: 5 },
  { name: 'Tanah Merah', lat: -6.5333, lon: 140.3, elev: 30 },
  { name: 'Nabire', lat: -3.3667, lon: 135.5, elev: 5 },
  { name: 'Enarotali', lat: -3.9333, lon: 136.35, elev: 1750 },
  { name: 'Timika', lat: -4.5286, lon: 136.8869, elev: 12 },
  { name: 'Tembagapura', lat: -4.5167, lon: 137.1167, elev: 1900 },
  { name: 'Wamena', lat: -4.1, lon: 138.95, elev: 1550 },
  { name: 'Tolikara', lat: -3.7333, lon: 138.7, elev: 1600 },
  { name: 'Sarmi', lat: -1.8667, lon: 138.7167, elev: 10 },
  // Kota pegunungan tinggi tambahan (zona aman tsunami)
  { name: 'Tapan', lat: -1.0, lon: 101.0, elev: 350 },
]

/**
 * Cari zona aman terdekat dari episentrum gempa
 * Algoritma: mulai dari jarak minimum 10 km dari pusat gempa
 * - Zona 10 km - impactRadius: zona hati-hati (masih dalam jangkauan getaran)
 * - Zona > impactRadius: zona aman
 */
export function findSafeZones(
  earthquake: EarthquakeData,
  limit: number = 10
): SafeZoneResult[] {
  const impactRadius = getImpactRadius(earthquake.magnitude)
  const isTsunamiRisk = earthquake.tsunamiRisk
  // Untuk Indonesia, kita anggap ada potensi tsunami jika gempa di laut & M >= 6.0
  const tsunamiRelevant = isTsunamiRisk || (earthquake.magnitude >= 6.0)

  // Jarak minimum mutlak: 10 km dari pusat gempa
  const MIN_SAFE_DISTANCE = 10
  // Jarak maksimum yang masuk akal untuk rekomendasi evakuasi
  const maxPracticalDistance = Math.max(500, impactRadius * 4)

  const candidates = INDONESIA_CITIES.map((city) => {
    const distance = haversineDistance(
      earthquake.latitude,
      earthquake.longitude,
      city.lat,
      city.lon
    )

    // Lewati jika kurang dari 10 km dari episentrum (terlalu dekat, masih di pusat gempa)
    if (distance < MIN_SAFE_DISTANCE) return null

    let safetyScore = 0
    let reasons: string[] = []
    let zoneType: SafeZoneResult['zoneType'] = 'open_field'

    // === 1. Skor jarak (PRIORITAS UTAMA) ===
    // Skema baru: mulai dari 10 km, semakin dekat (tapi >= 10 km) semakin baik untuk evakuasi cepat
    let distanceScore: number
    if (distance < impactRadius) {
      // 10 km - impactRadius: zona hati-hati, masih dalam zona getaran
      // tapi tetap bisa dievakuasi (lebih baik daripada di episentrum)
      const ratio = (distance - MIN_SAFE_DISTANCE) / (impactRadius - MIN_SAFE_DISTANCE)
      distanceScore = 15 + ratio * 20 // naik dari 15 ke 35
      reasons.push(`Jarak ${distance.toFixed(0)} km dari episentrum (zona hati-hati)`)
      zoneType = 'open_field'
    } else if (distance <= impactRadius * 2) {
      // Zona aman optimal: di luar impact radius tapi tidak terlalu jauh
      distanceScore = 50
      reasons.push(`Jarak aman ${distance.toFixed(0)} km dari episentrum (zona aman)`)
    } else if (distance <= maxPracticalDistance) {
      // Cukup jauh, masih dalam jangkauan evakuasi
      const ratio = (distance - impactRadius * 2) / (maxPracticalDistance - impactRadius * 2)
      distanceScore = 50 - ratio * 25 // menurun dari 50 ke 25
      reasons.push(`Jarak aman ${distance.toFixed(0)} km dari episentrum`)
    } else {
      // Terlalu jauh, tidak praktis untuk evakuasi
      distanceScore = 5
      reasons.push(`Jarak jauh ${distance.toFixed(0)} km (evakuasi tidak praktis)`)
    }
    safetyScore += distanceScore

    // === 2. Skor ketinggian (penting jika ada potensi tsunami) ===
    if (tsunamiRelevant) {
      if (city.elev >= 300) {
        safetyScore += 30
        reasons.push(`Ketinggian ${city.elev} m dpl (aman dari tsunami)`)
        zoneType = 'elevated'
      } else if (city.elev >= 100) {
        safetyScore += 20
        reasons.push(`Ketinggian ${city.elev} m (cukup aman dari tsunami)`)
        zoneType = 'elevated'
      } else if (city.elev >= 30) {
        safetyScore += 10
        reasons.push(`Ketinggian ${city.elev} m`)
      } else {
        safetyScore -= 8
        reasons.push(`Area rendah (${city.elev} m), waspada tsunami`)
      }
    } else {
      // Tidak ada risiko tsunami, ketinggian kurang relevan
      if (city.elev >= 200) {
        safetyScore += 8
        reasons.push(`Topografi dataran tinggi (${city.elev} m) stabil`)
      } else if (city.elev >= 50) {
        safetyScore += 4
      }
    }

    // === 3. Skor infrastruktur (kota besar punya shelter) ===
    const majorCities = ['Jakarta', 'Bandung', 'Surabaya', 'Semarang', 'Yogyakarta', 'Medan', 'Makassar', 'Denpasar', 'Malang']
    if (majorCities.some((c) => city.name.includes(c))) {
      safetyScore += 8
      reasons.push('Memiliki infrastruktur mitigasi gempa & shelter')
      if (zoneType === 'open_field') zoneType = 'shelter'
    }

    // === 4. Bonus zona evakuasi untuk area pegunungan tinggi ===
    if (city.elev >= 500) {
      safetyScore += 5
      reasons.push('Area pegunungan cocok untuk evakuasi')
      if (zoneType !== 'shelter' && zoneType !== 'elevated') zoneType = 'evacuation'
    }

    // === 5. Bonus untuk kota Kalimantan (zona stabil tektonik) ===
    const kalimantanCities = ['Pontianak', 'Banjarmasin', 'Samarinda', 'Balikpapan', 'Banjarbaru', 'Palangka Raya', 'Tanjung Selor']
    if (kalimantanCities.includes(city.name)) {
      safetyScore += 6
      reasons.push('Zona stabil tektonik (Kalimantan)')
    }

    safetyScore = Math.max(0, Math.min(100, safetyScore))

    return {
      name: city.name,
      latitude: city.lat,
      longitude: city.lon,
      distanceKm: distance,
      elevationM: city.elev,
      safetyScore: Math.round(safetyScore),
      zoneType,
      reason: reasons.join('. '),
    }
  })
    .filter((c): c is SafeZoneResult => c !== null)
    // Sort: prioritaskan zona TERDEKAT (>= 10 km) untuk evakuasi cepat
    // Evakuasi butuh lokasi terdekat yang aman, bukan skor tertinggi yang jauh
    .sort((a, b) => {
      // Prioritaskan zona dalam jarak praktis (<= maxPracticalDistance)
      const aPractical = a.distanceKm <= maxPracticalDistance
      const bPractical = b.distanceKm <= maxPracticalDistance
      if (aPractical && !bPractical) return -1
      if (!aPractical && bPractical) return 1
      // Dalam jarak praktis: sort strictly by jarak terdekat (evakuasi cepat)
      return a.distanceKm - b.distanceKm
    })
    .slice(0, limit)

  return candidates
}

/**
 * Cache sederhana untuk AI advice (mencegah rate limit 429)
 * Key: sourceId gempa, Value: advice text + timestamp
 */
const aiAdviceCache = new Map<string, { text: string; ts: number }>()
const AI_CACHE_TTL = 5 * 60 * 1000 // 5 menit

/**
 * Generate rekomendasi AI menggunakan LLM dengan retry & fallback
 */
export async function generateAISafetyAdvice(
  earthquake: EarthquakeData,
  safeZones: SafeZoneResult[]
): Promise<string> {
  // 1. Cek cache dulu (mencegah rate limit)
  const cacheKey = `${earthquake.sourceId}-${earthquake.magnitude.toFixed(1)}`
  const cached = aiAdviceCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < AI_CACHE_TTL) {
    return cached.text
  }

  // 2. Siapkan data
  const eqInfo = `Gempa ${earthquake.source}: Magnitudo ${earthquake.magnitude}, Kedalaman ${earthquake.depth} km, Lokasi ${earthquake.location} (${earthquake.latitude}, ${earthquake.longitude}), Potensi Tsunami: ${earthquake.tsunamiRisk ? 'YA' : 'Tidak'}, Dirasakan: ${earthquake.felt ? 'YA' : 'Tidak'}`

  const zonesInfo = safeZones
    .slice(0, 5)
    .map(
      (z, i) =>
        `${i + 1}. ${z.name} - Jarak ${z.distanceKm.toFixed(0)} km, Ketinggian ${z.elevationM} m, Skor Keamanan ${z.safetyScore}/100, Tipe: ${z.zoneType}`
    )
    .join('\n')

  const prompt = `Anda adalah ahli mitigasi gempa BMKG. Berdasarkan data gempa berikut, berikan analisis singkat (maksimal 4 paragraf) tentang situasi gempa, tingkat risiko, langkah keselamatan, dan rekomendasi evakuasi. Jawab dalam Bahasa Indonesia yang jelas dan tegas.

DATA GEMPA:
${eqInfo}

ZONA AMAN YANG DIREKOMENDASIKAN (urut dari paling aman):
${zonesInfo}

Format jawaban:
1. Paragraf pertama: Ringkasan situasi gempa & tingkat bahaya
2. Paragraf kedua: Apakah berpotensi tsunami dan area terdampak
3. Paragraf ketiga: Rekomendasi langkah keselamatan darurat
4. Paragraf keempat: Zona aman prioritas untuk evakuasi`

  // 3. Coba panggil AI dengan retry (max 3 percobaan)
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    let lastError: unknown = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                'Anda adalah asisten ahli mitigasi bencana gempa BMKG Indonesia. Berikan jawaban singkat, faktual, dan actionable. Gunakan Bahasa Indonesia.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 700,
        })

        const text = completion.choices[0]?.message?.content || ''
        if (text.trim()) {
          // Simpan ke cache
          aiAdviceCache.set(cacheKey, { text, ts: Date.now() })
          return text
        }
      } catch (err) {
        lastError = err
        // Jika 429 (rate limit), tunggu sebelum retry
        const isRateLimit = err instanceof Error && err.message.includes('429')
        if (isRateLimit && attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500 * attempt)) // 1.5s, 3s
        }
      }
    }

    // 4. Semua retry gagal → gunakan fallback
    console.error('AI advice semua retry gagal:', lastError)
    const fallback = generateFallbackAdvice(earthquake, safeZones)
    aiAdviceCache.set(cacheKey, { text: fallback, ts: Date.now() })
    return fallback
  } catch (e) {
    console.error('AI advice init error:', e)
    const fallback = generateFallbackAdvice(earthquake, safeZones)
    return fallback
  }
}

/**
 * Fallback: generate advice tanpa AI berdasarkan rule-based
 * Dipakai saat AI rate-limited atau error
 */
function generateFallbackAdvice(
  earthquake: EarthquakeData,
  safeZones: SafeZoneResult[]
): string {
  const mag = earthquake.magnitude
  const depth = earthquake.depth
  const isShallow = depth < 70
  const isTsunamiRisk = earthquake.tsunamiRisk || (mag >= 6.0)

  // Tentukan level bahaya
  let levelDesc: string
  if (mag >= 7.0) {
    levelDesc = `Gempa magnitudo ${mag.toFixed(1)} tergolong GEMPA BESAR dengan potensi kerusakan signifikan. `
  } else if (mag >= 6.0) {
    levelDesc = `Gempa magnitudo ${mag.toFixed(1)} tergolong GEMPA KUAT yang berpotensi menimbulkan kerusakan. `
  } else if (mag >= 5.0) {
    levelDesc = `Gempa magnitudo ${mag.toFixed(1)} tergolong GEMPA SEDANG yang dapat dirasakan luas. `
  } else {
    levelDesc = `Gempa magnitudo ${mag.toFixed(1)} tergolong GEMPA RINGAN dengan potensi kerusakan rendah. `
  }

  const depthDesc = isShallow
    ? `Gempa ini berkedalaman dangkal (${depth.toFixed(0)} km), sehingga getaran terasa lebih kuat di permukaan.`
    : `Gempa ini berkedalaman sedang-dalam (${depth.toFixed(0)} km), getaran permukaan relatif berkurang.`

  // Tsunami
  let tsunamiDesc: string
  if (isTsunamiRisk) {
    tsunamiDesc = `⚠ BERPOTENSI TSUNAMI. Jika berada di area pesisir dalam radius 300 km dari episentrum, segera evakuasi ke dataran tinggi (minimal 20 m dpl) atau menjauhi garis pantai minimal 3 km. Patuhi peringatan dari BMKG.`
  } else {
    tsunamiDesc = `Gempa ini TIDAK berpotensi tsunami. Namun tetap waspadai gempa susulan yang mungkin terjadi.`
  }

  // Safety steps
  const safetySteps = `Langkah keselamatan: (1) Jika masih merasakan getaran, lindungi diri di bawah meja kokoh atau berlindung di sudut ruangan. (2) Setelah getaran berhenti, evakuasi ke tempat terbuka yang jauh dari bangunan tinggi. (3) Hindari lift dan waspadai kabel/listrik yang putus. (4) Pantau informasi resmi dari BMKG.`

  // Zona aman prioritas
  const topZones = safeZones.slice(0, 3)
  let zonesDesc: string
  if (topZones.length > 0) {
    zonesDesc = `Zona aman prioritas untuk evakuasi: ${topZones
      .map((z) => `${z.name} (${z.distanceKm.toFixed(0)} km, ${z.elevationM || 0} m dpl)`)
      .join(', ')}. ${
      isTsunamiRisk
        ? 'Prioritaskan zona dengan ketinggian > 20 m dpl untuk menghindari risiko tsunami.'
        : 'Pilih zona terdekat yang berada di luar radius dampak gempa.'
    }`
  } else {
    zonesDesc = `Tidak ditemukan zona aman dalam radius praktis. Tetap di tempat terbuka yang jauh dari bangunan dan ikuti arahan otoritas setempat.`
  }

  return `${levelDesc}${depthDesc}\n\n${tsunamiDesc}\n\n${safetySteps}\n\n${zonesDesc}`
}

/**
 * Buat ringkasan peta zona dampak (untuk visualisasi)
 * Skema warna: merah (besar), kuning (sedang), hijau (ringan)
 */
export function getImpactZones(earthquake: EarthquakeData) {
  const impactRadius = getImpactRadius(earthquake.magnitude)
  return [
    {
      name: 'Zona Episentrum',
      radius: Math.max(10, impactRadius * 0.2),
      color: '#dc2626', // merah - bahaya ekstrem
      label: 'Bahaya Ekstrem',
    },
    {
      name: 'Zona Dampak Kuat',
      radius: impactRadius * 0.5,
      color: '#f97316', // oranye-merah - bahaya tinggi
      label: 'Bahaya Tinggi',
    },
    {
      name: 'Zona Dampak Sedang',
      radius: impactRadius,
      color: '#eab308', // kuning - bahaya sedang
      label: 'Bahaya Sedang',
    },
    {
      name: 'Zona Dirasakan',
      radius: impactRadius * 1.8,
      color: '#84cc16', // hijau-kuning - dirasakan
      label: 'Dirasakan',
    },
  ]
}
