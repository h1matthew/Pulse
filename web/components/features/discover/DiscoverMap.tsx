'use client'

import { useEffect, useMemo, useCallback, useRef, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '@/components/providers/theme-provider'
import { centeredBounds } from '@/lib/discover/mapBounds'
import { buildBusinessPhotoUrl, buildBusinessFallbackImageUrl, getBusinessReviewLabel } from '@/lib/business/display'
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

// Clean Zillow-style pill markers: a white pill with an amber star + rating by
// default, switching to a filled brand-blue pill (and lifting above its
// neighbors) when it's the active/hovered result.
function createPinIcon(rating: number | null, hovered: boolean, isDark: boolean): L.DivIcon {
  const hasRating = rating != null && rating > 0
  const label = hasRating ? rating.toFixed(1) : 'New'

  let bg: string, color: string, star: string, ring: string, shadow: string
  if (hovered) {
    bg = '#2563eb'
    color = '#ffffff'
    star = '#ffffff'
    ring = isDark ? 'rgba(255,255,255,0.65)' : '#ffffff'
    shadow = '0 6px 16px rgba(37,99,235,0.45)'
  } else if (isDark) {
    bg = '#1f2937'
    color = '#f8fafc'
    star = '#fbbf24'
    ring = 'rgba(255,255,255,0.18)'
    shadow = '0 2px 6px rgba(0,0,0,0.55)'
  } else {
    bg = '#ffffff'
    color = '#0f172a'
    star = '#f59e0b'
    ring = 'rgba(15,23,42,0.08)'
    shadow = '0 2px 6px rgba(0,0,0,0.28)'
  }

  const h = 26
  // Approximate the pill width from its content so the tail stays centered.
  const starW = hasRating ? 15 : 0
  const w = Math.ceil(18 + starW + label.length * 7.5)
  const scale = hovered ? 1.12 : 1
  const starSpan = hasRating
    ? `<span style="color:${star};margin-right:3px;font-size:12px;line-height:1;">★</span>`
    : ''

  return L.divIcon({
    className: '',
    html: `<div style="
        transform:scale(${scale});transform-origin:center bottom;
        display:flex;align-items:center;justify-content:center;
        width:${w}px;height:${h}px;
        background:${bg};color:${color};border-radius:9999px;
        border:1px solid ${ring};box-shadow:${shadow};
        font:600 12px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;
        white-space:nowrap;position:relative;
        transition:transform 120ms ease, box-shadow 120ms ease;
      ">${starSpan}${label}<span style="
        position:absolute;left:50%;bottom:-4px;
        width:9px;height:9px;background:${bg};
        border-right:1px solid ${ring};border-bottom:1px solid ${ring};
        transform:translateX(-50%) rotate(45deg);
      "></span></div>`,
    iconSize: [w, h + 6],
    iconAnchor: [w / 2, h + 6],
    popupAnchor: [0, -(h + 2)],
  })
}

/** Photo URL for a business card, falling back to a generated cover. */
function cardPhotoUrl(business: BusinessWithCategory): string {
  return (
    buildBusinessPhotoUrl(business.photos?.[0], { maxWidth: 480, maxHeight: 320 }) ||
    buildBusinessFallbackImageUrl({ name: business.name, categoryName: business.category?.name })
  )
}

interface BusinessMarkerProps {
  business: BusinessWithCategory
  isActive: boolean
  isDark: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

/**
 * A single map pin + its photo-card popup, memoized so it only re-renders when
 * its own active/hover state flips. Without this, changing the hovered pin
 * re-rendered all ~hundreds of markers at once (the main source of map lag).
 */
const BusinessMarker = memo(function BusinessMarker({ business, isActive, isDark, onClick, onHover }: BusinessMarkerProps) {
  const markerRef = useRef<L.Marker>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const icon = useMemo(
    () => createPinIcon(business.average_rating, isActive, isDark),
    [business.average_rating, isActive, isDark],
  )

  // Keep the popup open while the cursor is on the pin OR the card. Leaving
  // either schedules a close; entering the other cancels it, so moving from the
  // pin to the card doesn't dismiss the popup. Leaving both closes it.
  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => markerRef.current?.closePopup(), 150)
  }, [cancelClose])
  useEffect(() => () => cancelClose(), [cancelClose])

  const open = useCallback(() => {
    cancelClose()
    onHover(business.id)
    markerRef.current?.openPopup()
  }, [business.id, onHover, cancelClose])
  const close = useCallback(() => {
    onHover(null)
    scheduleClose()
  }, [onHover, scheduleClose])

  const eventHandlers = useMemo(
    () => ({
      click: () => onClick(business.id),
      mouseover: open,
      mouseout: close,
    }),
    [business.id, onClick, open, close],
  )

  const locationLine = [business.city, business.state].filter(Boolean).join(', ')
  const meta = [business.category?.name, locationLine].filter(Boolean).join(' · ')
  const reviewLabel = getBusinessReviewLabel({ data_source: business.data_source, review_count: business.review_count })
  const price = business.price_range ? '$'.repeat(business.price_range) : null
  const fallback = buildBusinessFallbackImageUrl({ name: business.name, categoryName: business.category?.name })

  return (
    <Marker
      ref={markerRef}
      position={[business.latitude!, business.longitude!]}
      icon={icon}
      zIndexOffset={isActive ? 1000 : 0}
      eventHandlers={eventHandlers}
    >
      <Popup className="biz-popup" maxWidth={260} minWidth={240} autoPan={false} closeButton>
        <a
          href={`/business/${business.id}`}
          onMouseEnter={open}
          onMouseLeave={close}
          style={{ display: 'block', width: 240, color: 'var(--foreground)', textDecoration: 'none' }}
        >
          <div style={{ position: 'relative', height: 132, width: '100%', background: 'var(--muted)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardPhotoUrl(business)}
              alt={business.name}
              loading="lazy"
              style={{ height: '100%', width: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if (img.src !== fallback) img.src = fallback
              }}
            />
            {business.average_rating ? (
              <span
                style={{
                  position: 'absolute', left: 10, bottom: 10,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 9999,
                  background: 'rgba(15,23,42,0.78)', color: '#fff',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                <span style={{ color: '#fbbf24' }}>★</span>
                {business.average_rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <div style={{ padding: '10px 12px 12px' }}>
            <p
              style={{
                margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--foreground)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {business.name}
            </p>
            {meta ? (
              <p
                style={{
                  margin: '2px 0 0', fontSize: 12, color: 'var(--muted-foreground)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {meta}
              </p>
            ) : null}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>
              <span>{reviewLabel}</span>
              {price ? <span style={{ fontFamily: 'ui-monospace, monospace' }}>{price}</span> : null}
            </div>
            <span
              style={{
                marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', height: 34, borderRadius: 9999,
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              View details
            </span>
          </div>
        </a>
      </Popup>
    </Marker>
  )
})

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

function ViewManager({ center, businesses }: { center: [number, number]; businesses: BusinessWithCategory[] }) {
  const map = useMap()

  // The map is dynamically imported into a flex container, so on first paint
  // Leaflet often measures the wrong size (blank/grey tiles, mis-computed
  // bounds). Recalculate whenever the window resizes and once on mount.
  useEffect(() => {
    const recalc = () => map.invalidateSize()
    const id = requestAnimationFrame(recalc)
    window.addEventListener('resize', recalc)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', recalc)
    }
  }, [map])

  useEffect(() => {
    // Make sure the viewport size is current before fitting (see above).
    map.invalidateSize()

    // Zoom in tight to where the results actually are, centered on the user.
    // The search radius can be much larger than the dense cluster of results
    // (downtown packs the nearest few hundred into a couple of miles), so
    // fitting the results — not the radius — keeps the view as zoomed-in as
    // possible while still showing every pin.
    const pts = (businesses ?? []).filter(b => b.latitude && b.longitude)
    if (!pts.length) {
      map.setView(center, 12)
      return
    }
    const [sw, ne] = centeredBounds(center, pts)
    map.fitBounds(L.latLngBounds(sw, ne), { padding: [40, 40], maxZoom: 16 })
  }, [center, businesses, map])
  return null
}

interface DiscoverMapProps {
  businesses: BusinessWithCategory[]
  hoveredId: string | null
  center: [number, number]
  onPinClick: (id: string) => void
  onPinHover?: (id: string | null) => void
}

export function DiscoverMap({ businesses, hoveredId, center, onPinClick, onPinHover }: DiscoverMapProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const withCoords = useMemo(() => businesses.filter(b => b.latitude && b.longitude), [businesses])
  const tile = TILES[theme]

  // Stable hover handler so memoized markers don't re-render every time the
  // parent re-renders (only when their own active state actually changes).
  const handleHover = useCallback((id: string | null) => onPinHover?.(id), [onPinHover])

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <ThemeSwapper />
      <ViewManager center={center} businesses={withCoords} />

      {/* "You are here" dot */}
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
        <BusinessMarker
          key={business.id}
          business={business}
          isActive={hoveredId === business.id}
          isDark={isDark}
          onClick={onPinClick}
          onHover={handleHover}
        />
      ))}
    </MapContainer>
  )
}
