# EFIRIO Atmos

**Free, non-commercial, open-source weather and environmental intelligence platform.**

**Status:** planning / architecture. No operational weather service or validated data integrations are available yet.

EFIRIO Atmos prioritizes **nearby, trustworthy, recent observations** over generic global forecast summaries. It aims to combine public weather stations, permitted community sensor telemetry, radar and numerical forecast models into a transparent, location-specific view.

## Planned capabilities

- Choose any point on an interactive map; optionally request one-time device geolocation with explicit user consent; search places.
- Discover nearby public and community weather stations, progressively expanding the search radius from 1 km.
- Display actual observations separately from spatial estimates and model forecasts, with provenance, timestamp, distance and quality indicators.
- Weather: temperature, humidity, pressure, wind, clouds, precipitation and hourly/daily forecasts.
- Rain nowcasting: radar-based current precipitation, movement and an uncertainty-aware estimate of when it may end.
- Air pollution and pollen/allergen maps with species-specific risk categories.
- Nearby or selected water bodies: water temperature, bathing-water quality, cyanobacteria and measurement dates where available.
- Sunrise, sunset, daylight, moon phases; solar flares, geomagnetic activity, aurora forecasts and available radiation monitoring.
- Historical forecast verification, source comparison and adaptive model weighting after sufficient evidence.

## Project model

EFIRIO Atmos is:

- completely free of charge;
- open-source;
- non-commercial;
- without advertising, subscriptions or paid features;
- without user accounts;
- without its own user telemetry or tracking;
- without sale of user data.

The project-owned source code remains licensed under MIT; this is the permanent model of the project.

## Privacy by design

No accounts, advertising, user profiling or server-side storage of personal preferences, saved locations or location history. Personal settings remain on the device. No cross-device synchronization, profile transfer or profile backup is planned. The server collects **general regional environmental data independently of user requests**. Prefer regional data bundles so precise user coordinates need not be transmitted. Network operators and third-party map providers may still observe connection metadata; privacy must not be overstated.

## Proposed architecture

- **PWA client:** MapLibre GL JS with OpenStreetMap-derived cartography; OpenFreeMap is a candidate tile provider subject to terms and privacy review.
- **Data collection:** isolated connectors for official meteorological APIs, radar, public station networks, permitted Meshtastic/LoRaWAN/APRS telemetry and environmental datasets.
- **Data processing:** normalization, duplicate detection, source provenance, quality control, spatial analysis, forecast verification.
- **Server:** public read-only environmental API and shared non-personal observations; minimal privileges, no user accounts.
- **Client storage:** local preferences and selected points, no automatic location collection.

Technology selections other than the map stack are provisional. See [Architecture](docs/ARCHITECTURE.md), [Sources](docs/DATA_SOURCES.md), [Roadmap](docs/ROADMAP.md), [Privacy & Security](docs/PRIVACY_SECURITY.md) and [Agent rules](AGENTS.md).

## Principles

1. Local observations first; **more independent, quality-controlled telemetry is better**.
2. Do not confuse measurement, interpolation, nowcast or forecast.
3. No fabricated values: show unavailable, stale or uncertain data explicitly.
4. Respect provider licenses, quotas, privacy and attribution.
5. Prefer free/open datasets; no paid service dependency without approval.
6. EFIRIO family visual identity; exact approved brand colors must be sourced from existing assets, not guessed.
7. Keep the service low-value to attackers by never collecting valuable user profiles, while still protecting integrity and availability.

## License

Project-owned code is licensed under [MIT](LICENSE). The application is intended to be distributed free of charge and operated non-commercially; MIT itself **does permit third-party commercial reuse** of the project-owned source code. Third-party datasets, maps, imagery, dependencies and trademarks retain their own terms.

The EFIRIO Atmos source-code licence does **not** grant any right to use third-party APIs or data in ways that contradict the terms of the corresponding providers. Provider terms, quotas, licences and attribution requirements remain binding on every user and fork, including commercial ones.

## Development

Specification phase only. No installation or running service is implied by this repository. Contributions should follow `AGENTS.md`.

## Interface languages

On first launch, the UI automatically follows the browser language when supported (Russian or English); unsupported languages fall back to English. A manual language selection in Settings is stored locally and takes priority on subsequent visits. Language can be changed anytime without restarting. Interface language is independent of measurement units, location and data sources. No geolocation permission or account is required during onboarding.
