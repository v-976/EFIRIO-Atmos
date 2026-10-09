import type { GeoPoint } from '../weather/types'

export interface ForecastHour {
  kind: 'forecast'
  forecastAt: string
  temperature: number | null
  precipitation: number | null
  precipitationProbability: number | null
  windSpeed: number | null
  windDirection: number | null
  weatherCode: number | null
}

export interface ForecastResult {
  kind: 'forecast'
  provider: {
    id: string
    name: string
    url: string
    license: string
    licenseUrl: string
    attribution: string
  }
  model: {
    id: string
    name: string
  } | null
  modelSelection: 'best_match'
  requestedLocation: GeoPoint
  resolvedLocation: GeoPoint
  fetchedAt: string
  generatedAt: string | null
  timezone: string
  units: {
    temperature: '°C'
    precipitation: 'mm'
    precipitationProbability: '%'
    windSpeed: 'm/s'
    windDirection: '°'
    weatherCode: 'WMO code'
  }
  hours: ForecastHour[]
  provenance: {
    endpoint: string
    dataKind: 'numerical weather prediction'
    coordinateDisclosure: 'requested coordinates sent to provider'
    notes: string
  }
}

export interface ForecastProvider {
  readonly id: string
  getForecast(point: GeoPoint, signal?: AbortSignal): Promise<ForecastResult>
}
