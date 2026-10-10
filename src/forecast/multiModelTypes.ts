import type { GeoPoint } from '../weather/types'

export type ForecastModelId = 'ecmwf-ifs' | 'noaa-gfs' | 'dwd-icon-global'

export interface ForecastModelMetadata {
  id: ForecastModelId
  producer: {
    id: 'ecmwf' | 'noaa' | 'dwd'
    name: string
  }
  displayName: string
  openMeteoIdentifier: string
  coverage: 'global'
  temporalResolution: string
}

export interface ModelForecastHour {
  kind: 'forecast'
  modelId: ForecastModelId
  forecastAt: string
  temperature: number | null
  precipitation: number | null
  windSpeed: number | null
  windDirection: number | null
  weatherCode: number | null
}

interface ModelForecastBase {
  model: ForecastModelMetadata
  requestedLocation: GeoPoint
  resolvedLocation: GeoPoint | null
  responseModelIdentifier: string | null
}

export type ModelForecast =
  | (ModelForecastBase & {
      status: 'success'
      hours: ModelForecastHour[]
    })
  | (ModelForecastBase & {
      status: 'unavailable'
      reason: 'model-data-missing'
      hours: []
    })

export interface ComparisonRange {
  min: number | null
  max: number | null
  spread: number | null
  availableModelCount: number
}

export interface PrecipitationRange {
  min: number | null
  max: number | null
  availableModelCount: number
}

export interface MultiModelTimelineHour {
  forecastAt: string
  models: Record<ForecastModelId, ModelForecastHour | null>
  availableModelCount: number
  temperature: ComparisonRange
  windSpeed: ComparisonRange
  precipitation: PrecipitationRange
}

export interface MultiModelForecastResult {
  kind: 'multi-model-forecast'
  provider: {
    id: 'open-meteo'
    name: 'Open-Meteo'
    url: string
    license: 'CC BY 4.0'
    licenseUrl: string
    attribution: string
  }
  requestedLocation: GeoPoint
  responseLocation: GeoPoint
  timezone: string
  fetchedAt: string
  units: {
    temperature: '°C'
    precipitation: 'mm'
    windSpeed: 'm/s'
    windDirection: '°'
    weatherCode: 'WMO code'
  }
  models: ModelForecast[]
  timeline: MultiModelTimelineHour[]
  provenance: {
    endpoint: string
    requestStrategy: 'single-request-multiple-models'
    timelineAlignment: 'timestamp'
    temporalNormalization: string
    precipitationProbabilityIncluded: false
    notes: string
  }
}

export interface MultiModelForecastProvider {
  readonly id: string
  getForecast(
    point: GeoPoint,
    modelIds?: readonly ForecastModelId[],
    signal?: AbortSignal,
  ): Promise<MultiModelForecastResult>
}
