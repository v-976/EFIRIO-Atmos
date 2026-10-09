import type { TemperatureUnit, WindSpeedUnit } from '../settings'
import type { ForecastHour } from './types'

export interface ForecastDisplayHour extends Omit<ForecastHour, 'temperature' | 'windSpeed'> {
  temperature: { value: number; unit: '°C' | '°F' } | null
  windSpeed: { value: number; unit: 'm/s' | 'km/h' } | null
}

export function convertForecastHour(
  hour: ForecastHour,
  temperatureUnit: TemperatureUnit,
  windSpeedUnit: WindSpeedUnit,
): ForecastDisplayHour {
  const temperature =
    hour.temperature === null
      ? null
      : temperatureUnit === 'fahrenheit'
        ? { value: (hour.temperature * 9) / 5 + 32, unit: '°F' as const }
        : { value: hour.temperature, unit: '°C' as const }
  const windSpeed =
    hour.windSpeed === null
      ? null
      : windSpeedUnit === 'kilometersPerHour'
        ? { value: hour.windSpeed * 3.6, unit: 'km/h' as const }
        : { value: hour.windSpeed, unit: 'm/s' as const }

  return { ...hour, temperature, windSpeed }
}
