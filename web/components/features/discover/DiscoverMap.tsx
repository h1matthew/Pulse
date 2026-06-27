'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '@/components/providers/theme-provider'
import type { BusinessWithCategory } from '@/types/business'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl

const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
  },
}

function createPinIcon(rating: number | null, hovered: boolean, isDark: boolean): L.DivIcon {
  const label = rating ? rating.toFixed(1) : '—'
  const bg = hovered
    ? (isDark ? '#ffffff' : '#0f172a')
    : (isDark ? '#3b82f6' : '#2563eb')
  const text = hovered && isDark ? '#0f172a' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.3)' : 'white'
  const shadow = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)'
  const w = hovered ? 48 : 40
  const h = hovered ? 28 : 24

  return L.divIcon({
    className: '',
    html: `<div style="
        background:${bg};color:${text};border-radius:9999px;
        width:${w}px;height:${h}px;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;font-family:ui-monospace,monospace;
        box-shadow:0 2px 8px ${shadow};
        border:2px solid ${border};position:relative;
        transition:all 150ms ease;
      ">★ ${label}<div style="
        position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
        border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:7px solid ${bg};
      "></div></div>`,
    iconSize: [w, h + 7],
    iconAnchor: [w / 2, h + 7],
    popupAnchor: [0, -(h + 7)],
  })
}

function ThemeSwapper() {
  const { theme } = useTheme()
  const map = useMap()
  useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer)
    })
    const t = TILES[theme]
    L.tileLayer(t.url, { attribution: t.attribution }).addTo(map)
  }, [theme, map])
  return null
}

function ViewManager({ businesses, center }: { businesses: BusinessWithCategory[]; center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    const pts = businesses.filter(b => b.latitude && b.longitude)
    if (!pts.length) {
      map.setView(center, 13)
      return
    }
    const allPts: [number, number][] = [center, ...pts.map(b => [b.latitude!, b.longitude!] as [number, number])]
    const bounds = L.latLngBounds(allPts)
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
  }, [businesses, center, map])
  return null
}

interface DiscoverMapProps {
  businesses: BusinessWithCategory[]
  hoveredId: string | null
  center: [number, number]
  onPinClick: (id: string) => void
}

export function DiscoverMap({ businesses, hoveredId, center, onPinClick }: DiscoverMapProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const withCoords = useMemo(() => businesses.filter(b => b.latitude && b.longitude), [businesses])
  const tile = TILES[theme]

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <ThemeSwapper />
      <ViewManager businesses={withCoords} center={center} />

      {/* "You are here" pulsing dot */}
      <CircleMarker
        center={center}
        radius={8}
        pathOptions={{
          fillColor: '#3b82f6',
          fillOpacity: 1,
          color: '#ffffff',
          weight: 3,
          opacity: 1,
        }}
      >
        <Popup><span style={{ fontWeight: 600, fontSize: 13 }}>Your location</span></Popup>
      </CircleMarker>
      <CircleMarker
        center={center}
        radius={20}
        pathOptions={{
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          color: '#3b82f6',
          weight: 1,
          opacity: 0.3,
        }}
      />

      {withCoords.map(business => (
        <Marker
          key={business.id}
          position={[business.latitude!, business.longitude!]}
          icon={createPinIcon(business.average_rating, hoveredId === business.id, isDark)}
          zIndexOffset={hoveredId === business.id ? 1000 : 0}
          eventHandlers={{ click: () => onPinClick(business.id) }}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{business.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                {business.average_rating ? `★ ${business.average_rating}` : 'No rating yet'}
                {business.category?.name ? ` · ${business.category.name}` : ''}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
