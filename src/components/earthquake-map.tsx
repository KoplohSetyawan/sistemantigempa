'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapEarthquake {
  latitude: number
  longitude: number
  magnitude: number
  location: string
  depth: number
  dateTime: string
  source: string
}

export interface MapSafeZone {
  name: string
  latitude: number
  longitude: number
  distanceKm: number
  elevationM?: number
  safetyScore: number
  zoneType: string
}

export interface MapImpactZone {
  name: string
  radius: number
  color: string
  label: string
}

interface EarthquakeMapProps {
  earthquake?: MapEarthquake | null
  safeZones?: MapSafeZone[]
  impactZones?: MapImpactZone[]
  height?: string
}

// Fix untuk icon marker default leaflet di webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function EarthquakeMap({
  earthquake,
  safeZones = [],
  impactZones = [],
  height = '500px',
}: EarthquakeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  // Init map sekali
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: [-2.5, 118], // Tengah Indonesia
      zoom: 5,
      minZoom: 4,
      maxBounds: L.latLngBounds(L.latLng(-15, 90), L.latLng(10, 145)), // batas Indonesia
      maxBoundsViscosity: 0.8,
      zoomControl: true,
      attributionControl: true,
    })

    // Layer satelit Esri World Imagery
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    ).addTo(map)

    // Layer label (tempat & batas wilayah)
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.8 }
    ).addTo(map)

    // Layer control untuk toggle satelit/label
    L.control
      .layers(undefined, {
        'Label Wilayah': labels,
      })
      .addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // Update markers saat data berubah
  useEffect(() => {
    const map = mapInstance.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    // Gambar zona dampak (lingkaran konsentris)
    if (earthquake && impactZones.length > 0) {
      impactZones.forEach((zone) => {
        const circle = L.circle([earthquake.latitude, earthquake.longitude], {
          radius: zone.radius * 1000, // km -> m
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '6, 4',
        }).bindTooltip(`${zone.name} (${zone.label}) - ${zone.radius.toFixed(0)} km`)
        circle.addTo(layer)
      })
    }

    // Marker gempa (episentrum) - warna mengikuti kekuatan gempa
    if (earthquake) {
      const mag = earthquake.magnitude
      const radius = Math.max(10, Math.min(40, mag * 4))
      // Hijau = ringan (M<5), Kuning = sedang (M5-6), Merah = besar (M>=6)
      const eqColor = mag >= 6 ? 'rgba(220,38,38,0.9)' : mag >= 5 ? 'rgba(234,179,8,0.9)' : 'rgba(34,197,94,0.9)'
      const eqColorGlow = mag >= 6 ? 'rgba(220,38,38,0.8)' : mag >= 5 ? 'rgba(234,179,8,0.8)' : 'rgba(34,197,94,0.8)'
      const eqColorRing = mag >= 6 ? 'rgba(220,38,38,0.3)' : mag >= 5 ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'
      const eqColorPulse = mag >= 6 ? 'rgba(220,38,38,0.4)' : mag >= 5 ? 'rgba(234,179,8,0.4)' : 'rgba(34,197,94,0.4)'
      const eqTextColor = mag >= 6 ? '#dc2626' : mag >= 5 ? '#eab308' : '#22c55e'

      // Pulse animation icon untuk episentrum
      const eqIcon = L.divIcon({
        className: 'eq-epicenter-marker',
        html: `<div style="position:relative;width:60px;height:60px;">
          <div style="position:absolute;inset:0;margin:auto;width:${radius}px;height:${radius}px;background:${eqColor};border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px ${eqColorRing},0 0 20px ${eqColorGlow};"></div>
          <div style="position:absolute;inset:0;margin:auto;width:${radius}px;height:${radius}px;background:${eqColorPulse};border-radius:50%;animation:eq-pulse 1.8s ease-out infinite;"></div>
        </div>`,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
      })

      const marker = L.marker([earthquake.latitude, earthquake.longitude], { icon: eqIcon })
        .bindPopup(
          `<div style="font-family:system-ui;min-width:200px;">
            <div style="font-weight:700;color:${eqTextColor};font-size:14px;margin-bottom:4px;">⚡ EPISENTRUM GEMPA</div>
            <div style="font-size:13px;font-weight:600;">M${earthquake.magnitude} - ${earthquake.location}</div>
            <div style="font-size:12px;color:#555;margin-top:4px;">Kedalaman: ${earthquake.depth} km</div>
            <div style="font-size:12px;color:#555;">Koordinat: ${earthquake.latitude.toFixed(2)}, ${earthquake.longitude.toFixed(2)}</div>
            <div style="font-size:12px;color:#555;">Waktu: ${new Date(earthquake.dateTime).toLocaleString('id-ID')}</div>
            <div style="font-size:12px;color:#555;">Sumber: ${earthquake.source}</div>
          </div>`
        )
        .addTo(layer)

      // Pan ke episentrum
      map.setView([earthquake.latitude, earthquake.longitude], 6, { animate: true })
      setTimeout(() => marker.openPopup(), 400)
    }

    // Marker zona aman (hijau cerah)
    safeZones.forEach((zone, idx) => {
      const score = zone.safetyScore
      const color = score >= 70 ? '#22c55e' : score >= 50 ? '#84cc16' : '#ca8a04'

      const zoneIcon = L.divIcon({
        className: 'eq-safezone-marker',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);color:#fff;font-weight:700;font-size:13px;font-family:system-ui;">${idx + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      L.marker([zone.latitude, zone.longitude], { icon: zoneIcon })
        .bindPopup(
          `<div style="font-family:system-ui;min-width:200px;">
            <div style="font-weight:700;color:#22c55e;font-size:13px;">🛡 ZONA AMAN #${idx + 1}</div>
            <div style="font-size:13px;font-weight:600;margin-top:2px;">${zone.name}</div>
            <div style="font-size:12px;color:#555;margin-top:4px;">Jarak: ${zone.distanceKm.toFixed(0)} km</div>
            ${zone.elevationM ? `<div style="font-size:12px;color:#555;">Ketinggian: ${zone.elevationM} m</div>` : ''}
            <div style="font-size:12px;color:#555;">Skor Keamanan: <b style="color:${color}">${zone.safetyScore}/100</b></div>
          </div>`
        )
        .addTo(layer)
    })
  }, [earthquake, safeZones, impactZones])

  return (
    <>
      <style>{`
        @keyframes eq-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
        .leaflet-container {
          background: #0a1a0f;
          font-family: system-ui, sans-serif;
          border-radius: 0.5rem;
          z-index: 0;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 0.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.8) !important;
          font-size: 10px !important;
        }
        .leaflet-bar a {
          background: #fff;
          color: #333;
        }
      `}</style>
      <div ref={mapRef} style={{ height, width: '100%', borderRadius: '0.5rem' }} />
    </>
  )
}
