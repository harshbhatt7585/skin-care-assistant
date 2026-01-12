import { useEffect, useRef, useState } from 'react'
import './ScanMetricsPanel.css'

export type ScanMetrics = {
  hydration: number
  oilBalance: number
  tone: number
  barrierStrength: number
  sensitivity: number
}

const layout = [
  {
    label: 'Hydration',
    key: 'hydration',
    angle: -90,
    className: 'scan-metrics__item--hydration',
    floatDelay: 0,
    floatDuration: 5.2,
  },
  {
    label: 'Oil Balance',
    key: 'oilBalance',
    angle: -20,
    className: 'scan-metrics__item--oil',
    floatDelay: 0.6,
    floatDuration: 6.1,
  },
  {
    label: 'Tone',
    key: 'tone',
    angle: -160,
    className: 'scan-metrics__item--tone',
    floatDelay: 1.1,
    floatDuration: 5.6,
  },
  {
    label: 'Barrier',
    key: 'barrierStrength',
    angle: 210,
    className: 'scan-metrics__item--barrier',
    floatDelay: 0.2,
    floatDuration: 6.4,
  },
  {
    label: 'Sensitivity',
    key: 'sensitivity',
    angle: 330,
    className: 'scan-metrics__item--sensitivity',
    floatDelay: 0.9,
    floatDuration: 5.8,
  },
] as const

type LayoutKey = (typeof layout)[number]['key']

type PositionedMetric = {
  left: number
  top: number
  angle: number
}

const ScanMetricsPanel = ({ metrics }: { metrics: ScanMetrics }) => {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [positions, setPositions] = useState<Record<LayoutKey, PositionedMetric>>()

  useEffect(() => {
    const updatePositions = () => {
      const overlay = overlayRef.current
      if (!overlay) return

      const circles = document.querySelectorAll('.scan-visual__grid .scan-visual__circle')
      const targetIndex = Math.floor(circles.length / 2)
      const targetCircle = circles[targetIndex] as HTMLElement | undefined
      if (!targetCircle) return

      const overlayRect = overlay.getBoundingClientRect()
      const circleRect = targetCircle.getBoundingClientRect()

      const base = {
        hydration: {
          x: circleRect.left + circleRect.width / 2,
          y: circleRect.top - 30,
          angle: -90,
        },
        oilBalance: {
          x: circleRect.right + 50,
          y: circleRect.top + circleRect.height * 0.25,
          angle: -20,
        },
        tone: {
          x: circleRect.left - 30,
          y: circleRect.top + circleRect.height * 0.3,
          angle: -160,
        },
        barrierStrength: {
          x: circleRect.left + circleRect.width * 0.2 - 50,
          y: circleRect.bottom - 20,
          angle: 160,
        },
        sensitivity: {
          x: circleRect.right - circleRect.width * 0.2 + 70,
          y: circleRect.bottom - 30,
          angle: 330,
        },
      } satisfies Record<LayoutKey, { x: number; y: number; angle: number }>

      const nextPositions = Object.entries(base).reduce(
        (acc, [key, value]) => {
          acc[key as LayoutKey] = {
            left: value.x - overlayRect.left,
            top: value.y - overlayRect.top,
            angle: value.angle,
          }
          return acc
        },
        {} as Record<LayoutKey, PositionedMetric>,
      )

      setPositions(nextPositions)
    }

    updatePositions()
    window.addEventListener('resize', updatePositions)
    return () => window.removeEventListener('resize', updatePositions)
  }, [])

  return (
    <div ref={overlayRef} className="scan-metrics scan-metrics--overlay" aria-hidden>
      {layout.map((entry) => {
        const metricValue = metrics[entry.key]
        const pos = positions?.[entry.key]
        if (!pos) return null
        return (
          <div
            key={entry.label}
            className={`scan-metrics__item ${entry.className}`}
            style={{
              left: pos.left,
              top: pos.top,
              animationDelay: `${entry.floatDelay}s`,
              animationDuration: `${entry.floatDuration}s`,
            }}
          >
            <span>{entry.label}</span>
            <strong>{metricValue}/5</strong>
            <span
              className="scan-metrics__arrow"
              style={{ transform: `rotate(${pos.angle}deg)` }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default ScanMetricsPanel
