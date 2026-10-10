import { useEffect, useState } from 'react'
import type { GeoPoint } from '../weather/types'
import { openMeteoEnsembleProvider } from './openMeteoEnsemble'
import type { EnsembleForecastResult } from './ensembleTypes'

export type EnsembleForecastState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: EnsembleForecastResult }
  | { status: 'error' }

export function useEnsembleForecast(point: GeoPoint | null): EnsembleForecastState {
  const [state, setState] = useState<EnsembleForecastState>({ status: 'idle' })

  useEffect(() => {
    if (!point) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })
    const timer = window.setTimeout(() => {
      openMeteoEnsembleProvider
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
