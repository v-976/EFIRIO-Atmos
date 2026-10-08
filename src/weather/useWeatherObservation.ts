import { useEffect, useState } from 'react'
import type { SelectedPoint } from '../components/MapView'
import { fmiObservationProvider } from './fmi'
import type { StationObservation } from './types'

export type WeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; observation: StationObservation }
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
        .findNearest(point, controller.signal)
        .then((observation) => {
          setState(observation ? { status: 'success', observation } : { status: 'noStation' })
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
