import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  formatLocalDateLabel,
  formatPrecipitationAmount,
  formatPressureRange,
  formatTemperatureRange,
  formatWindDirection,
  formatWindRange,
  roundProbability,
} from '../forecast/forecastPresentation'
import type { UnifiedDailyForecast, UnifiedHourlyForecast } from '../forecast/unifiedForecastTypes'
import type { UnifiedForecastController } from '../forecast/useUnifiedForecast'
import { weatherCodeTranslationKey } from '../forecast/weatherCode'
import type { Translate } from '../i18n'
import type { Settings } from '../settings'

type ForecastHorizon = '24h' | '3d' | '7d' | '15d'

interface ForecastCardProps {
  controller: UnifiedForecastController
  settings: Settings
  t: Translate
}

const HORIZONS: Array<{ id: ForecastHorizon; label: 'forecastHorizon24' | 'forecastHorizon3' | 'forecastHorizon7' | 'forecastHorizon15' }> = [
  { id: '24h', label: 'forecastHorizon24' },
  { id: '3d', label: 'forecastHorizon3' },
  { id: '7d', label: 'forecastHorizon7' },
  { id: '15d', label: 'forecastHorizon15' },
]

function stopPanelSwipe(event: ReactPointerEvent<HTMLDivElement>) {
  event.stopPropagation()
}

function PrecipitationSummary({
  forecast,
  t,
}: {
  forecast: UnifiedHourlyForecast['precipitation'] | UnifiedDailyForecast['precipitation']
  t: Translate
}) {
  const probability = roundProbability(forecast.probability)
  const amount = formatPrecipitationAmount(forecast)
  if (probability === null && !amount) return null
  return (
    <span className="forecast-summary-metric">
      <small>{t('forecastPrecipitation')}</small>
      <span>
        {probability === null ? null : `${probability}%`}
        {probability !== null && amount ? ' · ' : null}
        {amount?.text}
        {amount?.conditional ? <em> {t('forecastConditionalAmount')}</em> : null}
      </span>
    </span>
  )
}

function HourlyRow({ hour, settings, t }: { hour: UnifiedHourlyForecast; settings: Settings; t: Translate }) {
  const temperature = formatTemperatureRange(hour.temperature, settings.temperatureUnit)
  const wind = formatWindRange(hour.wind.speed, settings.windSpeedUnit)
  const direction = formatWindDirection(hour.wind.direction.value, settings.language)
  const pressure = formatPressureRange(hour.pressureMsl)

  return (
    <li className="forecast-row forecast-row--hourly">
      <div className="forecast-row__primary">
        <time dateTime={hour.forecastAt}>{hour.localTime}</time>
        <strong className="forecast-temperature">{temperature ?? t('noData')}</strong>
        <span className="forecast-condition">{t(weatherCodeTranslationKey(hour.weatherCode))}</span>
      </div>
      {hour.availability === 'unavailable' ? (
        <span className="forecast-unavailable">{t('forecastInsufficientData')}</span>
      ) : (
        <div className="forecast-row__metrics">
          <PrecipitationSummary forecast={hour.precipitation} t={t} />
          {wind ? (
            <span className="forecast-summary-metric">
              <small>{t('forecastWind')}</small>
              <span>
                {wind}
                {direction ? (
                  <> · <span className="forecast-wind-arrow" aria-hidden="true">{direction.arrow}</span> {direction.label}</>
                ) : null}
              </span>
            </span>
          ) : null}
          {pressure ? (
            <span className="forecast-summary-metric">
              <small>{t('forecastPressure')}</small>
              <span>{pressure}</span>
            </span>
          ) : null}
        </div>
      )}
    </li>
  )
}

function DailyRow({
  day,
  baseLocalDate,
  settings,
  t,
}: {
  day: UnifiedDailyForecast
  baseLocalDate: string
  settings: Settings
  t: Translate
}) {
  const temperature = formatTemperatureRange(day.temperature, settings.temperatureUnit)
  const wind = formatWindRange(day.wind.typicalSpeed, settings.windSpeedUnit)
  const pressure = formatPressureRange(day.pressureMsl)
  return (
    <li className="forecast-row forecast-row--daily">
      <div className="forecast-row__primary">
        <time dateTime={day.localDate}>{formatLocalDateLabel(day.localDate, baseLocalDate, settings, t)}</time>
        <strong className="forecast-temperature">{temperature ?? t('noData')}</strong>
      </div>
      {day.availability === 'unavailable' ? (
        <span className="forecast-unavailable">{t('forecastInsufficientData')}</span>
      ) : (
        <div className="forecast-row__metrics">
          <PrecipitationSummary forecast={day.precipitation} t={t} />
          {wind ? (
            <span className="forecast-summary-metric">
              <small>{t('forecastWind')}</small>
              <span>{wind}</span>
            </span>
          ) : null}
          {pressure ? (
            <span className="forecast-summary-metric">
              <small>{t('forecastPressure')}</small>
              <span>{pressure}</span>
            </span>
          ) : null}
        </div>
      )}
    </li>
  )
}

export function ForecastCard({ controller, settings, t }: ForecastCardProps) {
  const [horizon, setHorizon] = useState<ForecastHorizon>('24h')
  const { state, loadLongRange } = controller
  const pointKey = state.status === 'success'
    ? `${state.result.requestedLocation.latitude},${state.result.requestedLocation.longitude}`
    : null

  useEffect(() => {
    if (pointKey) setHorizon('24h')
  }, [pointKey])

  const groupedHours = useMemo(() => {
    if (state.status !== 'success') return []
    const groups = new Map<string, UnifiedHourlyForecast[]>()
    for (const hour of state.result.hourly) {
      const group = groups.get(hour.localDate) ?? []
      group.push(hour)
      groups.set(hour.localDate, group)
    }
    return [...groups.entries()]
  }, [state])

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

  const { result } = state
  const selectHorizon = (next: ForecastHorizon) => {
    setHorizon(next)
    if (next === '15d' && state.longStatus === 'not-requested') void loadLongRange()
  }
  const hourlyGroups = horizon === '24h'
    ? [[result.hourly[0]?.localDate ?? result.baseLocalDate, result.hourly.slice(0, 24)] as const]
    : groupedHours
  const dailyPeriods = horizon === '15d'
    ? [...result.dailyOverview, ...(state.longStatus === 'available' ? result.outlook : [])]
    : result.dailyOverview

  return (
    <section className="forecast-card" aria-label={t('forecastDataKind')}>
      <div
        className="forecast-horizon-selector"
        role="group"
        aria-label={t('forecastHorizon')}
        onPointerDown={stopPanelSwipe}
      >
        {HORIZONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={horizon === item.id}
            className={horizon === item.id ? 'forecast-horizon-button forecast-horizon-button--active' : 'forecast-horizon-button'}
            onClick={() => selectHorizon(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {horizon === '24h' || horizon === '3d' ? (
        <div className="forecast-hour-groups">
          {hourlyGroups.map(([localDate, hours]) => (
            <section className="forecast-day-group" key={localDate}>
              {horizon === '3d' ? (
                <h3>{formatLocalDateLabel(localDate, result.baseLocalDate, settings, t)}</h3>
              ) : null}
              <ol className="forecast-list">
                {hours.map((hour) => <HourlyRow key={hour.forecastAt} hour={hour} settings={settings} t={t} />)}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <ol className="forecast-list forecast-list--daily">
          {dailyPeriods.map((day) => (
            <DailyRow key={`${day.horizon}-${day.localDate}`} day={day} baseLocalDate={result.baseLocalDate} settings={settings} t={t} />
          ))}
        </ol>
      )}

      {horizon === '15d' && state.longStatus === 'loading' ? (
        <div className="forecast-long-status" role="status">
          <span className="status-spinner" aria-hidden="true" />
          {t('forecastLongLoading')}
        </div>
      ) : null}
      {horizon === '15d' && state.longStatus === 'error' ? (
        <div className="forecast-long-status forecast-long-status--error" role="alert">
          <span>{t('forecastLongUnavailable')}</span>
          <button type="button" onClick={() => void loadLongRange()}>{t('forecastRetry')}</button>
        </div>
      ) : null}

      <footer className="forecast-footer">
        <span>
          {t('forecastAttribution')}{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>
        </span>
        <details>
          <summary>{t('forecastPrivacySummary')}</summary>
          <p>{t('forecastPrivacyText')}</p>
        </details>
      </footer>
    </section>
  )
}
