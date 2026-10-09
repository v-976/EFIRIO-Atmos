import { useEffect, useMemo, useState } from 'react'
import { MapView, type SelectedPoint } from './components/MapView'
import { ObservationPanel } from './components/ObservationPanel'
import { SettingsPanel } from './components/SettingsPanel'
import type { ObservationTab } from './components/WeatherCard'
import { convertForecastHour } from './forecast/units'
import { useForecast } from './forecast/useForecast'
import { createTranslator } from './i18n'
import { loadSettings, saveSettings, type Settings } from './settings'
import { useWeatherObservation } from './weather/useWeatherObservation'
import type { StationObservation } from './weather/types'

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null)
  const [manualStationId, setManualStationId] = useState<string | null>(null)
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(true)
  const [activeObservationTab, setActiveObservationTab] = useState<ObservationTab>('weather')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const t = useMemo(() => createTranslator(settings.language), [settings.language])
  const weatherState = useWeatherObservation(selectedPoint)
  const forecastState = useForecast(selectedPoint)
  const forecastPreview = useMemo(() => {
    if (forecastState.status !== 'success' || !forecastState.result.hours[0]) return null
    return convertForecastHour(
      forecastState.result.hours[0],
      settings.temperatureUnit,
      settings.windSpeedUnit,
    )
  }, [forecastState, settings.temperatureUnit, settings.windSpeedUnit])
  const searchResult = weatherState.status === 'success' ? weatherState.result : null
  const selectedStation: StationObservation | null = searchResult
    ? searchResult.stations.find(
        (station) => station.station.id === (manualStationId || searchResult.automaticStationId),
      ) || null
    : null

  const handlePointSelection = (point: SelectedPoint) => {
    setManualStationId(null)
    setSelectedPoint(point)
    setIsDataPanelOpen(true)
  }

  const handleStationSelection = (stationId: string) => {
    setManualStationId(stationId)
    setIsDataPanelOpen(true)
  }

  useEffect(() => {
    document.documentElement.lang = settings.language
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    if (!isSettingsOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSettingsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSettingsOpen])

  return (
    <main
      className="app"
      data-forecast-status={forecastState.status}
      data-forecast-provider={forecastState.status === 'success' ? forecastState.result.provider.id : undefined}
      data-forecast-hours={forecastState.status === 'success' ? forecastState.result.hours.length : undefined}
      data-forecast-temperature-unit={forecastPreview?.temperature?.unit}
      data-forecast-wind-unit={forecastPreview?.windSpeed?.unit}
    >
      <MapView
        language={settings.language}
        selectedPoint={selectedPoint}
        stations={searchResult?.stations || []}
        automaticStationId={searchResult?.automaticStationId || null}
        manualStationId={manualStationId}
        onSelectPoint={handlePointSelection}
        onSelectStation={handleStationSelection}
        t={t}
      />

      <header className="brand-panel surface">
        <div>
          <h1>{t('appName')}</h1>
          <p>{t('appTagline')}</p>
        </div>
        <button className="settings-button" type="button" onClick={() => setIsSettingsOpen(true)}>
          <span aria-hidden="true">⚙</span>
          <span>{t('settings')}</span>
        </button>
      </header>

      {isDataPanelOpen && (
        <ObservationPanel
          activeTab={activeObservationTab}
          selectedPoint={selectedPoint}
          state={weatherState}
          forecastState={forecastState}
          observation={selectedStation}
          isManualSelection={Boolean(manualStationId)}
          onActiveTabChange={setActiveObservationTab}
          onClose={() => setIsDataPanelOpen(false)}
          onUseAutomatic={() => setManualStationId(null)}
          settings={settings}
          t={t}
        />
      )}

      {isSettingsOpen && (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setIsSettingsOpen(false)} t={t} />
      )}
    </main>
  )
}
