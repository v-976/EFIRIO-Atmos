import type { Translate } from '../i18n'
import type { Settings } from '../settings'
import type { WeatherState } from '../weather/useWeatherObservation'
import type { ObservationMeasurement, ObservationVariable } from '../weather/types'
import type { StationObservation } from '../weather/types'
import type { SelectedPoint } from './MapView'

export type ObservationTab = 'weather' | 'windPrecipitation' | 'station'

interface WeatherCardProps {
  state: WeatherState
  activeTab: ObservationTab
  selectedPoint: SelectedPoint | null
  observation: StationObservation | null
  isManualSelection: boolean
  onUseAutomatic: () => void
  settings: Settings
  t: Translate
}

const TAB_VARIABLES: Record<Exclude<ObservationTab, 'station'>, ObservationVariable[]> = {
  weather: ['temperature', 'humidity', 'pressure'],
  windPrecipitation: ['windSpeed', 'windDirection', 'precipitation1h', 'precipitationIntensity'],
}

function formatDate(value: string, language: Settings['language']): string {
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function displayMeasurement(measurement: ObservationMeasurement, settings: Settings): string {
  let value = measurement.value
  let unit: string = measurement.unit

  if (measurement.variable === 'temperature' && settings.temperatureUnit === 'fahrenheit') {
    value = (value * 9) / 5 + 32
    unit = '°F'
  }
  if (measurement.variable === 'windSpeed' && settings.windSpeedUnit === 'kilometersPerHour') {
    value *= 3.6
    unit = 'km/h'
  }

  const digits = measurement.variable === 'windDirection' ? 0 : 1
  return `${value.toFixed(digits)} ${unit}`
}

export function WeatherCard({
  activeTab,
  selectedPoint,
  state,
  observation,
  isManualSelection,
  onUseAutomatic,
  settings,
  t,
}: WeatherCardProps) {
  if (!selectedPoint) {
    return <p className="point-hint">{t('selectPointHint')}</p>
  }

  if (state.status === 'idle') {
    return <div className="data-status">{t('weatherSelectPoint')}</div>
  }
  if (state.status === 'loading') {
    return (
      <div className="data-status">
        <span className="status-spinner" aria-hidden="true" />
        {t('weatherLoading')}
      </div>
    )
  }
  if (state.status === 'noStation') {
    return <div className="data-status data-status--warning">{t('weatherNoStation')}</div>
  }
  if (state.status === 'error') {
    return <div className="data-status data-status--error">{t('weatherError')}</div>
  }

  if (!observation) {
    return <div className="data-status data-status--warning">{t('weatherNoStation')}</div>
  }

  if (activeTab === 'station') {
    return (
      <section className="weather-card weather-card--details">
        <dl className="coordinates">
          <div>
            <dt>{t('latitude')}</dt>
            <dd>{selectedPoint.latitude.toFixed(5)}°</dd>
          </div>
          <div>
            <dt>{t('longitude')}</dt>
            <dd>{selectedPoint.longitude.toFixed(5)}°</dd>
          </div>
        </dl>

        <div className="station-header">
          <div>
            <strong>{observation.station.name}</strong>
            <span>
              {observation.station.distanceKm.toFixed(observation.station.distanceKm < 10 ? 1 : 0)}{' '}
              {t('kilometersAway')}
            </span>
          </div>
          <span className={`freshness-badge ${observation.isStale ? 'freshness-badge--stale' : ''}`}>
            {!observation.hasData ? t('noData') : observation.isStale ? t('weatherStale') : t('weatherFresh')}
          </span>
        </div>

        <div className="station-selection-row">
          <span>{isManualSelection ? t('manualSelection') : t('automaticSelection')}</span>
          {isManualSelection && (
            <button type="button" onClick={onUseAutomatic}>
              {t('useAutomaticStation')}
            </button>
          )}
        </div>

        {!observation.hasData ? (
          <p className="stale-warning">{t('stationNoMeasurements')}</p>
        ) : (
          observation.isStale && <p className="stale-warning">{t('weatherStaleWarning')}</p>
        )}

        <dl className="station-details">
          <div>
            <dt>{t('lastObservation')}</dt>
            <dd>
              {observation.lastObservedAt ? formatDate(observation.lastObservedAt, settings.language) : t('noData')}
            </dd>
          </div>
          <div>
            <dt>{t('observationQuality')}</dt>
            <dd>{t('qualityNotProvided')}</dd>
          </div>
        </dl>

        <footer className="source-attribution">
          {t('source')}:{' '}
          <a href={observation.source.url} target="_blank" rel="noreferrer">
            FMI
          </a>{' '}
          ·{' '}
          <a href={observation.source.licenseUrl} target="_blank" rel="noreferrer">
            {observation.source.license}
          </a>
        </footer>
      </section>
    )
  }

  return (
    <section className="weather-card">
      <dl className="measurements">
        {TAB_VARIABLES[activeTab].map((variable) => {
          const measurement = observation.measurements[variable]
          return (
            <div className="measurement" key={variable}>
              <dt>{t(variable)}</dt>
              <dd>{measurement ? displayMeasurement(measurement, settings) : t('noData')}</dd>
              {measurement && (
                <small>
                  {formatDate(measurement.observedAt, settings.language)} · {t('qualityNotProvided')}
                </small>
              )}
            </div>
          )
        })}
      </dl>
    </section>
  )
}
