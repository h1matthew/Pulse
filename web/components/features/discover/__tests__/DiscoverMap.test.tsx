/**
 * @vitest-environment jsdom
 *
 * Regression: Leaflet's map panes use high z-indexes (tiles/markers/popups at
 * z-200..700) and its in-map controls sit at z-[1000]. Without an isolating
 * stacking context on the map wrapper, those paint OVER page-level overlays
 * such as the onboarding tour (z-120) wherever they overlap — the map bled
 * through the tour card. The wrapper must keep the `isolate` class so Leaflet's
 * z-indexes stay confined to the map's own box.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// react-leaflet + cluster + leaflet touch many browser APIs jsdom lacks; mock
// them down to simple wrappers so the component renders its own DOM.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn(), invalidateSize: vi.fn() }),
}))

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('leaflet', () => {
  const L = {
    Icon: { Default: { prototype: {} } },
    divIcon: () => ({}),
    latLngBounds: () => ({}),
    point: () => ({}),
  }
  return { default: L }
})

import { DiscoverMap } from '../DiscoverMap'

describe('DiscoverMap (tour overlay stacking)', () => {
  it('isolates the map so Leaflet z-indexes cannot cover the onboarding tour', () => {
    const { container } = render(
      <DiscoverMap
        businesses={[]}
        hoveredId={null}
        center={[29.42, -98.49]}
        onPinClick={() => {}}
        onPinHover={() => {}}
      />
    )

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('isolate')
  })
})
