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
The selected interface language is stored locally only. The first-launch language picker requires no registration or geolocation. No user language preference is saved server-side.
