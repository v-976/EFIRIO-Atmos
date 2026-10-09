import type { TranslationKey } from '../i18n'

const WEATHER_CODE_KEYS: Partial<Record<number, TranslationKey>> = {
  0: 'forecastClearSky',
  1: 'forecastMainlyClear',
  2: 'forecastPartlyCloudy',
  3: 'forecastOvercast',
  45: 'forecastFog',
  48: 'forecastRimeFog',
  51: 'forecastLightDrizzle',
  53: 'forecastDrizzle',
  55: 'forecastHeavyDrizzle',
  56: 'forecastLightFreezingDrizzle',
  57: 'forecastFreezingDrizzle',
  61: 'forecastLightRain',
  63: 'forecastRain',
  65: 'forecastHeavyRain',
  66: 'forecastLightFreezingRain',
  67: 'forecastFreezingRain',
  71: 'forecastLightSnow',
  73: 'forecastSnow',
  75: 'forecastHeavySnow',
  77: 'forecastSnowGrains',
  80: 'forecastLightRainShowers',
  81: 'forecastRainShowers',
  82: 'forecastHeavyRainShowers',
  85: 'forecastLightSnowShowers',
  86: 'forecastSnowShowers',
  95: 'forecastThunderstorm',
  96: 'forecastThunderstormLightHail',
  99: 'forecastThunderstormHeavyHail',
}

export function weatherCodeTranslationKey(code: number | null): TranslationKey {
  return code === null ? 'forecastUnknownCondition' : WEATHER_CODE_KEYS[code] || 'forecastUnknownCondition'
}
