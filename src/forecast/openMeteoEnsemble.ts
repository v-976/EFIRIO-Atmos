import type { GeoPoint } from '../weather/types'
import {
  calculatePrecipitationStatistics,
  calculateRangeStatistics,
  MINIMUM_VALID_MEMBER_COUNT,
  MINIMUM_VALID_MEMBER_FRACTION,
} from './ensembleAnalytics'
import { ECMWF_IFS_025_ENSEMBLE, ICON_GLOBAL_ENSEMBLE } from './ensembleModelRegistry'
import type {
  EnsembleForecastHour,
  EnsembleForecastProvider,
  EnsembleForecastResult,
  EnsembleMemberForecast,
  EnsembleMemberHour,
  EnsembleModelMetadata,
} from './ensembleTypes'

const OPEN_METEO_ENSEMBLE_URL = 'https://ensemble-api.open-meteo.com/v1/ensemble'
const SHORT_VARIABLES = [
  'temperature_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_direction_10m',
  'pressure_msl',
] as const
const DAILY_VARIABLES = [
  'temperature_2m',
  'precipitation',
  'wind_speed_10m',
  'pressure_msl',
] as const
const SHORT_FORECAST_HOURS = 24
export const SHORT_ENSEMBLE_CACHE_TTL_MS = 15 * 60 * 1000
export const EXTENDED_ICON_CACHE_TTL_MS = 6 * 60 * 60 * 1000
export const LONG_ECMWF_CACHE_TTL_MS = 3 * 60 * 60 * 1000

interface OpenMeteoEnsembleResponse {
  latitude?: unknown
  longitude?: unknown
  timezone?: unknown
  hourly?: Record<string, unknown>
}

interface CachedForecast {
  expiresAt: number
  result: EnsembleForecastResult
}

interface ParseOptions {
  model: EnsembleModelMetadata
  maximumHours?: number
  responseBytes?: number | null
}

interface EnsembleRequest {
  model: EnsembleModelMetadata
  variables: readonly string[]
  cacheTtlMs: number
  forecastHours?: number
  forecastDays?: number
  startDate?: string
  endDate?: string
}

const forecastCache = new Map<string, CachedForecast>()

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function requiredNumber(value: unknown, field: string): number {
  const number = optionalNumber(value)
  if (number === null) throw new Error(`Open-Meteo ensemble response is missing ${field}`)
  return number
}

function readArray(hourly: Record<string, unknown>, key: string): unknown[] | null {
  const value = hourly[key]
  return Array.isArray(value) ? value : null
}

function memberSuffix(index: number): string | null {
  return index === 0 ? null : `member${String(index).padStart(2, '0')}`
}

function memberField(variable: string, suffix: string | null): string {
  return suffix ? `${variable}_${suffix}` : variable
}

function parseMember(
  hourly: Record<string, unknown>,
  timeEntries: Array<{ forecastAt: string; sourceIndex: number }>,
  memberIndex: number,
): EnsembleMemberForecast {
  const suffix = memberSuffix(memberIndex)
  const temperature = readArray(hourly, memberField('temperature_2m', suffix))
  const precipitation = readArray(hourly, memberField('precipitation', suffix))
  const windSpeed = readArray(hourly, memberField('wind_speed_10m', suffix))
  const windDirection = readArray(hourly, memberField('wind_direction_10m', suffix))
  const pressureMsl = readArray(hourly, memberField('pressure_msl', suffix))
  const isAvailable = [temperature, precipitation, windSpeed, windDirection, pressureMsl].some(Boolean)

  return {
    memberId: `member${String(memberIndex).padStart(2, '0')}`,
    responseSuffix: suffix,
    role: 'not-specified-by-api',
    status: isAvailable ? 'success' : 'unavailable',
    hours: isAvailable
      ? timeEntries.map(({ forecastAt, sourceIndex }) => ({
          forecastAt,
          temperature: optionalNumber(temperature?.[sourceIndex]),
          precipitation: optionalNumber(precipitation?.[sourceIndex]),
          windSpeed: optionalNumber(windSpeed?.[sourceIndex]),
          windDirection: optionalNumber(windDirection?.[sourceIndex]),
          pressureMsl: optionalNumber(pressureMsl?.[sourceIndex]),
        }))
      : [],
  }
}

function createHours(
  timestamps: string[],
  members: EnsembleMemberForecast[],
  totalMemberCount: number,
): EnsembleForecastHour[] {
  const memberHours = new Map(
    members.map((member) => [member.memberId, new Map(member.hours.map((hour) => [hour.forecastAt, hour]))]),
  )

  return timestamps.map((forecastAt) => {
    const byMember = Object.fromEntries(
      members.map((member) => [member.memberId, memberHours.get(member.memberId)?.get(forecastAt) || null]),
    ) as Record<string, EnsembleMemberHour | null>
    const values = Object.values(byMember)
    return {
      forecastAt,
      members: byMember,
      temperature: calculateRangeStatistics(values.map((value) => value?.temperature ?? null), totalMemberCount),
      windSpeed: calculateRangeStatistics(values.map((value) => value?.windSpeed ?? null), totalMemberCount),
      precipitation: calculatePrecipitationStatistics(
        values.map((value) => value?.precipitation ?? null),
        totalMemberCount,
      ),
      pressureMsl: calculateRangeStatistics(values.map((value) => value?.pressureMsl ?? null), totalMemberCount),
    }
  })
}

export function parseOpenMeteoEnsembleResponse(
  response: OpenMeteoEnsembleResponse,
  point: GeoPoint,
  options: ParseOptions = { model: ICON_GLOBAL_ENSEMBLE, maximumHours: SHORT_FORECAST_HOURS },
): EnsembleForecastResult {
  if (!response.hourly) throw new Error('Open-Meteo ensemble response is missing hourly data')
  const rawTimes = readArray(response.hourly, 'time')
  if (!rawTimes) throw new Error('Open-Meteo ensemble response is missing hourly timestamps')

  const limitedTimes = options.maximumHours ? rawTimes.slice(0, options.maximumHours) : rawTimes
  const timeEntries = limitedTimes
    .map((value, sourceIndex) => ({ unixTime: optionalNumber(value), sourceIndex }))
    .filter((entry): entry is { unixTime: number; sourceIndex: number } => entry.unixTime !== null)
    .map(({ unixTime, sourceIndex }) => ({
      forecastAt: new Date(unixTime * 1000).toISOString(),
      sourceIndex,
    }))
  if (timeEntries.length === 0) throw new Error('Open-Meteo returned no valid ensemble timestamps')

  const members = Array.from({ length: options.model.totalMemberCount }, (_, index) =>
    parseMember(response.hourly!, timeEntries, index),
  )
  const timestamps = timeEntries.map(({ forecastAt }) => forecastAt)
  const lastSuffix = `member${String(options.model.totalMemberCount - 1).padStart(2, '0')}`
  const isIcon = options.model.id === ICON_GLOBAL_ENSEMBLE.id

  return {
    kind: 'ensemble-forecast',
    provider: {
      id: 'open-meteo',
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Weather data by Open-Meteo.com',
    },
    model: options.model,
    requestedLocation: { ...point },
    resolvedLocation: {
      latitude: requiredNumber(response.latitude, 'latitude'),
      longitude: requiredNumber(response.longitude, 'longitude'),
    },
    timezone: typeof response.timezone === 'string' ? response.timezone : 'GMT',
    fetchedAt: new Date().toISOString(),
    units: {
      temperature: '°C',
      precipitation: 'mm',
      windSpeed: 'm/s',
      windDirection: '°',
      pressureMsl: 'hPa',
    },
    members,
    hours: createHours(timestamps, members, options.model.totalMemberCount),
    provenance: {
      endpoint: OPEN_METEO_ENSEMBLE_URL,
      requestedModelIdentifier: options.model.openMeteoIdentifier,
      responseModelIdentifier: null,
      memberFieldPattern: `variable, variable_member01 … variable_${lastSuffix}`,
      temporalNormalization: isIcon
        ? 'Open-Meteo normalizes ensemble output to hourly; ICON-EPS Global is documented as natively hourly.'
        : 'Open-Meteo normalizes output to hourly; ECMWF IFS ENS is natively 3-hourly and 6-hourly after 144 hours.',
      precipitationProbabilityMethod:
        'Local share of valid members forecasting more than 0.1 mm during the preceding hour.',
      quantileMethod: 'Linear-interpolated P10, median and P90 across finite valid member values.',
      minimumValidMembers: MINIMUM_VALID_MEMBER_COUNT,
      minimumValidFraction: MINIMUM_VALID_MEMBER_FRACTION,
      responseBytes: options.responseBytes ?? null,
      notes:
        'The API does not identify control versus perturbed roles in this response; member roles remain unspecified.',
    },
  }
}

function coordinateKey(point: GeoPoint): string {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`
}

function requestKey(point: GeoPoint, request: EnsembleRequest): string {
  return [
    coordinateKey(point),
    request.model.openMeteoIdentifier,
    request.variables.join(','),
    request.forecastHours ?? '',
    request.forecastDays ?? '',
    request.startDate ?? '',
    request.endDate ?? '',
  ].join(':')
}

function requestUrl(point: GeoPoint, request: EnsembleRequest): string {
  const parameters = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    hourly: request.variables.join(','),
    models: request.model.openMeteoIdentifier,
    timeformat: 'unixtime',
    timezone: 'auto',
    temperature_unit: 'celsius',
    wind_speed_unit: 'ms',
    precipitation_unit: 'mm',
  })
  if (request.forecastHours) parameters.set('forecast_hours', String(request.forecastHours))
  if (request.forecastDays) parameters.set('forecast_days', String(request.forecastDays))
  if (request.startDate) parameters.set('start_date', request.startDate)
  if (request.endDate) parameters.set('end_date', request.endDate)
  return `${OPEN_METEO_ENSEMBLE_URL}?${parameters}`
}

async function getEnsembleForecast(
  point: GeoPoint,
  request: EnsembleRequest,
  signal?: AbortSignal,
): Promise<EnsembleForecastResult> {
  const key = requestKey(point, request)
  const cached = forecastCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.result

  const response = await fetch(requestUrl(point, request), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error(`Open-Meteo ensemble request failed with status ${response.status}`)

  const body = await response.text()
  const result = parseOpenMeteoEnsembleResponse(JSON.parse(body) as OpenMeteoEnsembleResponse, point, {
    model: request.model,
    maximumHours: request.forecastHours,
    responseBytes: new TextEncoder().encode(body).byteLength,
  })
  forecastCache.set(key, { expiresAt: Date.now() + request.cacheTtlMs, result })
  return result
}

const shortIconRequest: EnsembleRequest = {
  model: ICON_GLOBAL_ENSEMBLE,
  variables: SHORT_VARIABLES,
  forecastHours: SHORT_FORECAST_HOURS,
  cacheTtlMs: SHORT_ENSEMBLE_CACHE_TTL_MS,
}

export const openMeteoEnsembleProvider: EnsembleForecastProvider = {
  id: 'open-meteo-icon-global-ensemble',
  getForecast(point, signal) {
    return getEnsembleForecast(point, shortIconRequest, signal)
  },
}

export function getExtendedIconEnsembleForecast(
  point: GeoPoint,
  signal?: AbortSignal,
): Promise<EnsembleForecastResult> {
  return getEnsembleForecast(
    point,
    {
      model: ICON_GLOBAL_ENSEMBLE,
      variables: DAILY_VARIABLES,
      forecastDays: 7,
      cacheTtlMs: EXTENDED_ICON_CACHE_TTL_MS,
    },
    signal,
  )
}

export function getLongRangeEcmwfEnsembleForecast(
  point: GeoPoint,
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<EnsembleForecastResult> {
  return getEnsembleForecast(
    point,
    {
      model: ECMWF_IFS_025_ENSEMBLE,
      variables: DAILY_VARIABLES,
      startDate,
      endDate,
      cacheTtlMs: LONG_ECMWF_CACHE_TTL_MS,
    },
    signal,
  )
}
