import { useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type LngLatLike,
  type MapMouseEvent,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Language, Translate } from '../i18n'
import type { StationObservation } from '../weather/types'

setWorkerUrl(workerUrl)

export interface SelectedPoint {
  latitude: number
  longitude: number
}

interface MapViewProps {
  language: Language
  selectedPoint: SelectedPoint | null
  stations: StationObservation[]
  automaticStationId: string | null
  manualStationId: string | null
  onSelectPoint: (point: SelectedPoint) => void
  onSelectStation: (stationId: string) => void
  t: Translate
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const INITIAL_CENTER: LngLatLike = [25.75, 64.5]
const STATION_SOURCE_ID = 'fmi-stations'
const SELECTED_STATION_SOURCE_ID = 'fmi-selected-stations'
const STATION_LAYER_ID = 'fmi-station-points'
const SELECTED_STATION_LAYER_ID = 'fmi-selected-station-points'
const CLUSTER_LAYER_ID = 'fmi-station-clusters'
const CLUSTER_COUNT_LAYER_ID = 'fmi-station-cluster-count'

function stationFeature(station: StationObservation, status: string) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [station.station.location.longitude, station.station.location.latitude],
    },
    properties: {
      stationId: station.station.id,
      status,
    },
  }
}

export function MapView({
  language,
  selectedPoint,
  stations,
  automaticStationId,
  manualStationId,
  onSelectPoint,
  onSelectStation,
  t,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const onSelectPointRef = useRef(onSelectPoint)
  const onSelectStationRef = useRef(onSelectStation)
  const [hasLoadError, setHasLoadError] = useState(false)

  onSelectPointRef.current = onSelectPoint
  onSelectStationRef.current = onSelectStation

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
      const stationLayers = [SELECTED_STATION_LAYER_ID, STATION_LAYER_ID].filter((layerId) => map.getLayer(layerId))
      const stationFeatureAtPoint =
        stationLayers.length > 0 ? map.queryRenderedFeatures(event.point, { layers: stationLayers })[0] : undefined
      const stationId = stationFeatureAtPoint?.properties?.stationId
      if (typeof stationId === 'string') {
        onSelectStationRef.current(stationId)
        return
      }

      if (map.getLayer(CLUSTER_LAYER_ID)) {
        const cluster = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] })[0]
        const clusterId = Number(cluster?.properties?.cluster_id)
        const source = map.getSource(STATION_SOURCE_ID) as GeoJSONSource | undefined
        if (cluster && Number.isFinite(clusterId) && source) {
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const coordinates = (cluster.geometry as GeoJSON.Point).coordinates as [number, number]
            map.easeTo({ center: coordinates, zoom })
          })
          return
        }
      }

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

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updateStations = () => {
      const selectedIds = new Set([automaticStationId, manualStationId].filter(Boolean))
      const regularFeatures = stations
        .filter((station) => !selectedIds.has(station.station.id))
        .map((station) =>
          stationFeature(station, !station.hasData ? 'unavailable' : station.isStale ? 'stale' : 'available'),
        )
      const selectedFeatures = stations
        .filter((station) => selectedIds.has(station.station.id))
        .map((station) =>
          stationFeature(station, station.station.id === manualStationId ? 'manual' : 'automatic'),
        )
      const regularData = { type: 'FeatureCollection' as const, features: regularFeatures }
      const selectedData = { type: 'FeatureCollection' as const, features: selectedFeatures }

      const stationSource = map.getSource(STATION_SOURCE_ID) as GeoJSONSource | undefined
      if (stationSource) {
        stationSource.setData(regularData)
      } else {
        map.addSource(STATION_SOURCE_ID, {
          type: 'geojson',
          data: regularData,
          cluster: true,
          clusterMaxZoom: 11,
          clusterRadius: 34,
        })
        map.addLayer({
          id: CLUSTER_LAYER_ID,
          type: 'circle',
          source: STATION_SOURCE_ID,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#f7f7f4',
            'circle-radius': ['step', ['get', 'point_count'], 13, 5, 16, 12, 20],
            'circle-stroke-color': '#303338',
            'circle-stroke-width': 2,
          },
        })
        map.addLayer({
          id: CLUSTER_COUNT_LAYER_ID,
          type: 'symbol',
          source: STATION_SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 11,
          },
          paint: { 'text-color': '#202225' },
        })
        map.addLayer({
          id: STATION_LAYER_ID,
          type: 'circle',
          source: STATION_SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'match',
              ['get', 'status'],
              'stale',
              '#a7874a',
              'unavailable',
              '#d2d2ce',
              '#73777b',
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        })
      }

      const selectedSource = map.getSource(SELECTED_STATION_SOURCE_ID) as GeoJSONSource | undefined
      if (selectedSource) {
        selectedSource.setData(selectedData)
      } else {
        map.addSource(SELECTED_STATION_SOURCE_ID, { type: 'geojson', data: selectedData })
        map.addLayer({
          id: SELECTED_STATION_LAYER_ID,
          type: 'circle',
          source: SELECTED_STATION_SOURCE_ID,
          paint: {
            'circle-radius': ['match', ['get', 'status'], 'manual', 10, 8],
            'circle-color': ['match', ['get', 'status'], 'manual', '#202225', '#ffffff'],
            'circle-stroke-color': '#202225',
            'circle-stroke-width': 3,
          },
        })
      }
    }

    if (map.getStyle()?.layers?.length) updateStations()
    else map.once('style.load', updateStations)

    return () => {
      map.off('style.load', updateStations)
    }
  }, [stations, automaticStationId, manualStationId])

  return (
    <div className="map-shell" aria-label={t('mapLabel')}>
      <div ref={containerRef} className="map" />
      {hasLoadError && <div className="map-error">{t('mapUnavailable')}</div>}
      {stations.length > 0 && (
        <div className="station-map-key" aria-label={t('stationLegend')}>
          <span><i className="station-key-dot station-key-dot--automatic" />{t('automaticStation')}</span>
          <span><i className="station-key-dot station-key-dot--manual" />{t('manualStation')}</span>
          <span><i className="station-key-dot station-key-dot--available" />{t('availableStation')}</span>
          <span><i className="station-key-dot station-key-dot--stale" />{t('staleStation')}</span>
        </div>
      )}
    </div>
  )
}
