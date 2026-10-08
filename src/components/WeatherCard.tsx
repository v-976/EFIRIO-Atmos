import type { Translate } from '../i18n'
import type { Settings } from '../settings'
import type { WeatherState } from '../weather/useWeatherObservation'
import type { ObservationMeasurement, ObservationVariable } from '../weather/types'
import type { StationObservation } from '../weather/types'

interface WeatherCardProps {
  state: WeatherState
  observation: StationObservation | null
  isManualSelection: boolean
  onUseAutomatic: () => void
  settings: Settings
  t: Translate
}

const DISPLAYED_VARIABLES: ObservationVariable[] = [
  'temperature',
  'windSpeed',
  'windDirection',
  'humidity',
  'pressure',
  'precipitation1h',
  'precipitationIntensity',
]

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
  state,
  observation,
  isManualSelection,
  onUseAutomatic,
  settings,
  t,
}: WeatherCardProps) {
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

  return (
    <section className="weather-card">
      <div className="station-header">
        <div>
          <strong>{observation.station.name}</strong>
          <span>
            {observation.station.distanceKm.toFixed(observation.station.distanceKm < 10 ? 1 : 0)} {t('kilometersAway')}
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

      <dl className="measurements">
        {DISPLAYED_VARIABLES.map((variable) => {
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

      <footer className="source-attribution">
        {t('source')}:{' '}
        <a href={observation.source.url} target="_blank" rel="noreferrer">
          FMI
        </a>{' '}
        ·{' '}
        <a href={observation.source.licenseUrl} target="_blank" rel="noreferrer">
          {observation.source.license}
        </a>
        <span>
          {t('lastObservation')}:{' '}
          {observation.lastObservedAt ? formatDate(observation.lastObservedAt, settings.language) : t('noData')}
        </span>
      </footer>
    </section>
  )
}
