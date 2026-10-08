export type Language = 'ru' | 'en'

const translations = {
  ru: {
    appName: 'EFIRIO Atmos',
    appTagline: 'Погода рядом — прозрачно и точно',
    settings: 'Настройки',
    closeSettings: 'Закрыть настройки',
    language: 'Язык интерфейса',
    russian: 'Русский',
    english: 'English',
    temperatureUnit: 'Температура',
    windSpeedUnit: 'Скорость ветра',
    celsius: 'Цельсий (°C)',
    fahrenheit: 'Фаренгейт (°F)',
    metersPerSecond: 'Метры в секунду (м/с)',
    kilometersPerHour: 'Километры в час (км/ч)',
    selectedPoint: 'Выбранная точка',
    selectPointHint: 'Нажмите на карту, чтобы выбрать точку',
    latitude: 'Широта',
    longitude: 'Долгота',
    weatherUnavailable: 'Метеоданные пока не подключены',
    localSettingsNotice: 'Настройки сохраняются только на этом устройстве.',
    mapUnavailable: 'Не удалось загрузить карту. Проверьте подключение к сети.',
    mapLabel: 'Интерактивная карта выбора точки',
    zoomIn: 'Увеличить масштаб',
    zoomOut: 'Уменьшить масштаб',
    resetBearing: 'Сбросить направление карты',
  },
  en: {
    appName: 'EFIRIO Atmos',
    appTagline: 'Nearby weather, clearly explained',
    settings: 'Settings',
    closeSettings: 'Close settings',
    language: 'Interface language',
    russian: 'Русский',
    english: 'English',
    temperatureUnit: 'Temperature',
    windSpeedUnit: 'Wind speed',
    celsius: 'Celsius (°C)',
    fahrenheit: 'Fahrenheit (°F)',
    metersPerSecond: 'Meters per second (m/s)',
    kilometersPerHour: 'Kilometers per hour (km/h)',
    selectedPoint: 'Selected point',
    selectPointHint: 'Tap the map to select a point',
    latitude: 'Latitude',
    longitude: 'Longitude',
    weatherUnavailable: 'Weather data is not connected yet',
    localSettingsNotice: 'Settings are stored on this device only.',
    mapUnavailable: 'The map could not be loaded. Check your network connection.',
    mapLabel: 'Interactive point selection map',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetBearing: 'Reset map bearing',
  },
} as const

export type TranslationKey = keyof (typeof translations)['en']
export type Translate = (key: TranslationKey) => string

export function detectLanguage(): Language {
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function createTranslator(language: Language): Translate {
  return (key) => translations[language][key]
}
