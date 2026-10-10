import { useEffect, useState } from 'react'
import type { GeoPoint } from '../weather/types'
import { openMeteoMultiModelProvider } from './openMeteoMultiModel'
import type { MultiModelForecastResult } from './multiModelTypes'

export type MultiModelForecastState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: MultiModelForecastResult }
  | { status: 'error' }

export function useMultiModelForecast(point: GeoPoint | null): MultiModelForecastState {
  const [state, setState] = useState<MultiModelForecastState>({ status: 'idle' })

  useEffect(() => {
    if (!point) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })
    const timer = window.setTimeout(() => {
      openMeteoMultiModelProvider
        .getForecast(point, undefined, controller.signal)
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
