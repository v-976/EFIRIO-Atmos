import type { GeoPoint } from '../weather/types'

export type EnsembleModelId = 'dwd-icon-eps-global' | 'ecmwf-ifs-025-ensemble'

export interface EnsembleModelMetadata {
  id: EnsembleModelId
  producer: {
    id: 'dwd' | 'ecmwf'
    name: string
  }
  displayName: string
  openMeteoIdentifier: string
  coverage: 'global'
  totalMemberCount: number
  spatialResolution: string
  temporalResolution: string
  forecastHorizon: string
  updateFrequency: string
}

export interface EnsembleMemberHour {
  forecastAt: string
  temperature: number | null
  precipitation: number | null
  windSpeed: number | null
  windDirection: number | null
  pressureMsl: number | null
}

export interface EnsembleMemberForecast {
  memberId: string
  responseSuffix: string | null
  role: 'not-specified-by-api'
  status: 'success' | 'unavailable'
  hours: EnsembleMemberHour[]
}

export interface EnsembleRangeStatistics {
  lowerQuantile: 0.1
  upperQuantile: 0.9
  lower: number | null
  median: number | null
  upper: number | null
  absoluteMin: number | null
  absoluteMax: number | null
  validMemberCount: number
  totalMemberCount: number
  isSufficient: boolean
}

export interface PrecipitationProbability {
  value: number | null
  eventThresholdMm: 0.1
  comparison: 'greater-than'
  eventMemberCount: number
  validMemberCount: number
  totalMemberCount: number
}

export interface ConditionalPrecipitationAmount {
  lower: number
  median: number
  upper: number
  eventMemberCount: number
}

export interface EnsemblePrecipitationStatistics {
  amount: EnsembleRangeStatistics
  probability: PrecipitationProbability
  conditionalAmount: ConditionalPrecipitationAmount | null
}

export interface EnsembleForecastHour {
  forecastAt: string
  members: Record<string, EnsembleMemberHour | null>
  temperature: EnsembleRangeStatistics
  windSpeed: EnsembleRangeStatistics
  precipitation: EnsemblePrecipitationStatistics
  pressureMsl: EnsembleRangeStatistics
}

export interface EnsembleForecastResult {
  kind: 'ensemble-forecast'
  provider: {
    id: 'open-meteo'
    name: 'Open-Meteo'
    url: string
    license: 'CC BY 4.0'
    licenseUrl: string
    attribution: string
  }
  model: EnsembleModelMetadata
  requestedLocation: GeoPoint
  resolvedLocation: GeoPoint
  timezone: string
  fetchedAt: string
  units: {
    temperature: '°C'
    precipitation: 'mm'
    windSpeed: 'm/s'
    windDirection: '°'
    pressureMsl: 'hPa'
  }
  members: EnsembleMemberForecast[]
  hours: EnsembleForecastHour[]
  provenance: {
    endpoint: string
    requestedModelIdentifier: string
    responseModelIdentifier: null
    memberFieldPattern: string
    temporalNormalization: string
    precipitationProbabilityMethod: string
    quantileMethod: string
    minimumValidMembers: number
    minimumValidFraction: number
    responseBytes: number | null
    notes: string
  }
}

export interface EnsembleForecastProvider {
  readonly id: string
  getForecast(point: GeoPoint, signal?: AbortSignal): Promise<EnsembleForecastResult>
}
