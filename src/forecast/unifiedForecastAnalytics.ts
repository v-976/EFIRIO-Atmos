import {
  calculateConditionalPrecipitationAmount,
  calculateRangeStatistics,
  MINIMUM_VALID_MEMBER_FRACTION,
  PRECIPITATION_EVENT_THRESHOLD_MM,
  requiredValidMembers,
} from './ensembleAnalytics'
import type {
  EnsembleForecastHour,
  EnsembleForecastResult,
  EnsembleMemberHour,
  EnsembleRangeStatistics,
} from './ensembleTypes'
import type { ForecastHour, ForecastResult } from './types'
import type {
  ForecastAvailability,
  ForecastAvailabilityStatus,
  ForecastProvenance,
  ForecastSourceLayer,
  UnifiedDailyForecast,
  UnifiedForecastResult,
  UnifiedHourlyForecast,
  UnifiedRange,
} from './unifiedForecastTypes'

const HOUR_MS = 60 * 60 * 1000

function formatParts(timestamp: string | Date, timezone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(typeof timestamp === 'string' ? new Date(timestamp) : timestamp)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

export function localDateAt(timestamp: string | Date, timezone: string): string {
  const parts = formatParts(timestamp, timezone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function localTimeAt(timestamp: string, timezone: string): string {
  const parts = formatParts(timestamp, timezone)
  return `${parts.hour}:${parts.minute}`
}

export function addLocalDays(localDate: string, days: number): string {
  const date = new Date(`${localDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function localMidnightUtc(localDate: string, timezone: string): Date {
  const [year, month, day] = localDate.split('-').map(Number)
  const nominal = Date.UTC(year, month - 1, day)
  let candidate = nominal
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = formatParts(new Date(candidate), timezone)
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    )
    candidate += nominal - represented
  }
  return new Date(candidate)
}

function provenance(
  layer: ForecastSourceLayer,
  role: 'central' | 'uncertainty-envelope',
  fallback: boolean,
): ForecastProvenance {
  if (layer === 'a3-best-match') {
    return {
      layer,
      providerId: 'open-meteo',
      modelSelection: 'best_match',
      modelIdentifier: null,
      producer: null,
      role,
      fallback,
    }
  }
  const isIcon = layer === 'a5-icon-eps'
  return {
    layer,
    providerId: 'open-meteo',
    modelSelection: 'explicit-ensemble',
    modelIdentifier: isIcon ? 'icon_global_eps' : 'ecmwf_ifs025_ensemble',
    producer: isIcon ? 'DWD' : 'ECMWF',
    role,
    fallback,
  }
}

function statisticsAvailability(statistics: EnsembleRangeStatistics): ForecastAvailability {
  return {
    status: statistics.isSufficient ? 'available' : statistics.validMemberCount > 0 ? 'partial' : 'unavailable',
    validMemberCount: statistics.validMemberCount,
    totalMemberCount: statistics.totalMemberCount,
    reason: statistics.isSufficient ? null : 'insufficient-valid-members',
  }
}

function unavailableAvailability(reason: string): ForecastAvailability {
  return {
    status: 'unavailable',
    validMemberCount: null,
    totalMemberCount: null,
    reason,
  }
}

function rangeFromStatistics(
  statistics: EnsembleRangeStatistics,
  operationalValue: number | null,
  layer: ForecastSourceLayer,
): UnifiedRange {
  const useOperational = operationalValue !== null && Number.isFinite(operationalValue)
  return {
    lower: statistics.lower,
    central: useOperational ? operationalValue : statistics.median,
    upper: statistics.upper,
    centralProvenance: statistics.median === null && !useOperational
      ? null
      : provenance(useOperational ? 'a3-best-match' : layer, 'central', !useOperational),
    envelopeProvenance: provenance(layer, 'uncertainty-envelope', false),
    availability: statisticsAvailability(statistics),
  }
}

function overallAvailability(statuses: ForecastAvailabilityStatus[]): ForecastAvailabilityStatus {
  if (statuses.every((status) => status === 'available')) return 'available'
  if (statuses.every((status) => status === 'unavailable')) return 'unavailable'
  return 'partial'
}

function unavailableRange(layer: ForecastSourceLayer, reason: string): UnifiedRange {
  return {
    lower: null,
    central: null,
    upper: null,
    centralProvenance: null,
    envelopeProvenance: provenance(layer, 'uncertainty-envelope', false),
    availability: unavailableAvailability(reason),
  }
}

function createHourlyPeriod(
  timestamp: string,
  horizon: 'short-hourly' | 'extended-hourly',
  timezone: string,
  ensemble: EnsembleForecastHour | null,
  operational: ForecastHour | null,
): UnifiedHourlyForecast {
  const layer: ForecastSourceLayer = 'a5-icon-eps'
  const temperature = ensemble
    ? rangeFromStatistics(ensemble.temperature, operational?.temperature ?? null, layer)
    : unavailableRange(layer, 'ensemble-hour-missing')
  const precipitationAmount = ensemble
    ? rangeFromStatistics(ensemble.precipitation.amount, operational?.precipitation ?? null, layer)
    : unavailableRange(layer, 'ensemble-hour-missing')
  const windSpeed = ensemble
    ? rangeFromStatistics(ensemble.windSpeed, operational?.windSpeed ?? null, layer)
    : unavailableRange(layer, 'ensemble-hour-missing')
  const pressureMsl = ensemble
    ? rangeFromStatistics(ensemble.pressureMsl, null, layer)
    : unavailableRange(layer, 'ensemble-hour-missing')
  const statuses = [
    temperature.availability.status,
    precipitationAmount.availability.status,
    windSpeed.availability.status,
    pressureMsl.availability.status,
  ]

  return {
    horizon,
    forecastAt: timestamp,
    localDate: localDateAt(timestamp, timezone),
    localTime: localTimeAt(timestamp, timezone),
    timezone,
    weatherCode: operational?.weatherCode ?? null,
    temperature,
    precipitation: {
      probability: ensemble?.precipitation.probability.value ?? null,
      probabilityEvent: 'more-than-0.1-mm-in-hour',
      amount: precipitationAmount,
      conditionalWetAmount: ensemble?.precipitation.conditionalAmount ?? null,
    },
    wind: {
      speed: windSpeed,
      direction: {
        value: operational?.windDirection ?? null,
        provenance: operational?.windDirection == null ? null : provenance('a3-best-match', 'central', false),
      },
    },
    pressureMsl,
    availability: overallAvailability(statuses),
  }
}

export function createUnifiedHourlyForecasts(
  operational: ForecastResult | null,
  shortEnsemble: EnsembleForecastResult | null,
  extendedEnsemble: EnsembleForecastResult | null,
  timezone: string,
): UnifiedHourlyForecast[] {
  const firstTimestamp = shortEnsemble?.hours[0]?.forecastAt ?? extendedEnsemble?.hours[0]?.forecastAt
  if (!firstTimestamp) return []
  const start = new Date(firstTimestamp).getTime()
  const operationalByTime = new Map(operational?.hours.map((hour) => [hour.forecastAt, hour]) ?? [])
  const shortByTime = new Map(shortEnsemble?.hours.map((hour) => [hour.forecastAt, hour]) ?? [])
  const extendedByTime = new Map(extendedEnsemble?.hours.map((hour) => [hour.forecastAt, hour]) ?? [])

  return Array.from({ length: 72 }, (_, index) => {
    const timestamp = new Date(start + index * HOUR_MS).toISOString()
    const ensemble = index < 24
      ? shortByTime.get(timestamp) ?? extendedByTime.get(timestamp) ?? null
      : extendedByTime.get(timestamp) ?? null
    return createHourlyPeriod(
      timestamp,
      index < 24 ? 'short-hourly' : 'extended-hourly',
      timezone,
      ensemble,
      operationalByTime.get(timestamp) ?? null,
    )
  })
}

type DailyMemberAggregate = {
  temperatureMin: number | null
  temperatureMean: number | null
  temperatureMax: number | null
  precipitationTotal: number | null
  precipitationWet: boolean | null
  windMean: number | null
  windMax: number | null
  pressureMin: number | null
  pressureMean: number | null
  pressureMax: number | null
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function aggregateVariable(
  hours: EnsembleMemberHour[],
  expectedTimestamps: string[],
  nativeStepHours: number,
  select: (hour: EnsembleMemberHour) => number | null,
): number[] | null {
  const valuesByTime = new Map(hours.map((hour) => [hour.forecastAt, select(hour)]))
  const normalizedValues = expectedTimestamps.map((timestamp) => valuesByTime.get(timestamp) ?? null)
  const nativeValues = expectedTimestamps
    .filter((timestamp) => Math.floor(new Date(timestamp).getTime() / HOUR_MS) % nativeStepHours === 0)
    .map((timestamp) => valuesByTime.get(timestamp) ?? null)
  const finiteNormalized = normalizedValues.filter((value): value is number => value !== null && Number.isFinite(value))
  const finiteNative = nativeValues.filter((value): value is number => value !== null && Number.isFinite(value))
  const normalizedEnough = expectedTimestamps.length > 0
    && finiteNormalized.length >= Math.ceil(expectedTimestamps.length * MINIMUM_VALID_MEMBER_FRACTION)
  const nativeEnough = nativeValues.length > 0
    && finiteNative.length >= Math.ceil(nativeValues.length * MINIMUM_VALID_MEMBER_FRACTION)
  return normalizedEnough && nativeEnough ? finiteNormalized : null
}

function aggregateMemberDay(
  memberHours: EnsembleMemberHour[],
  expectedTimestamps: string[],
  nativeStepHours: number,
): DailyMemberAggregate {
  const temperature = aggregateVariable(memberHours, expectedTimestamps, nativeStepHours, (hour) => hour.temperature)
  const precipitation = aggregateVariable(memberHours, expectedTimestamps, nativeStepHours, (hour) => hour.precipitation)
  const wind = aggregateVariable(memberHours, expectedTimestamps, nativeStepHours, (hour) => hour.windSpeed)
  const pressure = aggregateVariable(memberHours, expectedTimestamps, nativeStepHours, (hour) => hour.pressureMsl)
  return {
    temperatureMin: temperature ? Math.min(...temperature) : null,
    temperatureMean: temperature ? mean(temperature) : null,
    temperatureMax: temperature ? Math.max(...temperature) : null,
    precipitationTotal: precipitation ? precipitation.reduce((sum, value) => sum + value, 0) : null,
    precipitationWet: precipitation
      ? precipitation.some((value) => value > PRECIPITATION_EVENT_THRESHOLD_MM)
      : null,
    windMean: wind ? mean(wind) : null,
    windMax: wind ? Math.max(...wind) : null,
    pressureMin: pressure ? Math.min(...pressure) : null,
    pressureMean: pressure ? mean(pressure) : null,
    pressureMax: pressure ? Math.max(...pressure) : null,
  }
}

function compositeRange(
  lowerStatistics: EnsembleRangeStatistics,
  centralStatistics: EnsembleRangeStatistics,
  upperStatistics: EnsembleRangeStatistics,
  layer: ForecastSourceLayer,
): UnifiedRange {
  const isSufficient = lowerStatistics.isSufficient && centralStatistics.isSufficient && upperStatistics.isSufficient
  const validMemberCount = Math.min(
    lowerStatistics.validMemberCount,
    centralStatistics.validMemberCount,
    upperStatistics.validMemberCount,
  )
  return {
    lower: isSufficient ? lowerStatistics.lower : null,
    central: isSufficient ? centralStatistics.median : null,
    upper: isSufficient ? upperStatistics.upper : null,
    centralProvenance: isSufficient ? provenance(layer, 'central', true) : null,
    envelopeProvenance: provenance(layer, 'uncertainty-envelope', false),
    availability: {
      status: isSufficient ? 'available' : validMemberCount > 0 ? 'partial' : 'unavailable',
      validMemberCount,
      totalMemberCount: centralStatistics.totalMemberCount,
      reason: isSufficient ? null : 'insufficient-daily-member-coverage',
    },
  }
}

export function createUnifiedDailyForecast(
  ensemble: EnsembleForecastResult,
  localDate: string,
  horizon: 'daily' | 'outlook',
  nativeStepHours: 1 | 6,
): UnifiedDailyForecast {
  const layer: ForecastSourceLayer = horizon === 'daily' ? 'a5-icon-eps' : 'a5-ecmwf-ifs-ens'
  const expectedTimestamps = ensemble.hours
    .map((hour) => hour.forecastAt)
    .filter((timestamp) => localDateAt(timestamp, ensemble.timezone) === localDate)
  const aggregates = ensemble.members.map((member) =>
    aggregateMemberDay(
      member.hours.filter((hour) => localDateAt(hour.forecastAt, ensemble.timezone) === localDate),
      expectedTimestamps,
      nativeStepHours,
    ),
  )
  const total = ensemble.model.totalMemberCount
  const temperature = compositeRange(
    calculateRangeStatistics(aggregates.map((value) => value.temperatureMin), total),
    calculateRangeStatistics(aggregates.map((value) => value.temperatureMean), total),
    calculateRangeStatistics(aggregates.map((value) => value.temperatureMax), total),
    layer,
  )
  const precipitationStatistics = calculateRangeStatistics(
    aggregates.map((value) => value.precipitationTotal),
    total,
  )
  const precipitationAmount = rangeFromStatistics(precipitationStatistics, null, layer)
  const precipitationValid = aggregates.filter((value) => value.precipitationWet !== null)
  const wet = precipitationValid.filter((value) => value.precipitationWet)
  const probabilitySufficient = precipitationValid.length >= requiredValidMembers(total)
  const typicalWind = rangeFromStatistics(
    calculateRangeStatistics(aggregates.map((value) => value.windMean), total),
    null,
    layer,
  )
  const maximumWind = rangeFromStatistics(
    calculateRangeStatistics(aggregates.map((value) => value.windMax), total),
    null,
    layer,
  )
  const pressure = compositeRange(
    calculateRangeStatistics(aggregates.map((value) => value.pressureMin), total),
    calculateRangeStatistics(aggregates.map((value) => value.pressureMean), total),
    calculateRangeStatistics(aggregates.map((value) => value.pressureMax), total),
    layer,
  )
  const statuses = [
    temperature.availability.status,
    precipitationAmount.availability.status,
    typicalWind.availability.status,
    maximumWind.availability.status,
    pressure.availability.status,
  ]

  return {
    horizon,
    localDate,
    timezone: ensemble.timezone,
    utcStart: localMidnightUtc(localDate, ensemble.timezone).toISOString(),
    utcEndExclusive: localMidnightUtc(addLocalDays(localDate, 1), ensemble.timezone).toISOString(),
    temperature,
    precipitation: {
      probability: probabilitySufficient ? (wet.length / precipitationValid.length) * 100 : null,
      probabilityEvent: 'at-least-one-hour-over-0.1-mm-in-local-day',
      amount: precipitationAmount,
      conditionalWetAmount: calculateConditionalPrecipitationAmount(
        wet.map((value) => value.precipitationTotal),
      ),
    },
    wind: { typicalSpeed: typicalWind, maximumSpeed: maximumWind },
    pressureMsl: pressure,
    availability: overallAvailability(statuses),
    provenance: provenance(layer, 'uncertainty-envelope', false),
    temporalSemantics: horizon === 'daily'
      ? 'native-hourly-daily-aggregate'
      : 'normalized-hourly-from-6-hourly-guidance',
  }
}

export function createUnavailableDailyForecast(
  localDate: string,
  timezone: string,
  horizon: 'daily' | 'outlook',
  reason: string,
): UnifiedDailyForecast {
  const layer: ForecastSourceLayer = horizon === 'daily' ? 'a5-icon-eps' : 'a5-ecmwf-ifs-ens'
  const missing = () => unavailableRange(layer, reason)
  return {
    horizon,
    localDate,
    timezone,
    utcStart: localMidnightUtc(localDate, timezone).toISOString(),
    utcEndExclusive: localMidnightUtc(addLocalDays(localDate, 1), timezone).toISOString(),
    temperature: missing(),
    precipitation: {
      probability: null,
      probabilityEvent: 'at-least-one-hour-over-0.1-mm-in-local-day',
      amount: missing(),
      conditionalWetAmount: null,
    },
    wind: { typicalSpeed: missing(), maximumSpeed: missing() },
    pressureMsl: missing(),
    availability: 'unavailable',
    provenance: provenance(layer, 'uncertainty-envelope', false),
    temporalSemantics: horizon === 'daily'
      ? 'native-hourly-daily-aggregate'
      : 'normalized-hourly-from-6-hourly-guidance',
  }
}

export function createDailyPeriods(
  ensemble: EnsembleForecastResult | null,
  baseLocalDate: string,
  timezone: string,
  startOffset: number,
  endOffset: number,
  horizon: 'daily' | 'outlook',
): UnifiedDailyForecast[] {
  const nativeStep = horizon === 'daily' ? 1 : 6
  return Array.from({ length: endOffset - startOffset + 1 }, (_, index) => {
    const localDate = addLocalDays(baseLocalDate, startOffset + index)
    return ensemble
      ? createUnifiedDailyForecast(ensemble, localDate, horizon, nativeStep)
      : createUnavailableDailyForecast(localDate, timezone, horizon, 'source-unavailable')
  })
}

export function appendOutlook(
  result: UnifiedForecastResult,
  ensemble: EnsembleForecastResult | null,
  errorMessage: string | null,
): UnifiedForecastResult {
  return {
    ...result,
    generatedAt: new Date().toISOString(),
    outlook: createDailyPeriods(ensemble, result.baseLocalDate, result.timezone, 7, 14, 'outlook'),
    sources: {
      ...result.sources,
      longEnsemble: ensemble
        ? { status: 'available', message: null, responseBytes: ensemble.provenance.responseBytes }
        : { status: 'error', message: errorMessage ?? 'long-range-source-unavailable', responseBytes: null },
    },
  }
}
