import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Translate } from '../i18n'
import type { Settings } from '../settings'
import type { UnifiedForecastController } from '../forecast/useUnifiedForecast'
import type { StationObservation } from '../weather/types'
import type { WeatherState } from '../weather/useWeatherObservation'
import type { SelectedPoint } from './MapView'
import { WeatherCard, type ObservationTab } from './WeatherCard'
import { ForecastCard } from './ForecastCard'

interface ObservationPanelProps {
  activeTab: ObservationTab
  selectedPoint: SelectedPoint | null
  state: WeatherState
  unifiedForecast: UnifiedForecastController
  observation: StationObservation | null
  isManualSelection: boolean
  onActiveTabChange: (tab: ObservationTab) => void
  onClose: () => void
  onUseAutomatic: () => void
  settings: Settings
  t: Translate
}

const TABS: ObservationTab[] = ['weather', 'windPrecipitation', 'station', 'forecast']
const SWIPE_LOCK_THRESHOLD_PX = 10
const SWIPE_CHANGE_THRESHOLD_PX = 48
const PANEL_DRAG_THRESHOLD_PX = 40

interface GestureState {
  pointerId: number
  startX: number
  startY: number
  currentX: number
  direction: 'horizontal' | 'vertical' | null
}

interface PanelDragState {
  pointerId: number
  startY: number
  currentY: number
}

export function ObservationPanel({
  activeTab,
  selectedPoint,
  state,
  unifiedForecast,
  observation,
  isManualSelection,
  onActiveTabChange,
  onClose,
  onUseAutomatic,
  settings,
  t,
}: ObservationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const gestureRef = useRef<GestureState | null>(null)
  const panelDragRef = useRef<PanelDragState | null>(null)
  const suppressHandleClickRef = useRef(false)

  useEffect(() => {
    setIsExpanded(false)
  }, [selectedPoint?.latitude, selectedPoint?.longitude])

  const changeTab = (offset: number) => {
    const currentIndex = TABS.indexOf(activeTab)
    const nextIndex = (currentIndex + offset + TABS.length) % TABS.length
    onActiveTabChange(TABS[nextIndex])
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      direction: null,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    gesture.currentX = event.clientX
    if (!gesture.direction) {
      const horizontalDistance = Math.abs(event.clientX - gesture.startX)
      const verticalDistance = Math.abs(event.clientY - gesture.startY)
      if (Math.max(horizontalDistance, verticalDistance) < SWIPE_LOCK_THRESHOLD_PX) return

      if (horizontalDistance > verticalDistance * 1.2) gesture.direction = 'horizontal'
      else if (verticalDistance > horizontalDistance * 1.2) gesture.direction = 'vertical'
      else return
    }

    if (gesture.direction === 'horizontal') event.preventDefault()
  }

  const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.direction !== 'horizontal') return

    const horizontalDistance = event.clientX - gesture.startX
    if (Math.abs(horizontalDistance) < SWIPE_CHANGE_THRESHOLD_PX) return
    changeTab(horizontalDistance < 0 ? 1 : -1)
  }

  const startPanelDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary) return
    panelDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      currentY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const movePanelDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = panelDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.currentY = event.clientY
    if (Math.abs(drag.currentY - drag.startY) >= SWIPE_LOCK_THRESHOLD_PX) event.preventDefault()
  }

  const finishPanelDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = panelDragRef.current
    panelDragRef.current = null
    if (!drag || drag.pointerId !== event.pointerId) return
    const verticalDistance = event.clientY - drag.startY
    if (Math.abs(verticalDistance) < PANEL_DRAG_THRESHOLD_PX) return
    suppressHandleClickRef.current = true
    setIsExpanded(verticalDistance < 0)
  }

  const togglePanel = () => {
    if (suppressHandleClickRef.current) {
      suppressHandleClickRef.current = false
      return
    }
    setIsExpanded((expanded) => !expanded)
  }

  const closePanel = () => {
    setIsExpanded(false)
    onClose()
  }

  return (
    <aside
      className={isExpanded ? 'point-panel point-panel--expanded surface' : 'point-panel surface'}
      aria-live="polite"
    >
      <button
        className="panel-handle"
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? t('collapseDataPanel') : t('expandDataPanel')}
        onClick={togglePanel}
        onPointerDown={startPanelDrag}
        onPointerMove={movePanelDrag}
        onPointerUp={finishPanelDrag}
        onPointerCancel={() => {
          panelDragRef.current = null
        }}
      >
        <span aria-hidden="true" />
      </button>
      <header className="point-panel__header">
        <div>
          <h2>{t('selectedPoint')}</h2>
          <span>{t(activeTab)}</span>
        </div>
        <button className="panel-close-button" type="button" onClick={closePanel} aria-label={t('closeDataPanel')}>
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div
        className="point-panel__content"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={() => {
          gestureRef.current = null
        }}
      >
        {activeTab === 'forecast' ? (
          <ForecastCard controller={unifiedForecast} settings={settings} t={t} />
        ) : (
          <WeatherCard
            activeTab={activeTab}
            selectedPoint={selectedPoint}
            state={state}
            observation={observation}
            isManualSelection={isManualSelection}
            onUseAutomatic={onUseAutomatic}
            settings={settings}
            t={t}
          />
        )}
      </div>

      <nav className="tab-indicator" aria-label={t('dataTabs')}>
        {TABS.map((tab) => (
          <button
            className={tab === activeTab ? 'tab-dot tab-dot--active' : 'tab-dot'}
            type="button"
            key={tab}
            onClick={() => onActiveTabChange(tab)}
            aria-label={t(tab)}
            aria-current={tab === activeTab ? 'page' : undefined}
          />
        ))}
      </nav>
    </aside>
  )
}
