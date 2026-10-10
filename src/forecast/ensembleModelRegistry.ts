import type { EnsembleModelMetadata } from './ensembleTypes'

export const ICON_GLOBAL_ENSEMBLE: EnsembleModelMetadata = {
  id: 'dwd-icon-eps-global',
  producer: { id: 'dwd', name: 'Deutscher Wetterdienst' },
  displayName: 'DWD ICON-EPS Global',
  openMeteoIdentifier: 'icon_global_eps',
  coverage: 'global',
  totalMemberCount: 40,
  spatialResolution: '26 km',
  temporalResolution: '1-hourly',
  forecastHorizon: '7.5 days',
  updateFrequency: '12 hours',
}

export const ECMWF_IFS_025_ENSEMBLE: EnsembleModelMetadata = {
  id: 'ecmwf-ifs-025-ensemble',
  producer: { id: 'ecmwf', name: 'European Centre for Medium-Range Weather Forecasts' },
  displayName: 'ECMWF IFS 0.25° Ensemble',
  openMeteoIdentifier: 'ecmwf_ifs025_ensemble',
  coverage: 'global',
  totalMemberCount: 51,
  spatialResolution: '0.25°',
  temporalResolution: '3-hourly; 6-hourly after 144 hours',
  forecastHorizon: '15 days',
  updateFrequency: '6 hours',
}
