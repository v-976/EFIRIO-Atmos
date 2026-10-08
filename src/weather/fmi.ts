import type {
  GeoPoint,
  ObservationMeasurement,
  ObservationProvider,
  ObservationVariable,
  StationObservation,
} from './types'

const FMI_WFS_URL = 'https://opendata.fmi.fi/wfs'
const FMI_STORED_QUERY = 'fmi::observations::weather::multipointcoverage'
const REQUEST_PARAMETERS = 't2m,ws_10min,wd_10min,rh,p_sea,r_1h,ri_10min'
const FRESHNESS_LIMIT_MS = 60 * 60 * 1000
const QUERY_WINDOW_MS = 3 * 60 * 60 * 1000
const CACHE_TTL_MS = 10 * 60 * 1000
const SEARCH_RADII_KM = [1, 3, 5, 10, 25, 50, 100, 200]
const QUERY_RADII_KM = [25, 50, 100, 200]

const PARAMETER_MAP: Record<
  string,
  { variable: ObservationVariable; unit: ObservationMeasurement['unit'] }
> = {
  t2m: { variable: 'temperature', unit: '°C' },
  ws_10min: { variable: 'windSpeed', unit: 'm/s' },
  wd_10min: { variable: 'windDirection', unit: '°' },
  rh: { variable: 'humidity', unit: '%' },
  p_sea: { variable: 'pressure', unit: 'hPa' },
  r_1h: { variable: 'precipitation1h', unit: 'mm' },
  ri_10min: { variable: 'precipitationIntensity', unit: 'mm/h' },
}

interface ParsedStation {
  id: string
  name: string
  location: GeoPoint
  measurements: Partial<Record<ObservationVariable, ObservationMeasurement>>
}

interface CachedResponse {
  expiresAt: number
  stations: ParsedStation[]
}

const responseCache = new Map<string, CachedResponse>()

function coordinateKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`
}

function distanceKm(first: GeoPoint, second: GeoPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(second.latitude - first.latitude)
  const longitudeDelta = toRadians(second.longitude - first.longitude)
  const firstLatitude = toRadians(first.latitude)
  const secondLatitude = toRadians(second.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function bboxAround(point: GeoPoint, radiusKm: number): string {
  const latitudeDelta = radiusKm / 111.32
  const longitudeScale = Math.max(Math.cos((point.latitude * Math.PI) / 180), 0.1)
  const longitudeDelta = radiusKm / (111.32 * longitudeScale)

  return [
    point.longitude - longitudeDelta,
    point.latitude - latitudeDelta,
    point.longitude + longitudeDelta,
    point.latitude + latitudeDelta,
  ]
    .map((coordinate) => coordinate.toFixed(5))
    .join(',')
}

function buildRequestUrl(point: GeoPoint, radiusKm: number, now: number): string {
  const intervalMs = 10 * 60 * 1000
  const endTime = Math.floor(now / intervalMs) * intervalMs
  const parameters = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'getFeature',
    storedquery_id: FMI_STORED_QUERY,
    bbox: bboxAround(point, radiusKm),
    starttime: new Date(endTime - QUERY_WINDOW_MS).toISOString(),
    endtime: new Date(endTime).toISOString(),
    timestep: '10',
    parameters: REQUEST_PARAMETERS,
  })

  return `${FMI_WFS_URL}?${parameters.toString()}`
}

function firstChildText(element: Element, localName: string): string | null {
  const child = Array.from(element.children).find((item) => item.localName === localName)
  return child?.textContent?.trim() || null
}

export function parseFmiResponse(xmlText: string): ParsedStation[] {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml')
  const parserError = document.getElementsByTagName('parsererror')[0]
  const exception = document.getElementsByTagNameNS('*', 'ExceptionText')[0]

  if (parserError || exception) {
    throw new Error(exception?.textContent?.trim() || 'FMI returned invalid XML')
  }

  const fieldNames = Array.from(document.getElementsByTagNameNS('*', 'field'))
    .map((field) => field.getAttribute('name'))
    .filter((name): name is string => Boolean(name))
  const positionsText = document.getElementsByTagNameNS('*', 'positions')[0]?.textContent
  const valuesText = document.getElementsByTagNameNS('*', 'doubleOrNilReasonTupleList')[0]?.textContent

  if (!positionsText || !valuesText || fieldNames.length === 0) return []

  const stationMetadata = new Map<string, { id: string; name: string; location: GeoPoint }>()
  for (const pointElement of Array.from(document.getElementsByTagNameNS('*', 'Point'))) {
    const position = firstChildText(pointElement, 'pos')?.split(/\s+/).map(Number)
    if (!position || position.length < 2 || position.some((value) => !Number.isFinite(value))) continue

    const idAttribute =
      pointElement.getAttributeNS('http://www.opengis.net/gml/3.2', 'id') || pointElement.getAttribute('gml:id') || ''
    const location = { latitude: position[0], longitude: position[1] }
    stationMetadata.set(coordinateKey(location.latitude, location.longitude), {
      id: idAttribute.replace(/^point-/, '') || coordinateKey(location.latitude, location.longitude),
      name: firstChildText(pointElement, 'name') || 'FMI station',
      location,
    })
  }

  const positions = positionsText.trim().split(/\s+/).map(Number)
  const values = valuesText.trim().split(/\s+/)
  const rowCount = Math.floor(positions.length / 3)
  const stations = new Map<string, ParsedStation>()

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const latitude = positions[rowIndex * 3]
    const longitude = positions[rowIndex * 3 + 1]
    const timestampSeconds = positions[rowIndex * 3 + 2]
    if (![latitude, longitude, timestampSeconds].every(Number.isFinite)) continue

    const key = coordinateKey(latitude, longitude)
    const metadata = stationMetadata.get(key) || {
      id: key,
      name: 'FMI station',
      location: { latitude, longitude },
    }
    const station = stations.get(metadata.id) || { ...metadata, measurements: {} }
    const observedAt = new Date(timestampSeconds * 1000).toISOString()

    fieldNames.forEach((parameterName, parameterIndex) => {
      const definition = PARAMETER_MAP[parameterName]
      if (!definition) return
      const value = Number(values[rowIndex * fieldNames.length + parameterIndex])
      if (!Number.isFinite(value)) return

      const current = station.measurements[definition.variable]
      if (!current || current.observedAt < observedAt) {
        station.measurements[definition.variable] = {
          variable: definition.variable,
          value,
          unit: definition.unit,
          observedAt,
          source: 'FMI',
          quality: 'notProvided',
        }
      }
    })

    stations.set(metadata.id, station)
  }

  return Array.from(stations.values())
}

async function requestStations(url: string, signal?: AbortSignal): Promise<ParsedStation[]> {
  const cached = responseCache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.stations

  const response = await fetch(url, { signal, headers: { Accept: 'application/xml,text/xml' } })
  if (!response.ok) throw new Error(`FMI request failed with status ${response.status}`)

  const stations = parseFmiResponse(await response.text())
  responseCache.set(url, { stations, expiresAt: Date.now() + CACHE_TTL_MS })
  return stations
}

function mergeStations(target: Map<string, ParsedStation>, incoming: ParsedStation[]): void {
  for (const station of incoming) {
    const existing = target.get(station.id)
    if (!existing) {
      target.set(station.id, station)
      continue
    }

    for (const measurement of Object.values(station.measurements)) {
      if (!measurement) continue
      const current = existing.measurements[measurement.variable]
      if (!current || current.observedAt < measurement.observedAt) {
        existing.measurements[measurement.variable] = measurement
      }
    }
  }
}

function rankStations(stations: ParsedStation[], point: GeoPoint, radiusKm: number, now: number) {
  return stations
    .map((station) => {
      const measurements = Object.values(station.measurements).filter(
        (measurement): measurement is ObservationMeasurement => Boolean(measurement),
      )
      const latestTime = Math.max(...measurements.map((measurement) => Date.parse(measurement.observedAt)))
      return {
        station,
        distance: distanceKm(point, station.location),
        latestTime,
        completeness: measurements.length,
        isFresh: Number.isFinite(latestTime) && now - latestTime <= FRESHNESS_LIMIT_MS,
      }
    })
    .filter((candidate) => candidate.distance <= radiusKm && Number.isFinite(candidate.latestTime))
    .sort(
      (first, second) =>
        Number(second.isFresh) - Number(first.isFresh) ||
        second.completeness - first.completeness ||
        second.latestTime - first.latestTime ||
        first.distance - second.distance,
    )
}

function toObservation(
  candidate: ReturnType<typeof rankStations>[number],
  now: number,
): StationObservation {
  return {
    station: {
      id: candidate.station.id,
      name: candidate.station.name,
      location: candidate.station.location,
      distanceKm: candidate.distance,
    },
    measurements: candidate.station.measurements,
    lastObservedAt: new Date(candidate.latestTime).toISOString(),
    isStale: now - candidate.latestTime > FRESHNESS_LIMIT_MS,
    source: {
      id: 'fmi',
      name: 'Finnish Meteorological Institute (FMI)',
      url: 'https://en.ilmatieteenlaitos.fi/open-data',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
  }
}

export const fmiObservationProvider: ObservationProvider = {
  id: 'fmi',
  async findNearest(point, signal) {
    const now = Date.now()
    const collectedStations = new Map<string, ParsedStation>()
    let staleCandidate: ReturnType<typeof rankStations>[number] | undefined

    for (const queryRadius of QUERY_RADII_KM) {
      const url = buildRequestUrl(point, queryRadius, now)
      mergeStations(collectedStations, await requestStations(url, signal))

      const radiiToEvaluate = SEARCH_RADII_KM.filter(
        (radius) => radius <= queryRadius && radius > (QUERY_RADII_KM[QUERY_RADII_KM.indexOf(queryRadius) - 1] || 0),
      )
      for (const radius of radiiToEvaluate) {
        const candidates = rankStations(Array.from(collectedStations.values()), point, radius, now)
        const freshCandidate = candidates.find((candidate) => candidate.isFresh)
        if (freshCandidate) return toObservation(freshCandidate, now)
        staleCandidate ||= candidates[0]
      }
    }

    return staleCandidate ? toObservation(staleCandidate, now) : null
  },
}
