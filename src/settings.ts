import { detectLanguage, type Language } from './i18n'

export type TemperatureUnit = 'celsius' | 'fahrenheit'
export type WindSpeedUnit = 'metersPerSecond' | 'kilometersPerHour'

export interface Settings {
  language: Language
  languageIsManual: boolean
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
}

const STORAGE_KEY = 'efirio-atmos-settings'

interface StoredSettings {
  language?: Language
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
}

function isStoredSettings(value: unknown): value is StoredSettings {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<StoredSettings>
  return (
    (candidate.language === undefined || candidate.language === 'ru' || candidate.language === 'en') &&
    (candidate.temperatureUnit === 'celsius' || candidate.temperatureUnit === 'fahrenheit') &&
    (candidate.windSpeedUnit === 'metersPerSecond' || candidate.windSpeedUnit === 'kilometersPerHour')
  )
}

export function loadSettings(): Settings {
  const defaults: Settings = {
    language: detectLanguage(),
    languageIsManual: false,
    temperatureUnit: 'celsius',
    windSpeedUnit: 'metersPerSecond',
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaults

    const parsed: unknown = JSON.parse(stored)
    if (!isStoredSettings(parsed)) return defaults

    return {
      language: parsed.language ?? detectLanguage(),
      languageIsManual: parsed.language !== undefined,
      temperatureUnit: parsed.temperatureUnit,
      windSpeedUnit: parsed.windSpeedUnit,
    }
  } catch {
    return defaults
  }
}

export function saveSettings(settings: Settings): void {
  try {
    const stored: StoredSettings = {
      temperatureUnit: settings.temperatureUnit,
      windSpeedUnit: settings.windSpeedUnit,
      ...(settings.languageIsManual ? { language: settings.language } : {}),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // The interface remains usable when storage is blocked or unavailable.
  }
}
