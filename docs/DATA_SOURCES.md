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

### Forecast UI attribution and privacy requirement

- Displayed forecast data must carry a clear Open-Meteo attribution with a link, as required by the provider.
- The user must be able to access information stating that the selected coordinates are sent to an external forecast provider.

### Explicit multi-model comparison foundation

The ordinary A3 forecast remains the generic Open-Meteo `best_match` forecast. Analytical comparison is a separate data flow using one explicit-model request to the same `/v1/forecast` provider endpoint. Its global baseline is:

- `ecmwf_ifs` — ECMWF IFS HRES 9 km, produced by ECMWF;
- `ncep_gfs_global` — GFS Global 0.11°/0.25°, produced by NOAA/NCEP;
- `dwd_icon_global` — ICON Global, produced by DWD.

All three are documented as global models. Open-Meteo returns model identity as suffixes on hourly response fields. Producer/display metadata maintained in the local verified registry is kept distinct from response-confirmed identifiers and from Open-Meteo as the API provider.

The shared comparison core is temperature, precipitation, 10 m wind speed/direction and WMO weather code. Precipitation probability is excluded: it is derived from different ensemble products and is not a directly comparable deterministic-model field across this baseline. Open-Meteo normalizes model output to hourly time series; native resolution becomes coarser later in each forecast (after 90 hours for IFS, 120 for GFS and 78 for ICON Global), though the first 24 hours are documented as natively hourly. Comparison still aligns values by timestamp, never by array index, and does not add client-side interpolation.

Missing values remain missing and are never treated as zero; `0 mm` remains a valid precipitation forecast. Descriptive min/max/spread values report how many models contributed. Model agreement is not a probability, confidence score or accuracy claim. Exact run-generation times are not inferred, and `generationtime_ms` remains API processing latency rather than a model run time.

### Ensemble uncertainty foundation

The probabilistic baseline uses the Open-Meteo Ensemble API (`https://ensemble-api.open-meteo.com/v1/ensemble`) with `icon_global_eps`: DWD ICON-EPS Global, 26 km, 40 members, global coverage, hourly resolution, 7.5-day horizon and 12-hour updates. A request is limited to the next 24 hours and the required fields only: temperature, preceding-hour precipitation, 10 m wind speed/direction and mean sea-level pressure. The API response does not explicitly label control versus perturbed roles, so EFIRIO does not infer them.

Temperature, wind speed, precipitation amount and mean sea-level pressure retain the median and P10–P90 central interval. Absolute minima/maxima are diagnostic only. P10–P90 keeps the central 80% of valid members and avoids allowing one extreme member to define the default future user range. Statistics and probabilities require at least 80% of the 40 members and never fewer than 10 valid members (therefore 32 for this baseline); otherwise the values remain unavailable.

The Ensemble API does not return a ready precipitation probability for this request. EFIRIO calculates the share of valid members forecasting **more than 0.1 mm in the preceding hour**, matching Open-Meteo's documented precipitation-event definition. Missing members are excluded from the denominator, never treated as dry. Because precipitation is zero-inflated, EFIRIO stores both the unconditional P10/median/P90 and a conditional P10/median/P90 amount among wet members when at least three wet members exist. `0 mm` and missing remain distinct.

Open-Meteo normalizes ensemble output to hourly time steps; ICON-EPS Global is already documented as natively hourly. Internal alignment remains timestamp-based, with no client-side temporal interpolation. Ensemble spread is uncertainty guidance, not a guarantee, confidence score or measured accuracy.

### Product representation principle

- **MEASURED:** show the concrete measured value with its observation provenance.
- **FORECAST — CONTINUOUS VALUE:** future user interfaces should show a statistically justified range rather than pseudoprecise temperature, wind, precipitation or pressure values.
- **PROBABILISTIC EVENT:** show a probability whose event and denominator are defined; future UI may round presentation to a reasonable step such as 5%, while the data layer retains full precision.

A3 `best_match` remains the ordinary central forecast, A4 deterministic comparison remains inter-model disagreement, and A5 ensemble data represents within-system probabilistic uncertainty. These layers must remain separately identifiable. Models and individual ensemble members are internal analytical detail by default, not routine user choices.

### Forecast horizons research (A5.2)

Open-Meteo documents and currently serves these relevant global ensemble systems for at least 15 days. Real API probes confirmed temperature, precipitation, 10 m wind and mean sea-level pressure for every listed member at a day-15 timestamp.

| Identifier | Producer / system | Members | Native time step | Horizon / update | Approx. 15-day payload for five hourly fields |
|---|---|---:|---|---|---:|
| `ecmwf_ifs025_ensemble` | ECMWF IFS 0.25° ENS | 51 | 3 h; 6 h after 144 h | 15 d / 6 h | 466 KiB measured |
| `ecmwf_aifs025_ensemble` | ECMWF AIFS 0.25° ENS | 51 | 6 h | 15 d / 6 h | ≈466 KiB |
| `ncep_gefs05` | NOAA/NCEP GEFS 0.5° | 31 | 3 h | 35 d / 6 h | ≈283 KiB |
| `ncep_aigefs025` | NOAA/NCEP AIGEFS 0.25° | 31 | 6 h | 16 d / 6 h | ≈283 KiB |
| `gem_global_ensemble` | Canadian GEM Global Ensemble | 21 | 3 h | 16 d / 12 h | ≈192 KiB |
| `google_weathernext2_ensemble` | Google WeatherNext 2 | 64 | 6 h | 15 d / 12 h | ≈584 KiB |

Open-Meteo normalizes all of these to hourly response arrays. That convenience does not turn interpolated day-8–15 values into natively hourly model guidance. A future long-range layer must therefore expose daily outlook products by default, not pseudoprecise hourly UI.

#### Recommended source architecture

The recommended architecture is **short + long**, not one ensemble for every horizon:

- **0–7 days:** DWD `icon_global_eps`, retaining its native hourly short-range advantage. The existing A5.1 request currently covers only 24 hours; extending it is future work.
- **8–15 days:** ECMWF `ecmwf_ifs025_ensemble`, selected for 51 members, 0.25° global coverage, complete required variables and established 15-day availability. Helsinki and New York probes returned 51/51 temperature members on days 1, 3, 7, 10, 12 and 15. Day-15 temperature, precipitation, wind and pressure were also present for all 51 members. Trailing hours can still be missing when the latest model run does not span the entire requested calendar window.

Using ECMWF IFS for all 15 days would remove the source boundary, but would replace ICON's natively hourly short-range ensemble with a 3-hourly/6-hourly system interpolated by Open-Meteo and increase short-range traffic. Retaining ICON and adding ECMWF preserves the stronger temporal fit of each source, at the cost of a real discontinuity that provenance must not hide.

Days 5–7 form an **overlap diagnostics window**. Keep both systems separate there to detect abrupt disagreement or possible systematic offsets. Do not average their quantiles, apply arbitrary model weights or calibrate a bias from one live forecast. Until historical verification supports a transition method, use a hard source boundary at local day 8. If the long source fails, keep the short forecast and explicitly leave the outlook unavailable.

#### Horizon and aggregation contract

- **0–24 h:** hourly operational data.
- **24–72 h:** hourly internal data; future UI may group by local day.
- **Days 4–7:** hourly source data with daily presentation; retain timestamp-level provenance.
- **Days 8–15:** local-day outlook. Six-hour source semantics are more honest than the API's interpolated hourly appearance; the default output contract is daily, with optional native-cadence diagnostics only.

Daily aggregation must group Unix timestamps by the point's returned IANA timezone, not UTC or the device timezone. This is required for 23/25-hour DST days; do not rely only on the response's fixed `utc_offset_seconds`.

For each member and local day, first require at least 80% of that day's expected hourly slots. Then apply the existing ensemble rule (at least 80% of all members and at least 10 members):

- **Temperature:** member daily minimum, mean and maximum; expose P10 of member minima, median of member means and P90 of member maxima.
- **Precipitation amount:** sum each valid member's hourly amounts, then calculate P10/median/P90 and wet-member conditional amount statistics.
- **Daily precipitation probability:** for each valid member, mark the day wet if at least one hourly interval exceeds 0.1 mm, then divide wet members by valid members. Never sum or average hourly probabilities.
- **Wind:** keep separate P10/median/P90 distributions for member daily mean speed and member daily maximum speed; do not linearly aggregate direction.
- **Mean sea-level pressure:** retain member daily minimum, mean and maximum; expose the corresponding ensemble ranges and median trend.

P10–P90 remains unchanged across horizons; uncertainty should widen through the ensemble distribution rather than by manually changing percentile levels. Equal percentile labels from ICON-EPS and ECMWF ENS are mathematically comparable summaries, but not proof that the systems are equally calibrated.

#### Network and cache strategy

Long-range data should load lazily and fail independently from the operational forecast. A measured ECMWF request for 360 hours × 51 members × five fields was about 465.5 KiB. Restricting a request to local days 8–15 reduced it to about 255.5 KiB, but requires timezone-aware date boundaries. A production adapter should request only the needed long/overlap interval after resolving the point timezone, cache independently, and retain raw canonical units.

Keep the existing A5.1 15-minute cache unchanged. Proposed future TTLs are approximately 6 hours for extended ICON-EPS data (12-hour model updates) and 3 hours for ECMWF ENS outlook data (6-hour updates). A metadata-aware refresh can later avoid downloads when no new run is available. Existing Open-Meteo Free API, CC BY 4.0 attribution and coordinate/privacy requirements continue to apply.

This section records the research decision that the A5.3 analytics foundation implements below. It is not a user-interface feature.

### Unified forecast analytics foundation (A5.3)

The internal unified layer normalizes, but does not erase, the separate source roles:

- A3 Open-Meteo `best_match` is the operational central value when the same variable and exact timestamp are available;
- ICON-EPS supplies the P10–P90 uncertainty envelope for 0–72 hourly output and member-wise daily products for local days 4–7;
- ECMWF IFS ENS supplies daily outlook products for local days 8–15;
- A4 deterministic comparison remains a separate diagnostic and is not converted into probability or used to alter the ensemble envelope.

If an aligned A3 value is unavailable, the ensemble median is retained as a central fallback with explicit fallback provenance. This applies inherently to mean sea-level pressure because the current A3 request does not contain `pressure_msl`. A3 and an ensemble median are never represented as the same evidence. The existing A3 visual component and its 24-hour request remain unchanged; the analytics layer has a separate 72-hour `best_match` request.

The horizon contract is 0–24 hours (`short-hourly`), 24–72 hours (`extended-hourly`), local calendar days 4–7 (`daily`) and local calendar days 8–15 (`outlook`). Day 1 is the local date containing the request time. Hourly periods retain unrounded canonical values. Daily temperature is built member-wise as P10 of daily minima, median of daily means and P90 of daily maxima. Wind keeps separate distributions of member daily mean and maximum speed. Pressure uses P10 of member minima, median of member means and P90 of member maxima. Wind direction is only the aligned A3 direction; the foundation does not create an unnecessary ensemble circular aggregate.

Daily precipitation amount is summed per eligible member before calculating the all-member P10/median/P90 distribution. Wet-member conditional P10/median/P90 uses the same daily totals. Daily event probability means exactly **the probability of at least one hourly interval over 0.1 mm during that local day**; it is the share of eligible members meeting that event and is not a sum, average or maximum of hourly probabilities.

An individual member needs at least 80% of the expected local-day output slots for the variable. For ECMWF, completeness is additionally checked at six-hour native-guidance anchors; interpolated hourly points are not treated as independent native model steps. A product then requires at least 80% of all members and at least 10: 32/40 for ICON-EPS and 41/51 for ECMWF. Zero remains data; null remains missing. A trailing day that fails coverage stays present with unavailable fields and does not invalidate earlier days.

The source boundary is a hard switch: ICON-EPS through local day 7, ECMWF IFS ENS from local day 8. No quantile blending or arbitrary weighting occurs. Days 5–7 overlap is not downloaded merely for diagnostics in this foundation. Every hourly/daily range stores source layer, provider, model identifier/selection, producer, role and fallback state as internal provenance; future ordinary UI need not expose model names.

Local dates and 23/25-hour DST boundaries are derived with the selected point's returned IANA timezone. The result stores UTC start/end boundaries for each local day. It never derives days with `index / 24`, device timezone or UTC midnight.

Long-range loading is explicit and lazy. Initial analytics loads independent A3 72-hour, ICON 24-hour and ICON seven-calendar-day requests; the ECMWF request is made only by `loadUnifiedOutlook()` / `loadLongRange()`. Short/current ICON keeps a 15-minute TTL, extended ICON uses 6 hours, and ECMWF uses 3 hours. Cache keys include rounded coordinates, explicit model, variables and requested hours/days/date window. Display language and local display-unit changes are not request inputs. Source failures are recorded independently; a failed outlook produces unavailable days 8–15 without destroying available hourly/daily data.

Measured UTF-8 response bodies in October 2026 were approximately 35–37 KiB for current ICON (24 hours, five fields), 153–157 KiB for ICON seven-day data (four fields) and 220–226 KiB for ECMWF local days 8–15 (four fields), across Helsinki and New York. Wire compression may change transferred-byte figures. The ECMWF response remains normalized hourly for correct daily amounts and local boundaries, while provenance labels its native six-hour long-range semantics.

The A6.1 presentation layer rounds temperature envelopes outward (`floor(lower)`, `ceil(upper)`) after local unit conversion, probability to the nearest 5%, wind and pressure outward to whole display units, and precipitation with outward tenths below 10 mm. These are presentation rules only; A5.3 continues to store unrounded analytics.

### Unified forecast user presentation (A6.1)

The Forecast tab consumes the unified contract without exposing model names, members, percentiles, fallback labels or the hard source switch. Its internal selector provides 24-hour, 3-day, 7-day and 15-day views. The first two retain hourly detail, grouped by the selected point's local calendar day for the 3-day view. Seven- and fifteen-day views use uniform daily rows.

ECMWF outlook remains lazy: only selecting 15 days requests it. Existing days 1–7 stay visible during loading and on long-source failure. A failed outlook has one localized failure state and retry action rather than eight fabricated daily values. An individual period that fails member coverage remains visible as “Insufficient data”.

When unconditional precipitation median is zero but event probability is at least 50% and wet-member statistics are available, the UI presents the conditional wet-member amount with a short “if precipitation occurs” label. This avoids presenting a high event probability beside a misleading `0…0 mm` amount while preserving the underlying unconditional analytics.
