import type { ForecastModelId, ForecastModelMetadata } from './multiModelTypes'

export const FORECAST_MODEL_REGISTRY: Record<ForecastModelId, ForecastModelMetadata> = {
  'ecmwf-ifs': {
    id: 'ecmwf-ifs',
    producer: { id: 'ecmwf', name: 'European Centre for Medium-Range Weather Forecasts' },
    displayName: 'ECMWF IFS HRES 9 km',
    openMeteoIdentifier: 'ecmwf_ifs',
    coverage: 'global',
    temporalResolution: '1-hourly through 90 forecast hours; coarser native steps later',
  },
  'noaa-gfs': {
    id: 'noaa-gfs',
    producer: { id: 'noaa', name: 'NOAA National Centers for Environmental Prediction' },
    displayName: 'NOAA GFS Global 0.11°/0.25°',
    openMeteoIdentifier: 'ncep_gfs_global',
    coverage: 'global',
    temporalResolution: '1-hourly through 120 forecast hours; 3-hourly later',
  },
  'dwd-icon-global': {
    id: 'dwd-icon-global',
    producer: { id: 'dwd', name: 'Deutscher Wetterdienst' },
    displayName: 'DWD ICON Global',
    openMeteoIdentifier: 'dwd_icon_global',
    coverage: 'global',
    temporalResolution: '1-hourly through 78 forecast hours; 3-hourly later',
  },
}

export const DEFAULT_FORECAST_MODEL_IDS: readonly ForecastModelId[] = [
  'ecmwf-ifs',
  'noaa-gfs',
  'dwd-icon-global',
]
