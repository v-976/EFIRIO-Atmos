import type { GeoPoint } from '../weather/types'
import type { ForecastHour, ForecastProvider, ForecastResult } from './types'

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const HOURLY_VARIABLES = [
  'temperature_2m',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_direction_10m',
  'weather_code',
].join(',')
const FORECAST_HOURS = 24
const CACHE_TTL_MS = 15 * 60 * 1000

interface OpenMeteoHourly {
  time?: unknown[]
  temperature_2m?: unknown[]
  precipitation?: unknown[]
  precipitation_probability?: unknown[]
  wind_speed_10m?: unknown[]
  wind_direction_10m?: unknown[]
  weather_code?: unknown[]
}

interface OpenMeteoResponse {
  latitude?: unknown
  longitude?: unknown
  timezone?: unknown
  hourly?: OpenMeteoHourly
}

interface CachedForecast {
  expiresAt: number
  result: ForecastResult
}

const forecastCache = new Map<string, CachedForecast>()

function coordinateKey(point: GeoPoint): string {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function requiredNumber(value: unknown, field: string): number {
  const number = optionalNumber(value)
  if (number === null) throw new Error(`Open-Meteo response is missing ${field}`)
  return number
}

function parseForecastHour(hourly: OpenMeteoHourly, index: number): ForecastHour | null {
  const unixTime = optionalNumber(hourly.time?.[index])
  if (unixTime === null) return null

  const forecastAt = new Date(unixTime * 1000)
  if (!Number.isFinite(forecastAt.getTime())) return null

  return {
    kind: 'forecast',
    forecastAt: forecastAt.toISOString(),
    temperature: optionalNumber(hourly.temperature_2m?.[index]),
    precipitation: optionalNumber(hourly.precipitation?.[index]),
    precipitationProbability: optionalNumber(hourly.precipitation_probability?.[index]),
    windSpeed: optionalNumber(hourly.wind_speed_10m?.[index]),
    windDirection: optionalNumber(hourly.wind_direction_10m?.[index]),
    weatherCode: optionalNumber(hourly.weather_code?.[index]),
  }
}

function parseResponse(response: OpenMeteoResponse, point: GeoPoint): ForecastResult {
  if (!response.hourly || !Array.isArray(response.hourly.time)) {
    throw new Error('Open-Meteo response is missing hourly forecast data')
  }

  const hours = response.hourly.time
    .slice(0, FORECAST_HOURS)
    .map((_, index) => parseForecastHour(response.hourly!, index))
    .filter((hour): hour is ForecastHour => Boolean(hour))

  if (hours.length === 0) throw new Error('Open-Meteo returned no valid forecast timestamps')

  return {
    kind: 'forecast',
    provider: {
      id: 'open-meteo',
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Weather data by Open-Meteo.com',
    },
    // The generic API combines best-suited models but does not identify the chosen model in this response.
    model: null,
    modelSelection: 'best_match',
    requestedLocation: { ...point },
    resolvedLocation: {
      latitude: requiredNumber(response.latitude, 'latitude'),
      longitude: requiredNumber(response.longitude, 'longitude'),
    },
    fetchedAt: new Date().toISOString(),
    generatedAt: null,
    timezone: typeof response.timezone === 'string' ? response.timezone : 'GMT',
    units: {
      temperature: '°C',
      precipitation: 'mm',
      precipitationProbability: '%',
      windSpeed: 'm/s',
      windDirection: '°',
      weatherCode: 'WMO code',
    },
    hours,
    provenance: {
      endpoint: OPEN_METEO_FORECAST_URL,
      dataKind: 'numerical weather prediction',
      coordinateDisclosure: 'requested coordinates sent to provider',
      notes: 'Open-Meteo best_match combines the highest-resolution applicable weather models.',
    },
  }
}

function requestUrl(point: GeoPoint): string {
  const parameters = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    hourly: HOURLY_VARIABLES,
    forecast_hours: String(FORECAST_HOURS),
    timeformat: 'unixtime',
    timezone: 'GMT',
    temperature_unit: 'celsius',
    wind_speed_unit: 'ms',
    precipitation_unit: 'mm',
  })
  return `${OPEN_METEO_FORECAST_URL}?${parameters}`
}

export const openMeteoForecastProvider: ForecastProvider = {
  id: 'open-meteo',
  async getForecast(point, signal) {
    const key = coordinateKey(point)
    const cached = forecastCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.result

    const response = await fetch(requestUrl(point), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!response.ok) throw new Error(`Open-Meteo request failed with status ${response.status}`)

    const result = parseResponse((await response.json()) as OpenMeteoResponse, point)
    forecastCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result })
    return result
  },
}
