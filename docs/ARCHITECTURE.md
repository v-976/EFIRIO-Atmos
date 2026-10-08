# Architecture — proposed, not yet implemented

## Core principle
Local-first environmental intelligence: maximize coverage from permitted nearby observations, then supplement with radar and forecast models. A greater number of sensors helps only if their observations are fresh, independent and representative.

## Logical components
1. **PWA client:** MapLibre/OSM map, selected point, explicit geolocation request, local preferences, layer controls and display.
2. **Station discovery:** index public station metadata, query 1 km initially and expand adaptively (e.g. 3/5/10/25 km, configurable), per measured variable.
3. **Collectors:** isolated scheduled adapters for meteorological, air-quality, pollen, water, radiation, space-weather, radar and permitted Mesh/APRS/LoRa feeds.
4. **Normalizer:** standard units, timestamps in UTC, coordinate reference, station metadata, provenance, source license and freshness.
5. **Quality control:** range, temporal spikes, spatial disagreement, duplicate/rebroadcast detection, sensor exposure, elevation and coastal/urban effects. Retain raw provenance; never silently replace observations.
6. **Spatial estimator:** parameter-specific weighting and uncertainty; a single station reading is not the value at an arbitrary nearby point.
7. **Nowcast:** precipitation radar sequence, motion estimation, short-range probabilistic end-of-rain windows; distinguish radar inference from ground rain-gauge measurements.
8. **Forecast engine:** multi-model data with de-duplication by underlying model; rolling forecast verification against appropriate ground truth; adaptive weights only after adequate samples.
9. **Public read-only API:** regional environmental datasets, tiles or station aggregates, not per-user histories.
10. **Storage:** shared non-personal environmental observations and model archives on the server; preferences and selected points in client-side storage only.

## Data contract (proposed)
Every measurement should carry `source_id`, `station_id`, `observed_at_utc`, `received_at_utc`, `latitude`, `longitude`, optional `elevation_m`, `variable`, `value`, `unit`, `quality_flags`, `license` and `provenance`. Derived products additionally carry `kind` (observed/estimated/nowcast/forecast), `valid_at_utc`, methodology and uncertainty when available. Preserve original readings and model run identifiers.

## Location and privacy
- Manual map click, place search or explicitly authorized browser geolocation.
- Do not automatically ask for location on app launch.
- No artificial ±1 km cap on point selection. Search radius and geolocation accuracy are separate concepts.
- Prefer regional data delivery and client-side nearest-station selection; avoid transmitting precise selected coordinates to the backend.
- Third-party tile, geocoding and network providers may observe IP, viewport or search queries; evaluate alternatives, self-hosting and terms.
- PWA background operation is unreliable on sleeping devices. Shared data ingestion runs server-side, independently of user sessions.
- Mesh radio capture may require a dedicated gateway; browser Bluetooth support varies.

## Trust boundaries
Collectors have restricted egress and limited write access to staging. Validation gates precede published read-only data. Public API cannot mutate datasets. Admin infrastructure is separate and non-public. Keep minimal technical security telemetry without building user histories.

## Non-goals for initial alpha
Accounts, synchronization, profile migration, payment, advertising, continuous background phone location, unverified minute-accurate rainfall promises and speculative AI training.

## Localization and first launch
The PWA must provide Russian (ru) and English (en) UI dictionaries from its first release. On first visit, detect the browser language: ru → Russian, en → English, any unsupported language (including fi) → English. Do not require a language picker. Save only explicit manual language overrides in local device storage; these take precedence over browser language on later visits. Until a manual override exists, follow the browser language. Allow instant language switching from Settings. Do not tie UI language to units, coordinates, observation sources or permissions. First-run onboarding must not request geolocation or registration. Design translation keys so more languages can be added later.
