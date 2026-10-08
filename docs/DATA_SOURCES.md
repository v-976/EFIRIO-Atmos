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
