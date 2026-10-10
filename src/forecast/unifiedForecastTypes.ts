import type { GeoPoint } from '../weather/types'
import type { ConditionalPrecipitationAmount } from './ensembleTypes'

export type UnifiedHorizon = 'short-hourly' | 'extended-hourly' | 'daily' | 'outlook'
export type ForecastAvailabilityStatus = 'available' | 'partial' | 'unavailable'
export type ForecastSourceLayer = 'a3-best-match' | 'a5-icon-eps' | 'a5-ecmwf-ifs-ens'

export interface ForecastProvenance {
  layer: ForecastSourceLayer
  providerId: 'open-meteo'
  modelSelection: 'best_match' | 'explicit-ensemble'
  modelIdentifier: string | null
  producer: string | null
  role: 'central' | 'uncertainty-envelope'
  fallback: boolean
}

export interface ForecastAvailability {
  status: ForecastAvailabilityStatus
  validMemberCount: number | null
  totalMemberCount: number | null
  reason: string | null
}

export interface UnifiedRange {
  lower: number | null
  central: number | null
  upper: number | null
  centralProvenance: ForecastProvenance | null
  envelopeProvenance: ForecastProvenance
  availability: ForecastAvailability
}

export interface UnifiedPrecipitation {
  probability: number | null
  probabilityEvent: 'more-than-0.1-mm-in-hour' | 'at-least-one-hour-over-0.1-mm-in-local-day'
  amount: UnifiedRange
  conditionalWetAmount: ConditionalPrecipitationAmount | null
}

export interface UnifiedWind {
  speed: UnifiedRange
  direction: {
    value: number | null
    provenance: ForecastProvenance | null
  }
}

export interface UnifiedHourlyForecast {
  horizon: 'short-hourly' | 'extended-hourly'
  forecastAt: string
  localDate: string
  localTime: string
  timezone: string
  weatherCode: number | null
  temperature: UnifiedRange
  precipitation: UnifiedPrecipitation
  wind: UnifiedWind
  pressureMsl: UnifiedRange
  availability: ForecastAvailabilityStatus
}

export interface UnifiedDailyForecast {
  horizon: 'daily' | 'outlook'
  localDate: string
  timezone: string
  utcStart: string
  utcEndExclusive: string
  temperature: UnifiedRange
  precipitation: UnifiedPrecipitation
  wind: {
    typicalSpeed: UnifiedRange
    maximumSpeed: UnifiedRange
  }
  pressureMsl: UnifiedRange
  availability: ForecastAvailabilityStatus
  provenance: ForecastProvenance
  temporalSemantics: 'native-hourly-daily-aggregate' | 'normalized-hourly-from-6-hourly-guidance'
}

export interface UnifiedSourceState {
  status: 'available' | 'error' | 'not-requested'
  message: string | null
  responseBytes: number | null
}

export interface UnifiedForecastResult {
  kind: 'unified-forecast-analytics'
  requestedLocation: GeoPoint
  timezone: string
  baseLocalDate: string
  generatedAt: string
  hourly: UnifiedHourlyForecast[]
  dailyOverview: UnifiedDailyForecast[]
  daily: UnifiedDailyForecast[]
  outlook: UnifiedDailyForecast[]
  sources: {
    operational: UnifiedSourceState
    shortEnsemble: UnifiedSourceState
    extendedEnsemble: UnifiedSourceState
    longEnsemble: UnifiedSourceState
  }
  policy: {
    hardSwitchLocalDay: 8
    blending: 'none'
    longRangeLoading: 'explicit-lazy'
  }
}
