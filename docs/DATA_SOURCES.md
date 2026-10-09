# Candidate data sources — verification required

**This is a research backlog, not a list of confirmed working integrations.** Before implementing each connector, verify live API documentation, coverage, access method, update cadence, attribution, rate limits, redistribution and non-commercial/open-source compatibility. A free API is not automatically open data.

| Domain | Candidates | Checks |
|---|---|---|
| Finnish observations, precipitation, radar | FMI Open Data | API coverage, radar formats, licenses, timestamps |
| European/global forecasts | ECMWF, NOAA GFS, DWD ICON, Open-Meteo | model provenance, duplicate datasets, quotas, redistribution |
| Nordic observations | MET Norway | access rules, attribution, geographic coverage |
| Private weather stations | Weather Underground, Netatmo public data | API authorization, privacy, reuse rights |
| Community radio telemetry | Meshtastic, APRS-IS, LoRaWAN / The Things Network | opt-in/publication rules, location privacy, gateway and MQTT permissions |
| Air quality | FMI, EEA, OpenAQ, CAMS | pollutant units, AQI standard, observations vs model |
| Pollen/allergens | Norkko, CAMS, regional networks | species, concentration, forecasts vs observations, risk thresholds |
| Water temperature/quality | SYKE, FMI, municipalities, EEA bathing water | station and sample dates, cyanobacteria, microbiology vs temperature |
| Sunrise/moon | local astronomical calculations | time zones, polar-day/night edge cases |
| Solar/geomagnetic activity | NOAA SWPC, NASA | live vs predicted, flare and Kp definitions |
| Radiation | STUK, EURDEP | units, measurement recency, geographic coverage |
| Basemap | OpenStreetMap data, MapLibre GL JS, OpenFreeMap candidate | ODbL attribution, tile provider privacy and fair-use terms |

## Connector acceptance checklist
1. Verify official endpoint and legally permitted access.
2. Record source/model identity and redistribution requirements.
3. Preserve UTC observation time, ingestion time and validity interval.
4. Define geographic coverage, quality flags, units and missing-data behavior.
5. Set caching/backoff/rate limits and graceful fallback.
6. Avoid uploading user-selected coordinates, identifiers or preferences.
7. Do not ingest non-public or personal sensor telemetry merely because a radio packet is technically readable.

## Data priority
Nearby valid observations > contextual radar/satellite nowcast > appropriately labelled numerical forecasts. This is a priority of evidence, not a rule to discard high-quality models when local observations are absent.

## Confirmed forecast integration

### Forecast provider — Open-Meteo

- Forecast provider: **Open-Meteo**, official endpoint `https://api.open-meteo.com/v1/forecast`.
- Data licence: **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).
- EFIRIO Atmos uses the **Free API for non-commercial use**; no account or API key is required.
- Applicable Free API limits (calls per day/hour/minute, non-commercial scope) must always match the **current official Open-Meteo terms** at https://open-meteo.com/en/terms rather than copied values in this repository. When official terms change, the project follows the official wording.
- Every user-visible presentation of forecast data must include the required attribution with a link to Open-Meteo, for example “Weather data by Open-Meteo.com” (https://open-meteo.com/).
- A commercial user of an EFIRIO Atmos fork must independently arrange a permitted way to access Open-Meteo (paid plan or other allowed access) or replace the forecast provider. The EFIRIO Atmos source licence does not override Open-Meteo terms.

### Forecast provenance

- The generic Open-Meteo Forecast API uses the automatic **`best_match`** model-selection strategy.
- If the API response does not name the concrete model actually used, EFIRIO Atmos must not invent it. Storing `model = null` is a valid and honest provenance representation.
- `generationtime_ms` is the API's data-preparation latency; it must **not** be interpreted as a model run/run-release time. A model generation timestamp stays explicitly unavailable until a provider actually reports it.
- `observation` and `forecast` remain distinct data types and must never be merged or displayed as equivalent evidence.

### Privacy of forecast requests

The request sends the user-selected WGS84 latitude and longitude directly to Open-Meteo only after an explicit map selection. Open-Meteo documents that troubleshooting web-server logs may contain IP addresses and coordinates and are kept for up to 90 days; processing on the provider side follows the provider's own privacy policy and terms. The client requests canonical °C, m/s and mm values and converts display units locally.

### Requirement for the forecast UI (A3.2, not implemented yet)

- Displayed forecast data must carry a clear Open-Meteo attribution with a link, as required by the provider.
- The user must be able to access information stating that the selected coordinates are sent to an external forecast provider.
