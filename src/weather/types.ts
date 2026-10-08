export interface GeoPoint {
  latitude: number
  longitude: number
}

export type ObservationVariable =
  | 'temperature'
  | 'windSpeed'
  | 'windDirection'
  | 'humidity'
  | 'pressure'
  | 'precipitation1h'
  | 'precipitationIntensity'

export type ObservationQuality = 'notProvided'

export interface ObservationMeasurement {
  variable: ObservationVariable
  value: number
  unit: '°C' | 'm/s' | '°' | '%' | 'hPa' | 'mm' | 'mm/h'
  observedAt: string
  source: string
  quality: ObservationQuality
}

export interface StationObservation {
  station: {
    id: string
    name: string
    location: GeoPoint
    distanceKm: number
  }
  measurements: Partial<Record<ObservationVariable, ObservationMeasurement>>
  lastObservedAt: string
  isStale: boolean
  source: {
    id: string
    name: string
    url: string
    license: string
    licenseUrl: string
  }
}

export interface ObservationProvider {
  readonly id: string
  findNearest(point: GeoPoint, signal?: AbortSignal): Promise<StationObservation | null>
}
