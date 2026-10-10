import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoPoint } from '../weather/types'
import { loadUnifiedForecast, loadUnifiedOutlook } from './unifiedForecast'
import type { UnifiedForecastResult } from './unifiedForecastTypes'

export type UnifiedForecastState =
  | { status: 'idle'; result: null; longStatus: 'not-requested' }
  | { status: 'loading'; result: null; longStatus: 'not-requested' }
  | {
      status: 'success'
      result: UnifiedForecastResult
      longStatus: 'not-requested' | 'loading' | 'available' | 'error'
    }
  | { status: 'error'; result: null; longStatus: 'not-requested' }

export interface UnifiedForecastController {
  state: UnifiedForecastState
  loadLongRange: () => Promise<void>
}

export function useUnifiedForecast(point: GeoPoint | null): UnifiedForecastController {
  const [state, setState] = useState<UnifiedForecastState>({
    status: 'idle',
    result: null,
    longStatus: 'not-requested',
  })
  const stateRef = useRef(state)
  const longControllerRef = useRef<AbortController | null>(null)
  stateRef.current = state

  useEffect(() => {
    longControllerRef.current?.abort()
    if (!point) {
      setState({ status: 'idle', result: null, longStatus: 'not-requested' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading', result: null, longStatus: 'not-requested' })
    const timer = window.setTimeout(() => {
      loadUnifiedForecast(point, controller.signal)
        .then((result) => setState({ status: 'success', result, longStatus: 'not-requested' }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setState({ status: 'error', result: null, longStatus: 'not-requested' })
        })
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      longControllerRef.current?.abort()
    }
  }, [point])

  const loadLongRange = useCallback(async () => {
    const current = stateRef.current
    if (
      current.status !== 'success'
      || current.longStatus === 'loading'
      || (longControllerRef.current && !longControllerRef.current.signal.aborted)
    ) return
    const controller = new AbortController()
    longControllerRef.current?.abort()
    longControllerRef.current = controller
    setState({ ...current, longStatus: 'loading' })
    try {
      const result = await loadUnifiedOutlook(current.result, controller.signal)
      if (controller.signal.aborted) return
      longControllerRef.current = null
      setState({
        status: 'success',
        result,
        longStatus: result.sources.longEnsemble.status === 'available' ? 'available' : 'error',
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      longControllerRef.current = null
      const latest = stateRef.current
      if (latest.status === 'success') setState({ ...latest, longStatus: 'error' })
    }
  }, [])

  return { state, loadLongRange }
}
