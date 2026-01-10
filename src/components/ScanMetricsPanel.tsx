import { useEffect, useRef, useState } from 'react'

export type ScanMetrics = {
  hydration: number
  oilBalance: number
  tone: number
  barrierStrength: number
  sensitivity: number
}

const layout = [
  { label: 'Hydration', key: 'hydration', angle: -90, className: 'scan-metrics__item--hydration' },
  { label: 'Oil Balance', key: 'oilBalance', angle: -20, className: 'scan-metrics__item--oil' },
  { label: 'Tone', key: 'tone', angle: -160, className: 'scan-metrics__item--tone' },
  { label: 'Barrier', key: 'barrierStrength', angle: 210, className: 'scan-metrics__item--barrier' },
  { label: 'Sensitivity', key: 'sensitivity', angle: 330, className: 'scan-metrics__item--sensitivity' },
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
      const circle = document.querySelector('.scan-visual__circle') as HTMLElement | null
      if (!overlay || !circle) return

      const overlayRect = overlay.getBoundingClientRect()
      const circleRect = circle.getBoundingClientRect()

      const base = {
        hydration: {
          x: circleRect.left + circleRect.width / 2,
          y: circleRect.top - 50,
          angle: -90,
        },
        oilBalance: {
          x: circleRect.right + 60,
          y: circleRect.top + circleRect.height * 0.25,
          angle: -20,
        },
        tone: {
          x: circleRect.left - 60,
          y: circleRect.top + circleRect.height * 0.3,
          angle: -160,
        },
        barrierStrength: {
          x: circleRect.left + circleRect.width * 0.2,
          y: circleRect.bottom + 55,
          angle: 210,
        },
        sensitivity: {
          x: circleRect.right - circleRect.width * 0.2,
          y: circleRect.bottom + 55,
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
            style={{ left: pos.left, top: pos.top }}
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
