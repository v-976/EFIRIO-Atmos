import { useEffect, useMemo, useState } from 'react'
import { MapView, type SelectedPoint } from './components/MapView'
import { SettingsPanel } from './components/SettingsPanel'
import { WeatherCard } from './components/WeatherCard'
import { createTranslator } from './i18n'
import { loadSettings, saveSettings, type Settings } from './settings'
import { useWeatherObservation } from './weather/useWeatherObservation'

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const t = useMemo(() => createTranslator(settings.language), [settings.language])
  const weatherState = useWeatherObservation(selectedPoint)

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
    <main className="app">
      <MapView
        language={settings.language}
        selectedPoint={selectedPoint}
        onSelectPoint={setSelectedPoint}
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

      <aside className="point-panel surface" aria-live="polite">
        <h2>{t('selectedPoint')}</h2>
        {selectedPoint ? (
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
        ) : (
          <p className="point-hint">{t('selectPointHint')}</p>
        )}
        <WeatherCard state={weatherState} settings={settings} t={t} />
      </aside>

      {isSettingsOpen && (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setIsSettingsOpen(false)} t={t} />
      )}
    </main>
  )
}
