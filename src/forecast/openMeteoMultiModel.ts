import type { GeoPoint } from '../weather/types'
import { DEFAULT_FORECAST_MODEL_IDS, FORECAST_MODEL_REGISTRY } from './modelRegistry'
import type {
  ComparisonRange,
  ForecastModelId,
  ModelForecast,
  ModelForecastHour,
  MultiModelForecastProvider,
  MultiModelForecastResult,
  MultiModelTimelineHour,
  PrecipitationRange,
} from './multiModelTypes'

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const HOURLY_VARIABLES = [
  'temperature_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_direction_10m',
  'weather_code',
].join(',')
const FORECAST_HOURS = 24
const CACHE_TTL_MS = 15 * 60 * 1000

interface OpenMeteoMultiModelResponse {
  latitude?: unknown
  longitude?: unknown
  timezone?: unknown
  hourly?: Record<string, unknown>
}

interface CachedForecast {
  expiresAt: number
  result: MultiModelForecastResult
}

const forecastCache = new Map<string, CachedForecast>()

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function requiredNumber(value: unknown, field: string): number {
  const number = optionalNumber(value)
  if (number === null) throw new Error(`Open-Meteo multi-model response is missing ${field}`)
  return number
}

function readArray(hourly: Record<string, unknown>, key: string): unknown[] | null {
  const value = hourly[key]
  return Array.isArray(value) ? value : null
}

function responseKey(variable: string, modelIdentifier: string): string {
  return `${variable}_${modelIdentifier}`
}

function parseModel(
  hourly: Record<string, unknown>,
  timeEntries: Array<{ unixTime: number; sourceIndex: number }>,
  point: GeoPoint,
  modelId: ForecastModelId,
): ModelForecast {
  const model = FORECAST_MODEL_REGISTRY[modelId]
  const identifier = model.openMeteoIdentifier
  const temperature = readArray(hourly, responseKey('temperature_2m', identifier))
  const precipitation = readArray(hourly, responseKey('precipitation', identifier))
  const windSpeed = readArray(hourly, responseKey('wind_speed_10m', identifier))
  const windDirection = readArray(hourly, responseKey('wind_direction_10m', identifier))
  const weatherCode = readArray(hourly, responseKey('weather_code', identifier))
  const responseModelIdentifier = [temperature, precipitation, windSpeed, windDirection, weatherCode].some(Boolean)
    ? identifier
    : null

  const base = {
    model,
    requestedLocation: { ...point },
    // A multi-model response exposes only one response-level grid coordinate, not one per model.
    resolvedLocation: null,
    responseModelIdentifier,
  }

  if (!responseModelIdentifier) {
    return { ...base, status: 'unavailable', reason: 'model-data-missing', hours: [] }
  }

  const hours = timeEntries.map<ModelForecastHour>(({ unixTime, sourceIndex }) => ({
    kind: 'forecast',
    modelId,
    forecastAt: new Date(unixTime * 1000).toISOString(),
    temperature: optionalNumber(temperature?.[sourceIndex]),
    precipitation: optionalNumber(precipitation?.[sourceIndex]),
    windSpeed: optionalNumber(windSpeed?.[sourceIndex]),
    windDirection: optionalNumber(windDirection?.[sourceIndex]),
    weatherCode: optionalNumber(weatherCode?.[sourceIndex]),
  }))

  return { ...base, status: 'success', hours }
}

function comparisonRange(values: Array<number | null>): ComparisonRange {
  const available = values.filter((value): value is number => value !== null)
  return {
    min: available.length ? Math.min(...available) : null,
    max: available.length ? Math.max(...available) : null,
    spread: available.length >= 2 ? Math.max(...available) - Math.min(...available) : null,
    availableModelCount: available.length,
  }
}

function precipitationRange(values: Array<number | null>): PrecipitationRange {
  const available = values.filter((value): value is number => value !== null)
  return {
    min: available.length ? Math.min(...available) : null,
    max: available.length ? Math.max(...available) : null,
    availableModelCount: available.length,
  }
}

function createTimeline(
  models: ModelForecast[],
  modelIds: readonly ForecastModelId[],
  forecastTimestamps: string[],
): MultiModelTimelineHour[] {
  const modelHours = new Map<ForecastModelId, Map<string, ModelForecastHour>>()
  const timestamps = new Set(forecastTimestamps)

  for (const model of models) {
    const byTimestamp = new Map<string, ModelForecastHour>()
    for (const hour of model.hours) {
      byTimestamp.set(hour.forecastAt, hour)
      timestamps.add(hour.forecastAt)
    }
    modelHours.set(model.model.id, byTimestamp)
  }

  return [...timestamps]
    .sort()
    .slice(0, FORECAST_HOURS)
    .map((forecastAt) => {
      const hours = Object.fromEntries(
        DEFAULT_FORECAST_MODEL_IDS.map((modelId) => [modelId, modelHours.get(modelId)?.get(forecastAt) || null]),
      ) as Record<ForecastModelId, ModelForecastHour | null>
      const selectedHours = modelIds.map((modelId) => hours[modelId])
      return {
        forecastAt,
        models: hours,
        availableModelCount: selectedHours.filter(Boolean).length,
        temperature: comparisonRange(selectedHours.map((hour) => hour?.temperature ?? null)),
        windSpeed: comparisonRange(selectedHours.map((hour) => hour?.windSpeed ?? null)),
        precipitation: precipitationRange(selectedHours.map((hour) => hour?.precipitation ?? null)),
      }
    })
}

export function parseOpenMeteoMultiModelResponse(
  response: OpenMeteoMultiModelResponse,
  point: GeoPoint,
  modelIds: readonly ForecastModelId[] = DEFAULT_FORECAST_MODEL_IDS,
): MultiModelForecastResult {
  if (!response.hourly) throw new Error('Open-Meteo multi-model response is missing hourly data')
  const rawTimes = readArray(response.hourly, 'time')
  if (!rawTimes) throw new Error('Open-Meteo multi-model response is missing hourly timestamps')

  const timeEntries = rawTimes
    .slice(0, FORECAST_HOURS)
    .map((value, sourceIndex) => ({ unixTime: optionalNumber(value), sourceIndex }))
    .filter((entry): entry is { unixTime: number; sourceIndex: number } => entry.unixTime !== null)
  if (timeEntries.length === 0) throw new Error('Open-Meteo returned no valid multi-model timestamps')

  const models = modelIds.map((modelId) => parseModel(response.hourly!, timeEntries, point, modelId))
  return {
    kind: 'multi-model-forecast',
    provider: {
      id: 'open-meteo',
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Weather data by Open-Meteo.com',
    },
    requestedLocation: { ...point },
    responseLocation: {
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
      weatherCode: 'WMO code',
    },
    models,
    timeline: createTimeline(
      models,
      modelIds,
      timeEntries.map(({ unixTime }) => new Date(unixTime * 1000).toISOString()),
    ),
    provenance: {
      endpoint: OPEN_METEO_FORECAST_URL,
      requestStrategy: 'single-request-multiple-models',
      timelineAlignment: 'timestamp',
      temporalNormalization:
        'Open-Meteo returns a normalized hourly series; these models document native hourly steps for the first 24 hours.',
      precipitationProbabilityIncluded: false,
      notes:
        'Registry producer metadata is separate from model identifiers confirmed by suffixed fields in the API response.',
    },
  }
}

function cacheKey(point: GeoPoint, modelIds: readonly ForecastModelId[]): string {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}:${[...modelIds].sort().join(',')}`
}

function requestUrl(point: GeoPoint, modelIds: readonly ForecastModelId[]): string {
  const parameters = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    hourly: HOURLY_VARIABLES,
    models: modelIds.map((modelId) => FORECAST_MODEL_REGISTRY[modelId].openMeteoIdentifier).join(','),
    forecast_hours: String(FORECAST_HOURS),
    timeformat: 'unixtime',
    timezone: 'auto',
    temperature_unit: 'celsius',
    wind_speed_unit: 'ms',
    precipitation_unit: 'mm',
  })
  return `${OPEN_METEO_FORECAST_URL}?${parameters}`
}

export const openMeteoMultiModelProvider: MultiModelForecastProvider = {
  id: 'open-meteo-multi-model',
  async getForecast(point, modelIds = DEFAULT_FORECAST_MODEL_IDS, signal) {
    const key = cacheKey(point, modelIds)
    const cached = forecastCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.result

    const response = await fetch(requestUrl(point, modelIds), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!response.ok) throw new Error(`Open-Meteo multi-model request failed with status ${response.status}`)

    const result = parseOpenMeteoMultiModelResponse(
      (await response.json()) as OpenMeteoMultiModelResponse,
      point,
      modelIds,
    )
    forecastCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result })
    return result
  },
}
