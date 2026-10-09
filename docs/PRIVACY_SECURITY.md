# Privacy & security requirements

## Objective
Make EFIRIO Atmos a low-value target for theft by **not collecting personal profiles**, while maintaining protection against data poisoning, service abuse, supply-chain compromise and outages. No system can guarantee immunity from attack.

## Data minimization
- No accounts, passwords, advertising IDs, payments, trackers or server-side personal analytics.
- Saved places, chosen allergens, thresholds and preferences stay on the device.
- No cross-device synchronization or profile export/import/backup.
- Geolocation is requested only on user action; manual map use must work without it.
- Server collectors independently ingest public regional environmental data; no user history is required.
- Prefer region-based bundles and client-side selection over precise-coordinate queries.
- Browser storage is not guaranteed durable against clearing data or device loss.

## Network realities
Server/CDN/tile/geocoder providers can potentially see IP addresses, request times, viewport or query strings. Review and minimize reverse-proxy/CDN/access/error/security logs; set short retention where unavoidable; avoid exact coordinates in URLs. Do not claim perfect anonymity or zero metadata.

## Security controls
- Read-only public API; strict request validation, quotas, bounded queries, caching and abuse controls.
- Separate ingestion and publication privileges; restricted egress, staging and data validation.
- TLS, dependency pinning/review, secret management, backups of shared environmental data and documented recovery.
- No credentials or sensitive configuration in public repository, front-end bundles or CI logs.
- Treat public telemetry as untrusted; defend against fabricated, duplicated or poisoned sensor data.
- Do not expose administrative endpoints publicly; least-privilege deployment.
- Document third-party licenses and attribution. Never collect private radio/MQTT data without authorization.
- Explain observation vs estimate vs forecast and do not conceal missing/stale data.

## Before public deployment
Perform threat modelling, dependency and license audit, configuration review, API abuse tests, privacy review of map/geocoding providers and a clear public privacy notice. Privacy claims must describe actual deployed behavior, not merely design intent.

## Localization preferences
The selected interface language is stored locally only. Automatic browser-language detection and optional manual language override require no registration or geolocation. No user language preference is saved server-side.

## Forecast data flow — separation of responsibility

### EFIRIO Atmos itself
- Has no backend for user profiles.
- Does not store a history of user-selected coordinates on its own server.
- Does not collect its own analytics or telemetry.
- Does not determine geolocation automatically; the user selects the point on the map.
- Keeps personal settings (language, units) locally on the device.

### Open-Meteo (external forecast provider)
- To obtain a forecast, the user's browser sends the selected point's coordinates **directly from the client** to Open-Meteo; the request does not pass through an EFIRIO Atmos server.
- The provider also receives ordinary network metadata of the request, including the client IP address.
- Processing and retention on the provider side are governed by the provider's own privacy policy and terms, not by EFIRIO Atmos.
- According to the current official Open-Meteo conditions, technical logs may contain IP addresses and coordinates and may be retained for up to 90 days.

EFIRIO Atmos documents this flow and cannot guarantee that third parties perform no data processing; claims must describe actual behavior rather than promise absolute anonymity or legal conclusions such as "GDPR does not apply".
