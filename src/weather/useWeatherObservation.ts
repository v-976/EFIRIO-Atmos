import { useEffect, useState } from 'react'
import type { SelectedPoint } from '../components/MapView'
import { fmiObservationProvider } from './fmi'
import type { StationSearchResult } from './types'

export type WeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: StationSearchResult }
  | { status: 'noStation' }
  | { status: 'error' }

export function useWeatherObservation(point: SelectedPoint | null): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: 'idle' })

  useEffect(() => {
    if (!point) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })
    const timer = window.setTimeout(() => {
      fmiObservationProvider
        .findNearby(point, controller.signal)
        .then((result) => {
          setState(result ? { status: 'success', result } : { status: 'noStation' })
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setState({ status: 'error' })
        })
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [point])

  return state
}
