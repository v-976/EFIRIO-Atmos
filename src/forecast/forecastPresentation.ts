import type { Language, Translate } from '../i18n'
import type { Settings, TemperatureUnit, WindSpeedUnit } from '../settings'
import type { UnifiedPrecipitation, UnifiedRange } from './unifiedForecastTypes'

const RANGE_SEPARATOR = '…'

function signedInteger(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}

function convertTemperature(value: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? (value * 9) / 5 + 32 : value
}

function convertWind(value: number, unit: WindSpeedUnit): number {
  return unit === 'kilometersPerHour' ? value * 3.6 : value
}

function integerRange(lower: number, upper: number, signed = false): string {
  const roundedLower = Math.floor(lower)
  const roundedUpper = Math.ceil(upper)
  const format = signed ? signedInteger : String
  return roundedLower === roundedUpper
    ? format(roundedLower)
    : `${format(roundedLower)}${RANGE_SEPARATOR}${format(roundedUpper)}`
}

export function formatTemperatureRange(range: UnifiedRange, unit: TemperatureUnit): string | null {
  if (range.lower === null || range.upper === null) return null
  const lower = convertTemperature(range.lower, unit)
  const upper = convertTemperature(range.upper, unit)
  return `${integerRange(lower, upper, true)} ${unit === 'fahrenheit' ? '°F' : '°C'}`
}

export function roundProbability(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, Math.round(value / 5) * 5))
}

function precipitationBound(value: number, edge: 'lower' | 'upper'): number {
  const scale = Math.abs(value) < 10 ? 10 : 1
  return (edge === 'lower' ? Math.floor(value * scale) : Math.ceil(value * scale)) / scale
}

function formatPrecipitationNumber(value: number): string {
  if (value === 0) return '0'
  if (Math.abs(value) < 10) return value.toFixed(1)
  return value.toFixed(0)
}

export interface PrecipitationAmountPresentation {
  text: string
  conditional: boolean
}

export function formatPrecipitationAmount(
  precipitation: UnifiedPrecipitation,
): PrecipitationAmountPresentation | null {
  const roundedProbability = roundProbability(precipitation.probability)
  const useConditional = roundedProbability !== null
    && roundedProbability >= 50
    && precipitation.amount.central === 0
    && precipitation.conditionalWetAmount !== null
  const lower = useConditional
    ? precipitation.conditionalWetAmount!.lower
    : precipitation.amount.lower
  const upper = useConditional
    ? precipitation.conditionalWetAmount!.upper
    : precipitation.amount.upper
  if (lower === null || upper === null) return null

  const roundedLower = precipitationBound(lower, 'lower')
  const roundedUpper = precipitationBound(upper, 'upper')
  const range = roundedLower === roundedUpper
    ? formatPrecipitationNumber(roundedLower)
    : `${formatPrecipitationNumber(roundedLower)}${RANGE_SEPARATOR}${formatPrecipitationNumber(roundedUpper)}`
  return { text: `${range} mm`, conditional: useConditional }
}

export function formatWindRange(range: UnifiedRange, unit: WindSpeedUnit): string | null {
  if (range.lower === null || range.upper === null) return null
  const lower = convertWind(range.lower, unit)
  const upper = convertWind(range.upper, unit)
  const label = unit === 'kilometersPerHour' ? 'km/h' : 'm/s'
  return `${integerRange(lower, upper)} ${label}`
}

export function formatPressureRange(range: UnifiedRange): string | null {
  if (range.lower === null || range.upper === null) return null
  return `${integerRange(range.lower, range.upper)} hPa`
}

export interface WindDirectionPresentation {
  arrow: '↑' | '↗' | '→' | '↘' | '↓' | '↙' | '←' | '↖'
  label: string
}

const WIND_ARROWS: WindDirectionPresentation['arrow'][] = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
const WIND_LABELS: Record<Language, string[]> = {
  ru: ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'],
  en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
}

export function formatWindDirection(
  value: number | null,
  language: Language,
): WindDirectionPresentation | null {
  if (value === null || !Number.isFinite(value)) return null
  const normalized = ((value % 360) + 360) % 360
  const sector = Math.floor((normalized + 22.5) / 45) % 8
  return { arrow: WIND_ARROWS[sector], label: WIND_LABELS[language][sector] }
}

export function formatLocalDateLabel(
  localDate: string,
  baseLocalDate: string,
  settings: Settings,
  t: Translate,
): string {
  if (localDate === baseLocalDate) return t('forecastToday')
  const tomorrow = new Date(`${baseLocalDate}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (localDate === tomorrow.toISOString().slice(0, 10)) return t('forecastTomorrow')
  return new Intl.DateTimeFormat(settings.language === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${localDate}T12:00:00Z`))
}
