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
          <span>{entry.label}</span>
          <strong>{entry.value}/5</strong>
        </div>
      ))}
    </div>
  )
}

export default ScanMetricsPanel
