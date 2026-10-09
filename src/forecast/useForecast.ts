import { useEffect, useState } from 'react'
import type { SelectedPoint } from '../components/MapView'
import { openMeteoForecastProvider } from './openMeteo'
import type { ForecastResult } from './types'

export type ForecastState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: ForecastResult }
  | { status: 'error' }

export function useForecast(point: SelectedPoint | null): ForecastState {
  const [state, setState] = useState<ForecastState>({ status: 'idle' })

  useEffect(() => {
    if (!point) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })
    const timer = window.setTimeout(() => {
      openMeteoForecastProvider
        .getForecast(point, controller.signal)
        .then((result) => setState({ status: 'success', result }))
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
