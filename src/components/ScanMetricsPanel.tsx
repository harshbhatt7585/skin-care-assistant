export type ScanMetrics = {
  hydration: number
  oilBalance: number
  tone: number
  barrierStrength: number
  sensitivity: number
}

const ScanMetricsPanel = ({ metrics }: { metrics: ScanMetrics }) => {
  const entries = [
    { label: 'Hydration', value: metrics.hydration },
    { label: 'Oil Balance', value: metrics.oilBalance },
    { label: 'Tone', value: metrics.tone },
    { label: 'Barrier', value: metrics.barrierStrength },
    { label: 'Sensitivity', value: metrics.sensitivity },
  ]

  return (
    <div className="scan-metrics">
      {entries.map((entry) => (
        <div key={entry.label} className="scan-metrics__item">
          <div
            style={{
              position: 'relative',
              width: 0,
              height: 0,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                borderTop: '30px solid red',
                borderRight: '30px solid transparent',
                borderBottom: '30px solid transparent',
                borderLeft: '30px solid transparent',
                width: 0,
                height: 0,
                position: 'relative',
                zIndex: 1,
              }}
            />
            <div
              style={{
                content: "''",
                position: 'absolute',
                width: '100px',
                height: '8px',
                background: '#fff',
                right: '50px',
                top: '-4px',
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
          </div>
          <span>{entry.label}</span>
          <strong>{entry.value}/5</strong>
        </div>
      ))}
    </div>
  )
}

export default ScanMetricsPanel
