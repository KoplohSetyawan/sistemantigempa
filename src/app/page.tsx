'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Activity,
  AlertTriangle,
  Clock,
  Compass,
  Gauge,
  Globe2,
  Loader2,
  MapPin,
  Mountain,
  Newspaper,
  Radio,
  RefreshCw,
  Satellite,
  Shield,
  ShieldCheck,
  Siren,
  TrendingUp,
  Waves,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

// Dynamic import map (client-only, no SSR)
const EarthquakeMap = dynamic(() => import('@/components/earthquake-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-lg bg-slate-900 animate-pulse flex items-center justify-center">
      <div className="text-slate-400 flex flex-col items-center gap-2">
        <Satellite className="h-8 w-8 animate-pulse" />
        <span className="text-sm">Memuat peta satelit...</span>
      </div>
    </div>
  ),
})

interface EarthquakeData {
  sourceId: string
  source: string
  magnitude: number
  depth: number
  latitude: number
  longitude: number
  location: string
  description?: string
  felt: boolean
  tsunamiRisk: boolean
  dateTime: string
}

interface SafeZone {
  name: string
  latitude: number
  longitude: number
  distanceKm: number
  elevationM?: number
  safetyScore: number
  zoneType: string
  reason: string
}

interface ImpactZone {
  name: string
  radius: number
  color: string
  label: string
}

interface SafeZonesResponse {
  earthquake: EarthquakeData
  safeZones: SafeZone[]
  impactZones: ImpactZone[]
  aiAdvice: string
}

interface AlertData {
  hasActiveAlert: boolean
  primaryAlert: (EarthquakeData & { alertLevel: string; alertColor: string; alertLabel: string; message: string }) | null
  alerts: Array<EarthquakeData & { alertLevel: string; alertColor: string; alertLabel: string; message: string }>
}

function getMagColor(mag: number): string {
  // Skema warna berdasarkan kekuatan gempa:
  // Merah = besar (M>=6), Kuning = sedang (M5-6), Hijau = ringan (M<5)
  if (mag >= 6) return '#dc2626'
  if (mag >= 5) return '#eab308'
  return '#22c55e'
}

function getMagLabel(mag: number): string {
  if (mag >= 8) return 'EKSTREM'
  if (mag >= 7) return 'BERAT'
  if (mag >= 6) return 'KUAT'
  if (mag >= 5) return 'SEDANG'
  if (mag >= 4) return 'RINGAN'
  return 'MINOR'
}

// Sistem tema dinamis berdasarkan kekuatan gempa
// Hijau = ringan (M<5), Kuning = sedang (M5-6), Merah = besar (M>=6)
interface ThemeColors {
  level: 'light' | 'moderate' | 'large'
  label: string
  primary: string
  primaryLight: string
  primaryDark: string
  bgDark: string
  glow: string
  bgTint: string
  borderTint: string
  gradientFrom: string
}

function getThemeColors(magnitude: number | undefined): ThemeColors {
  // Default hijau saat belum ada data (untuk light theme: tint lebih kuat)
  if (magnitude === undefined || magnitude < 5.0) {
    return {
      level: 'light',
      label: 'Ringan',
      primary: '#16a34a',
      primaryLight: '#22c55e',
      primaryDark: '#15803d',
      bgDark: '#dcfce7',
      glow: 'rgba(34, 197, 94, 0.35)',
      bgTint: 'rgba(34, 197, 94, 0.12)',
      borderTint: 'rgba(22, 163, 74, 0.4)',
      gradientFrom: 'rgba(220, 252, 231, 0.9)',
    }
  }
  if (magnitude < 6.0) {
    return {
      level: 'moderate',
      label: 'Sedang',
      primary: '#ca8a04',
      primaryLight: '#eab308',
      primaryDark: '#a16207',
      bgDark: '#fef9c3',
      glow: 'rgba(234, 179, 8, 0.35)',
      bgTint: 'rgba(234, 179, 8, 0.14)',
      borderTint: 'rgba(202, 138, 4, 0.45)',
      gradientFrom: 'rgba(254, 249, 195, 0.9)',
    }
  }
  return {
    level: 'large',
    label: 'Besar',
    primary: '#dc2626',
    primaryLight: '#ef4444',
    primaryDark: '#b91c1c',
    bgDark: '#fee2e2',
    glow: 'rgba(220, 38, 38, 0.35)',
    bgTint: 'rgba(220, 38, 38, 0.12)',
    borderTint: 'rgba(220, 38, 38, 0.45)',
    gradientFrom: 'rgba(254, 226, 226, 0.9)',
  }
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  return `${days} hari lalu`
}

export default function Home() {
  const [latest, setLatest] = useState<EarthquakeData | null>(null)
  const [earthquakeList, setEarthquakeList] = useState<EarthquakeData[]>([])
  const [safeZonesData, setSafeZonesData] = useState<SafeZonesResponse | null>(null)
  const [alertData, setAlertData] = useState<AlertData | null>(null)
  const [loadingLatest, setLoadingLatest] = useState(true)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingSafeZones, setLoadingSafeZones] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch latest earthquake
  const fetchLatest = useCallback(async () => {
    setLoadingLatest(true)
    try {
      const res = await fetch('/api/earthquakes/latest', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setLatest(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLatest(false)
      setLastUpdate(new Date())
    }
  }, [])

  // Fetch earthquake list
  const fetchList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/earthquakes/list?type=all', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setEarthquakeList(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingList(false)
    }
  }, [])

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true)
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setAlertData(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAlerts(false)
    }
  }, [])

  // Fetch safe zones (with AI)
  const fetchSafeZones = useCallback(
    async (eq?: EarthquakeData) => {
      setLoadingSafeZones(true)
      try {
        const res = await fetch('/api/safe-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ earthquake: eq || latest }),
        })
        const json = await res.json()
        if (json.success) {
          setSafeZonesData(json.data)
          toast.success('Zona aman berhasil dianalisis')
        } else {
          toast.error('Gagal mencari zona aman')
        }
      } catch (e) {
        console.error(e)
        toast.error('Gagal mencari zona aman')
      } finally {
        setLoadingSafeZones(false)
      }
    },
    [latest]
  )

  // Initial load
  useEffect(() => {
    fetchLatest()
    fetchList()
    fetchAlerts()
  }, [fetchLatest, fetchList, fetchAlerts])

  // Auto-fetch safe zones when latest earthquake changes
  useEffect(() => {
    if (latest) {
      fetchSafeZones(latest)
    }
  }, [latest, fetchSafeZones])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatest()
      fetchList()
      fetchAlerts()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchLatest, fetchList, fetchAlerts])

  const handleRefreshAll = () => {
    fetchLatest()
    fetchList()
    fetchAlerts()
    if (latest) fetchSafeZones(latest)
    toast.success('Memperbarui data gempa...')
  }

  const currentEq = safeZonesData?.earthquake || latest
  const hasActiveAlert = alertData?.hasActiveAlert && currentEq && currentEq.magnitude >= 5.0

  // Tema warna dinamis berdasarkan kekuatan gempa terbaru
  const theme = getThemeColors(currentEq?.magnitude)

  return (
    <div
      className="min-h-screen flex flex-col text-slate-800"
      style={{
        background: `linear-gradient(to bottom right, var(--theme-bg-tint), #ffffff 40%, var(--theme-bg-tint))`,
        '--theme-primary': theme.primary,
        '--theme-primary-light': theme.primaryLight,
        '--theme-primary-dark': theme.primaryDark,
        '--theme-glow': theme.glow,
        '--theme-bg-tint': theme.bgTint,
        '--theme-border-tint': theme.borderTint,
      } as React.CSSProperties}
    >
      {/* Inline style untuk custom scrollbar + dynamic tab active state */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
        [role=tab][data-state=active] {
          background-color: var(--theme-primary) !important;
          color: #fff !important;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md animate-pulse" style={{ backgroundColor: 'var(--theme-glow)' }} />
              <div
                className="relative h-10 w-10 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(to bottom right, var(--theme-primary-light), var(--theme-primary))`, boxShadow: `0 4px 20px var(--theme-glow)` }}
              >
                <Activity className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 text-slate-900">
                PS-212 Sistem Anti Gempa
                <Badge
                  variant="outline"
                  style={{ borderColor: 'var(--theme-border-tint)', color: 'var(--theme-primary-dark)', backgroundColor: 'var(--theme-bg-tint)' }}
                >
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--theme-primary-light)' }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--theme-primary)' }} />
                  </span>
                  LIVE
                </Badge>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500">
                PS-212 • BMKG • USGS • Pemantauan Gempa Indonesia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Update: {lastUpdate.toLocaleTimeString('id-ID')}
              </span>
              <span>Auto-refresh 60 detik</span>
            </div>
            <Link href="/berita">
              <Button
                size="sm"
                variant="outline"
                style={{ borderColor: 'var(--theme-border-tint)', backgroundColor: 'var(--theme-bg-tint)', color: 'var(--theme-primary-dark)' }}
              >
                <Newspaper className="h-4 w-4 mr-1" />
                Berita
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshAll}
              style={{ borderColor: 'var(--theme-border-tint)', backgroundColor: 'var(--theme-bg-tint)', color: 'var(--theme-primary-dark)' }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      {hasActiveAlert && alertData?.primaryAlert && (
        <div
          className="border-b animate-in slide-in-from-top"
          style={{ backgroundColor: alertData.primaryAlert.alertColor + '20', borderColor: alertData.primaryAlert.alertColor + '60' }}
        >
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse"
              style={{ backgroundColor: alertData.primaryAlert.alertColor }}
            >
              <Siren className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm sm:text-base" style={{ color: alertData.primaryAlert.alertColor }}>
                ⚠ PERINGATAN GEMPA {alertData.primaryAlert.alertLabel}
              </p>
              <p className="text-xs sm:text-sm text-slate-700 truncate">
                Gempa M{alertData.primaryAlert.magnitude} • {alertData.primaryAlert.location} •{' '}
                {timeAgo(alertData.primaryAlert.dateTime)}
                {alertData.primaryAlert.tsunamiRisk && (
                  <span className="text-red-600 font-semibold"> • POTENSI TSUNAMI</span>
                )}
              </p>
            </div>
            <Badge
              className="hidden sm:inline-flex"
              style={{ backgroundColor: alertData.primaryAlert.alertColor, color: '#fff' }}
            >
              M{alertData.primaryAlert.magnitude}
            </Badge>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Threat level indicator - dinamis sesuai kekuatan gempa */}
        {currentEq && (
          <div
            className="mb-6 rounded-xl border p-4 flex items-center gap-4"
            style={{
              borderColor: 'var(--theme-border-tint)',
              background: `linear-gradient(to right, var(--theme-bg-tint), transparent)`,
            }}
          >
            <div
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(to bottom right, var(--theme-primary-light), var(--theme-primary))`,
                boxShadow: `0 0 24px var(--theme-glow)`,
              }}
            >
              {theme.level === 'light' && <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
              {theme.level === 'moderate' && <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
              {theme.level === 'large' && <Siren className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Tingkat Ancaman</span>
                <Badge
                  className="font-bold"
                  style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}
                >
                  GEMPA {theme.label.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm sm:text-base font-semibold mt-0.5 text-slate-800" style={{ color: 'var(--theme-primary-dark)' }}>
                Magnitudo M{currentEq.magnitude.toFixed(1)} • {currentEq.location}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {theme.level === 'light' && 'Gempa ringan, potensi kerusakan rendah. Tetap waspada terhadap gempa susulan.'}
                {theme.level === 'moderate' && 'Gempa sedang, berpotensi menimbulkan kerusakan ringan. Siapkan rencana evakuasi.'}
                {theme.level === 'large' && 'Gempa besar! Segera evakuasi ke zona aman. Waspadai potensi tsunami jika dekat pesisir.'}
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end" style={{ color: 'var(--theme-primary-dark)' }}>
              <span className="text-2xl sm:text-3xl font-bold leading-none">{currentEq.magnitude.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">Magnitudo</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="Gempa Terbaru"
            value={loadingLatest ? '...' : latest ? `M${latest.magnitude.toFixed(1)}` : '-'}
            sub={latest ? latest.location.slice(0, 20) : 'Memuat...'}
            color={theme.primary}
            bgColor={theme.bgTint}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Total Tercatat (24j)"
            value={loadingList ? '...' : `${earthquakeList.length}`}
            sub="Gempa terdeteksi"
            color={theme.primaryLight}
            bgColor={theme.bgTint}
          />
          <StatCard
            icon={<Waves className="h-5 w-5" />}
            label="Risiko Tsunami"
            value={
              loadingLatest
                ? '...'
                : latest?.tsunamiRisk
                  ? 'WASPADA'
                  : 'AMAN'
            }
            sub={latest?.tsunamiRisk ? 'Potensi tinggi' : 'Tidak ada potensi'}
            color={latest?.tsunamiRisk ? '#fb923c' : theme.primary}
            bgColor={latest?.tsunamiRisk ? 'rgba(251, 146, 60, 0.1)' : theme.bgTint}
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Zona Aman Ditemukan"
            value={safeZonesData ? `${safeZonesData.safeZones.length}` : '...'}
            sub={safeZonesData ? 'Lokasi evakuasi' : 'Menganalisis...'}
            color={theme.primary}
            bgColor={theme.bgTint}
          />
        </div>

        {/* Main grid: Map + Side panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Map column */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200 bg-white/80 backdrop-blur shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                      <Satellite className="h-5 w-5" style={{ color: 'var(--theme-primary-dark)' }} />
                      Peta Satelit Gempa
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs">
                      Citra satelit Esri • Episentrum & zona aman
                    </CardDescription>
                  </div>
                  {currentEq && (
                    <Badge
                      className="font-mono"
                      style={{ backgroundColor: getMagColor(currentEq.magnitude), color: '#fff' }}
                    >
                      M{currentEq.magnitude.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <EarthquakeMap
                  earthquake={
                    currentEq
                      ? {
                          latitude: currentEq.latitude,
                          longitude: currentEq.longitude,
                          magnitude: currentEq.magnitude,
                          location: currentEq.location,
                          depth: currentEq.depth,
                          dateTime: currentEq.dateTime,
                          source: currentEq.source,
                        }
                      : null
                  }
                  safeZones={safeZonesData?.safeZones || []}
                  impactZones={safeZonesData?.impactZones || []}
                  height="500px"
                />
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 px-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full ring-2 ring-slate-300" style={{ backgroundColor: 'var(--theme-primary)' }} />
                    Episentrum (sesuai kekuatan)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                    Zona Aman
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-dashed" style={{ borderColor: 'var(--theme-primary)' }} />
                    Zona Dampak
                  </span>
                  <span className="ml-auto text-slate-400">Sumber: {currentEq?.source || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Latest earthquake details */}
            <Card className="border-slate-200 bg-white/80 backdrop-blur shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Radio className="h-5 w-5" style={{ color: 'var(--theme-primary-dark)' }} />
                  Detail Gempa Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLatest && !latest ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full bg-slate-200" />
                    <Skeleton className="h-6 w-full bg-slate-200" />
                    <Skeleton className="h-6 w-full bg-slate-200" />
                  </div>
                ) : currentEq ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className="text-sm font-bold"
                            style={{ backgroundColor: getMagColor(currentEq.magnitude), color: '#fff' }}
                          >
                            M {currentEq.magnitude.toFixed(1)}
                          </Badge>
                          <Badge variant="outline" className="border-slate-300 text-slate-600">
                            {getMagLabel(currentEq.magnitude)}
                          </Badge>
                          {currentEq.tsunamiRisk && (
                            <Badge className="bg-orange-600 hover:bg-orange-600 text-white">
                              <Waves className="h-3 w-3 mr-1" />
                              Tsunami
                            </Badge>
                          )}
                          {currentEq.felt && (
                            <Badge className="bg-yellow-600 hover:bg-yellow-600 text-white">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Dirasakan
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {currentEq.location}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(currentEq.dateTime)}
                      </span>
                    </div>

                    <Separator className="bg-slate-200" />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <DetailItem
                        icon={<Gauge className="h-4 w-4" />}
                        label="Magnitudo"
                        value={`${currentEq.magnitude.toFixed(1)}`}
                        color={getMagColor(currentEq.magnitude)}
                      />
                      <DetailItem
                        icon={<Mountain className="h-4 w-4" />}
                        label="Kedalaman"
                        value={`${currentEq.depth.toFixed(0)} km`}
                      />
                      <DetailItem
                        icon={<MapPin className="h-4 w-4" />}
                        label="Latitude"
                        value={`${currentEq.latitude.toFixed(3)}°`}
                      />
                      <DetailItem
                        icon={<MapPin className="h-4 w-4" />}
                        label="Longitude"
                        value={`${currentEq.longitude.toFixed(3)}°`}
                      />
                    </div>

                    {currentEq.description && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                          <Compass className="h-3 w-3" />
                          Informasi
                        </p>
                        <p className="text-sm text-slate-700">{currentEq.description}</p>
                      </div>
                    )}

                    <Button
                      onClick={() => fetchSafeZones(currentEq)}
                      disabled={loadingSafeZones}
                      className="w-full text-white shadow-lg"
                      style={{
                        background: `linear-gradient(to right, var(--theme-primary), var(--theme-primary-dark))`,
                        boxShadow: `0 4px 20px var(--theme-glow)`,
                      }}
                    >
                      {loadingSafeZones ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Mencari Zona Aman...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Cari Zona Aman dari Gempa Ini
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Tidak ada data gempa tersedia
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Safe Zones + AI */}
          <div className="space-y-4">
            <Card className="border-slate-200 bg-white/80 backdrop-blur shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Shield className="h-5 w-5" style={{ color: 'var(--theme-primary-dark)' }} />
                  Zona Aman Prioritas
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Lokasi evakuasi terdekat (mulai dari 10 km dari episentrum)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSafeZones && !safeZonesData ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-16 w-full bg-slate-200" />
                    ))}
                  </div>
                ) : safeZonesData && safeZonesData.safeZones.length > 0 ? (
                  <ScrollArea className="h-[420px] pr-2">
                    <div className="space-y-2.5">
                      {safeZonesData.safeZones.map((zone, idx) => (
                        <div
                          key={`${zone.name}-${idx}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-white hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{
                                  backgroundColor:
                                    zone.safetyScore >= 70
                                      ? '#22c55e'
                                      : zone.safetyScore >= 50
                                        ? '#84cc16'
                                        : '#ca8a04',
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-sm truncate text-slate-800">{zone.name}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                zone.safetyScore >= 70
                                  ? 'border-green-500/50 text-green-700'
                                  : zone.safetyScore >= 50
                                    ? 'border-lime-500/50 text-lime-700'
                                    : 'border-yellow-500/50 text-yellow-700'
                              }
                            >
                              {zone.safetyScore}/100
                            </Badge>
                          </div>
                          <Progress
                            value={zone.safetyScore}
                            className="h-1.5 mb-2"
                            style={{
                              background: 'rgba(0,0,0,0.08)',
                            }}
                          />
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Compass className="h-3 w-3" />
                              {zone.distanceKm.toFixed(0)} km
                            </span>
                            {zone.elevationM !== undefined && (
                              <span className="flex items-center gap-1">
                                <Mountain className="h-3 w-3" />
                                {zone.elevationM} m
                              </span>
                            )}
                            <span className="flex items-center gap-1 capitalize">
                              <MapPin className="h-3 w-3" />
                              {zone.zoneType.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Klik "Cari Zona Aman" untuk menganalisis
                  </p>
                )}
              </CardContent>
            </Card>

            {/* AI Advice */}
            <Card className="backdrop-blur shadow-sm" style={{ borderColor: 'var(--theme-border-tint)', background: `linear-gradient(to bottom right, var(--theme-bg-tint), #ffffff)` }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center shadow-md"
                    style={{ background: `linear-gradient(to bottom right, var(--theme-primary-light), var(--theme-primary))`, boxShadow: `0 2px 12px var(--theme-glow)` }}
                  >
                    <span className="text-white text-xs">AI</span>
                  </div>
                  Analisis & Rekomendasi AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSafeZones ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-slate-200" />
                    <Skeleton className="h-4 w-3/4 bg-slate-200" />
                    <Skeleton className="h-4 w-full bg-slate-200" />
                    <Skeleton className="h-4 w-5/6 bg-slate-200" />
                  </div>
                ) : safeZonesData?.aiAdvice ? (
                  <ScrollArea className="h-[280px] pr-2">
                    <div className="prose prose-sm max-w-none">
                      {safeZonesData.aiAdvice.split('\n').map((line, i) =>
                        line.trim() ? (
                          <p key={i} className="text-sm text-slate-700 leading-relaxed mb-2">
                            {line}
                          </p>
                        ) : null
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Analisis AI akan muncul setelah zona aman dianalisis
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Earthquake History List */}
        <Card className="border-slate-200 bg-white/80 backdrop-blur shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Globe2 className="h-5 w-5" style={{ color: 'var(--theme-primary-dark)' }} />
                  Riwayat Gempa Terkini
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Data gempa khusus wilayah Indonesia • {earthquakeList.length} gempa tercatat
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="border" style={{ backgroundColor: 'var(--theme-bg-tint)', borderColor: 'var(--theme-border-tint)' }}>
                <TabsTrigger value="all">
                  Semua
                </TabsTrigger>
                <TabsTrigger value="significant">
                  M ≥ 5.0
                </TabsTrigger>
                <TabsTrigger value="felt">
                  Dirasakan
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <EarthquakeList
                  earthquakes={earthquakeList}
                  loading={loadingList}
                  onSelect={(eq) => fetchSafeZones(eq)}
                />
              </TabsContent>
              <TabsContent value="significant" className="mt-4">
                <EarthquakeList
                  earthquakes={earthquakeList.filter((e) => e.magnitude >= 5.0)}
                  loading={loadingList}
                  onSelect={(eq) => fetchSafeZones(eq)}
                />
              </TabsContent>
              <TabsContent value="felt" className="mt-4">
                <EarthquakeList
                  earthquakes={earthquakeList.filter((e) => e.felt)}
                  loading={loadingList}
                  onSelect={(eq) => fetchSafeZones(eq)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Impact zones info */}
        {safeZonesData?.impactZones && safeZonesData.impactZones.length > 0 && (
          <Card className="mt-6 border-slate-200 bg-white/80 backdrop-blur shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Zona Dampak Gempa
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Estimasi radius dampak berdasarkan magnitudo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {safeZonesData.impactZones.map((zone, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-3 text-center"
                    style={{
                      borderColor: zone.color + '60',
                      backgroundColor: zone.color + '15',
                    }}
                  >
                    <div
                      className="h-10 w-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: zone.color + '30', border: `2px solid ${zone.color}` }}
                    >
                      <span className="text-xs font-bold" style={{ color: zone.color }}>
                        {zone.radius.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{zone.label}</p>
                    <p className="text-[11px] text-slate-500">{zone.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">radius {zone.radius.toFixed(0)} km</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto backdrop-blur" style={{ borderTop: '1px solid var(--theme-border-tint)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: 'var(--theme-primary-dark)' }} />
            <span>PS-212 Sistem Anti Gempa • Data BMKG & USGS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-primary)' }} />
              Sistem aktif
            </span>
            <span>Update otomatis 60 detik</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Sub-components
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  bgColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: string // hex color
  bgColor: string // rgba/hex
}) {
  return (
    <Card className="border-slate-200 bg-white/80 backdrop-blur shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: bgColor, color: color }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 truncate">{label}</p>
            <p className="text-base sm:text-lg font-bold leading-tight" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-400 truncate">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
      <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-bold" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  )
}

function EarthquakeList({
  earthquakes,
  loading,
  onSelect,
}: {
  earthquakes: EarthquakeData[]
  loading: boolean
  onSelect: (eq: EarthquakeData) => void
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full bg-slate-200" />
        ))}
      </div>
    )
  }

  if (earthquakes.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Tidak ada data gempa pada kategori ini
      </p>
    )
  }

  return (
    <ScrollArea className="h-[400px] pr-2">
      <div className="space-y-1.5">
        {earthquakes.map((eq, idx) => {
          const magColor = getMagColor(eq.magnitude)
          return (
            <button
              key={`${eq.sourceId}-${idx}`}
              onClick={() => onSelect(eq)}
              className="w-full text-left rounded-lg border transition-colors p-3 flex items-center gap-3"
              style={{ borderColor: 'var(--theme-border-tint)', backgroundColor: 'var(--theme-bg-tint)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--theme-primary)'; e.currentTarget.style.backgroundColor = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border-tint)'; e.currentTarget.style.backgroundColor = 'var(--theme-bg-tint)' }}
            >
              <div
                className="h-11 w-11 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                style={{ backgroundColor: magColor + '20', border: `1px solid ${magColor}` }}
              >
                <span className="text-[9px] text-slate-500 leading-none">MAG</span>
                <span className="text-sm font-bold leading-none" style={{ color: magColor }}>
                  {eq.magnitude.toFixed(1)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{eq.location}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(eq.dateTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mountain className="h-3 w-3" />
                    {eq.depth.toFixed(0)} km
                  </span>
                  <span>• {eq.source}</span>
                  {eq.tsunamiRisk && (
                    <span className="text-orange-600 flex items-center gap-1">
                      <Waves className="h-3 w-3" />
                      Tsunami
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {eq.felt ? (
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-700 text-[10px]">
                    Dirasakan
                  </Badge>
                ) : (
                  <span className="text-[10px] text-slate-400">→</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
