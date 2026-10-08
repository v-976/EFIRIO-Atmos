import { useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type LngLatLike,
  type MapMouseEvent,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Language, Translate } from '../i18n'

setWorkerUrl(workerUrl)

export interface SelectedPoint {
  latitude: number
  longitude: number
}

interface MapViewProps {
  language: Language
  selectedPoint: SelectedPoint | null
  onSelectPoint: (point: SelectedPoint) => void
  t: Translate
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const INITIAL_CENTER: LngLatLike = [25.75, 64.5]

export function MapView({ language, selectedPoint, onSelectPoint, t }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const onSelectPointRef = useRef(onSelectPoint)
  const [hasLoadError, setHasLoadError] = useState(false)

  onSelectPointRef.current = onSelectPoint

  useEffect(() => {
    if (!containerRef.current) return

    const map = new Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: INITIAL_CENTER,
      zoom: 4.2,
      minZoom: 1,
      attributionControl: false,
      locale: {
        'NavigationControl.ZoomIn': t('zoomIn'),
        'NavigationControl.ZoomOut': t('zoomOut'),
        'NavigationControl.ResetBearing': t('resetBearing'),
      },
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(
      new AttributionControl({
        compact: true,
      }),
      'bottom-right',
    )

    map.on('click', (event: MapMouseEvent) => {
      onSelectPointRef.current({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      })
    })
    map.once('load', () => setHasLoadError(false))
    map.once('error', () => setHasLoadError(true))
    mapRef.current = map

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateButtonLabel = (selector: string, label: string) => {
      const button = container.querySelector<HTMLButtonElement>(selector)
      button?.setAttribute('aria-label', label)
      button?.setAttribute('title', label)
    }

    updateButtonLabel('.maplibregl-ctrl-zoom-in', t('zoomIn'))
    updateButtonLabel('.maplibregl-ctrl-zoom-out', t('zoomOut'))
  }, [language, t])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedPoint) return

    markerRef.current?.remove()
    markerRef.current = new Marker({ color: '#202225' })
      .setLngLat([selectedPoint.longitude, selectedPoint.latitude])
      .addTo(map)
  }, [selectedPoint])

  return (
    <div className="map-shell" aria-label={t('mapLabel')}>
      <div ref={containerRef} className="map" />
      {hasLoadError && <div className="map-error">{t('mapUnavailable')}</div>}
    </div>
  )
}
