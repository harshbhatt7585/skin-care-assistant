import './Loader.css'

type LoaderProps = {
  label?: string
  variant?: 'panel' | 'inline'
}

const Loader = ({ label, variant = 'panel' }: LoaderProps) => {
  return (
    <div className={`brand-loader brand-loader--${variant}`} role="status" aria-live="polite">
      <span className="brand-loader__circle" aria-hidden="true" />
      {label && <p className="brand-loader__label">{label}</p>}
    </div>
  )
}

export default Loader
