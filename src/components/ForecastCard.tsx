import type { ForecastState } from '../forecast/useForecast'
import { convertForecastHour } from '../forecast/units'
import { weatherCodeTranslationKey } from '../forecast/weatherCode'
import type { Translate } from '../i18n'
import type { Settings } from '../settings'

interface ForecastCardProps {
  state: ForecastState
  settings: Settings
  t: Translate
}

function formatForecastTime(value: string, timezone: string, language: Settings['language']): string {
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  }).format(new Date(value))
}

function formatValue(value: number | null, digits: number, unit: string, noData: string): string {
  return value === null ? noData : `${value.toFixed(digits)} ${unit}`
}

export function ForecastCard({ state, settings, t }: ForecastCardProps) {
  if (state.status === 'idle') return <div className="data-status">{t('forecastSelectPoint')}</div>
  if (state.status === 'loading') {
    return (
      <div className="data-status">
        <span className="status-spinner" aria-hidden="true" />
        {t('forecastLoading')}
      </div>
    )
  }
  if (state.status === 'error') {
    return <div className="data-status data-status--error">{t('forecastError')}</div>
  }
  if (state.result.hours.length === 0) {
    return <div className="data-status data-status--warning">{t('forecastNoData')}</div>
  }

  const { result } = state
  return (
    <section className="forecast-card" aria-label={t('forecast24Hours')}>
      <div className="forecast-provenance">
        <strong>{t('forecastDataKind')}</strong>
        <span>
          {t('forecastProvider')}: {result.provider.name}
        </span>
        <span>
          {t('forecastSelectionStrategy')}: <code>{result.modelSelection}</code>
        </span>
        <span>
          {t('forecastPointTime')} · {result.timezone}
        </span>
      </div>

      <ol className="forecast-hours">
        {result.hours.map((hour) => {
          const display = convertForecastHour(hour, settings.temperatureUnit, settings.windSpeedUnit)
          return (
            <li className="forecast-hour" key={hour.forecastAt}>
              <time dateTime={hour.forecastAt}>
                {formatForecastTime(hour.forecastAt, result.timezone, settings.language)}
              </time>
              <strong className="forecast-condition">{t(weatherCodeTranslationKey(hour.weatherCode))}</strong>
              <span className="forecast-temperature">
                {display.temperature
                  ? `${display.temperature.value.toFixed(1)} ${display.temperature.unit}`
                  : t('noData')}
              </span>
              <span className="forecast-metric">
                <small>{t('forecastPrecipitation')}</small>
                {hour.precipitationProbability === null
                  ? formatValue(hour.precipitation, 1, 'mm', t('noData'))
                  : `${hour.precipitationProbability.toFixed(0)}% · ${formatValue(hour.precipitation, 1, 'mm', t('noData'))}`}
              </span>
              <span className="forecast-metric">
                <small>{t('windSpeed')}</small>
                {display.windSpeed
                  ? `${display.windSpeed.value.toFixed(1)} ${display.windSpeed.unit} · ${formatValue(hour.windDirection, 0, '°', t('noData'))}`
                  : t('noData')}
              </span>
            </li>
          )
        })}
      </ol>

      <footer className="forecast-footer">
        <span>
          Weather data by{' '}
          <a href={result.provider.url} target="_blank" rel="noreferrer">
            Open-Meteo.com
          </a>
        </span>
        <details>
          <summary>{t('forecastPrivacySummary')}</summary>
          <p>{t('forecastPrivacyText')}</p>
        </details>
      </footer>
    </section>
  )
}
