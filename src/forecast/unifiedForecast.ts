import type { GeoPoint } from '../weather/types'
import { getOpenMeteoBestMatchForecast } from './openMeteo'
import {
  getExtendedIconEnsembleForecast,
  getLongRangeEcmwfEnsembleForecast,
  openMeteoEnsembleProvider,
} from './openMeteoEnsemble'
import {
  addLocalDays,
  appendOutlook,
  createDailyPeriods,
  createUnifiedHourlyForecasts,
  localDateAt,
} from './unifiedForecastAnalytics'
import type { UnifiedForecastResult, UnifiedSourceState } from './unifiedForecastTypes'

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'forecast-source-unavailable'
}

function responseBytes(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('provenance' in value)) return null
  const provenance = value.provenance
  if (!provenance || typeof provenance !== 'object' || !('responseBytes' in provenance)) return null
  return typeof provenance.responseBytes === 'number' ? provenance.responseBytes : null
}

function sourceState(result: PromiseSettledResult<unknown>): UnifiedSourceState {
  return result.status === 'fulfilled'
    ? {
        status: 'available',
        message: null,
        responseBytes: responseBytes(result.value),
      }
    : { status: 'error', message: errorMessage(result.reason), responseBytes: null }
}

export async function loadUnifiedForecast(
  point: GeoPoint,
  signal?: AbortSignal,
): Promise<UnifiedForecastResult> {
  const [operationalResult, shortResult, extendedResult] = await Promise.allSettled([
    getOpenMeteoBestMatchForecast(point, 72, signal),
    openMeteoEnsembleProvider.getForecast(point, signal),
    getExtendedIconEnsembleForecast(point, signal),
  ])
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')

  const operational = operationalResult.status === 'fulfilled' ? operationalResult.value : null
  const short = shortResult.status === 'fulfilled' ? shortResult.value : null
  const extended = extendedResult.status === 'fulfilled' ? extendedResult.value : null
  if (!short && !extended) {
    throw new Error('Both short and extended ensemble sources are unavailable')
  }

  const timezone = short?.timezone ?? extended?.timezone ?? operational?.timezone ?? 'GMT'
  const generatedAt = new Date().toISOString()
  const baseLocalDate = localDateAt(generatedAt, timezone)

  return {
    kind: 'unified-forecast-analytics',
    requestedLocation: { ...point },
    timezone,
    baseLocalDate,
    generatedAt,
    hourly: createUnifiedHourlyForecasts(operational, short, extended, timezone),
    dailyOverview: createDailyPeriods(extended, baseLocalDate, timezone, 0, 6, 'daily'),
    daily: createDailyPeriods(extended, baseLocalDate, timezone, 3, 6, 'daily'),
    outlook: [],
    sources: {
      operational: sourceState(operationalResult),
      shortEnsemble: sourceState(shortResult),
      extendedEnsemble: sourceState(extendedResult),
      longEnsemble: { status: 'not-requested', message: null, responseBytes: null },
    },
    policy: {
      hardSwitchLocalDay: 8,
      blending: 'none',
      longRangeLoading: 'explicit-lazy',
    },
  }
}

export async function loadUnifiedOutlook(
  current: UnifiedForecastResult,
  signal?: AbortSignal,
): Promise<UnifiedForecastResult> {
  const startDate = addLocalDays(current.baseLocalDate, 7)
  const endDate = addLocalDays(current.baseLocalDate, 14)
  try {
    const ensemble = await getLongRangeEcmwfEnsembleForecast(
      current.requestedLocation,
      startDate,
      endDate,
      signal,
    )
    return appendOutlook(current, ensemble, null)
  } catch (error) {
    if (signal?.aborted) throw error
    return appendOutlook(current, null, errorMessage(error))
  }
}
