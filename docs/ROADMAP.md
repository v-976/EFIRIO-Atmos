# Roadmap (proposed)

All stages are planning targets, not delivered functionality.

## Foundation / specification
- [x] Define product scope, local-first observations, privacy principles and map stack.
- [x] Record source candidates and initial architecture.
- [ ] Verify source terms, APIs, licenses and brand palette.
- [ ] Select minimum viable backend/database and tile/geocoding deployment.

## Alpha 0.1 — map and forecasts
- [ ] Responsive MapLibre map with manual point selection, place search and optional one-time geolocation.
- [ ] Source-labelled multi-model hourly forecast and comparison.
- [ ] Local-only saved places/preferences; no account or tracking.
- [ ] Clear stale/missing data states.

## Alpha 0.2 — local observation engine
- [ ] Public station discovery, adaptive radius and quality filters.
- [ ] FMI observations and at least one additional legally accessible source.
- [ ] Station metadata, time, distance, coverage and provenance.
- [ ] Mesh/APRS/LoRa connectors only after permission and licensing review.

## Alpha 0.3 — precipitation nowcasting
- [ ] Radar overlay, measured rainfall and short-range motion.
- [ ] Probabilistic onset/cessation estimates with uncertainty.

## Alpha 0.4 — air and allergens
- [ ] Pollutants, clearly defined AQI method and time labels.
- [ ] Separate pollen/allergen layers and species-specific risk.

## Alpha 0.5 — water
- [ ] Select nearby or named water body.
- [ ] Temperature, cyanobacteria and bathing-water results with sample dates.

## Alpha 0.6 — astronomy and environmental hazards
- [ ] Sunrise/sunset, daylight, moon phases.
- [ ] Space weather and geomagnetic activity.
- [ ] Radiation measurements where authorized and available.

## Beta — verification and refinement
- [ ] Historical forecast-vs-observation verification and source weighting.
- [ ] Coverage/confidence maps and locally evaluated alert thresholds.
- [ ] Security, accessibility, performance and provider-terms review.

## Test policy
Run focused tests for changed modules, not repeated full suites without a reason. Surface stalled calculations, unavailable sources and retries explicitly.

## Cross-cutting UI requirement
- [ ] First-launch language picker: Русский / English; local persistence, no account or location request.
- [ ] Runtime language switching in Settings and complete ru/en translation coverage including errors and accessibility labels.
