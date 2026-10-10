import type { TemperatureUnit, WindSpeedUnit } from '../settings'
import type { EnsembleRangeStatistics } from './ensembleTypes'

export interface DisplayRangeStatistics extends EnsembleRangeStatistics {
  unit: '°C' | '°F' | 'm/s' | 'km/h'
}

function convertRange(
  statistics: EnsembleRangeStatistics,
  convert: (value: number) => number,
  unit: DisplayRangeStatistics['unit'],
): DisplayRangeStatistics {
  const map = (value: number | null) => (value === null ? null : convert(value))
  return {
    ...statistics,
    lower: map(statistics.lower),
    median: map(statistics.median),
    upper: map(statistics.upper),
    absoluteMin: map(statistics.absoluteMin),
    absoluteMax: map(statistics.absoluteMax),
    unit,
  }
}

export function convertEnsembleTemperature(
  statistics: EnsembleRangeStatistics,
  unit: TemperatureUnit,
): DisplayRangeStatistics {
  return unit === 'fahrenheit'
    ? convertRange(statistics, (value) => (value * 9) / 5 + 32, '°F')
    : convertRange(statistics, (value) => value, '°C')
}

export function convertEnsembleWindSpeed(
  statistics: EnsembleRangeStatistics,
  unit: WindSpeedUnit,
): DisplayRangeStatistics {
  return unit === 'kilometersPerHour'
    ? convertRange(statistics, (value) => value * 3.6, 'km/h')
    : convertRange(statistics, (value) => value, 'm/s')
}
