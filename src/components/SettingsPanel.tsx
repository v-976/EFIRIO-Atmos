import type { Translate } from '../i18n'
import type { Settings } from '../settings'

interface SettingsPanelProps {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
  t: Translate
}

export function SettingsPanel({ settings, onChange, onClose, t }: SettingsPanelProps) {
  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title">{t('settings')}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t('closeSettings')}>
            ×
          </button>
        </header>

        <label className="field">
          <span>{t('language')}</span>
          <select
            value={settings.language}
            onChange={(event) =>
              onChange({
                ...settings,
                language: event.target.value as Settings['language'],
                languageIsManual: true,
              })
            }
          >
            <option value="ru">{t('russian')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </label>

        <label className="field">
          <span>{t('temperatureUnit')}</span>
          <select
            value={settings.temperatureUnit}
            onChange={(event) =>
              onChange({ ...settings, temperatureUnit: event.target.value as Settings['temperatureUnit'] })
            }
          >
            <option value="celsius">{t('celsius')}</option>
            <option value="fahrenheit">{t('fahrenheit')}</option>
          </select>
        </label>

        <label className="field">
          <span>{t('windSpeedUnit')}</span>
          <select
            value={settings.windSpeedUnit}
            onChange={(event) =>
              onChange({ ...settings, windSpeedUnit: event.target.value as Settings['windSpeedUnit'] })
            }
          >
            <option value="metersPerSecond">{t('metersPerSecond')}</option>
            <option value="kilometersPerHour">{t('kilometersPerHour')}</option>
          </select>
        </label>

        <p className="settings-note">{t('localSettingsNotice')}</p>
      </section>
    </div>
  )
}
