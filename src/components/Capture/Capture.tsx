import type { RefObject } from 'react'
import CaptureGuidance from '../CaptureGuidance'
import './Capture.css'

type CaptureProps = {
  isLoading: boolean
  error: string | null
  isCaptureActive: boolean
  captureStep: number
  captureInstructions: string[]
  videoRef: RefObject<HTMLVideoElement>
  cameraReady: boolean
  onActivateCapture: () => void
  onDeactivateCapture: () => void
  onCapture: () => Promise<void>
  onVideoReady: () => void
}

const Capture = ({
  isLoading,
  error,
  isCaptureActive,
  captureStep,
  captureInstructions,
  videoRef,
  cameraReady,
  onActivateCapture,
  onDeactivateCapture,
  onCapture,
  onVideoReady,
}: CaptureProps) => {
  return (
    <section className="upload-panel">
      <button
        type="button"
        className="cta-elegant"
        onClick={onActivateCapture}
        disabled={isLoading}
      >
        <span className="cta-elegant__text">Get Started</span>
        <span className="cta-elegant__icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </button>

      {error && <p className="face-error">{error}</p>}

      {isCaptureActive && (
        <div className="camera-panel">
          {captureStep < captureInstructions.length && (
            <p className="capture-instruction">
              Step {captureStep + 1} of {captureInstructions.length}: {captureInstructions[captureStep]}
            </p>
          )}
          <div className="camera-preview__wrapper">
            <video
              ref={videoRef}
              className="camera-preview"
              autoPlay
              playsInline
              muted
              onLoadedMetadata={onVideoReady}
            />
            {captureStep < captureInstructions.length && (
              <CaptureGuidance
                videoRef={videoRef}
                instruction={captureInstructions[captureStep]}
                isActive={isCaptureActive}
              />
            )}
          </div>
          <div className="camera-actions">
            <button type="button" onClick={onCapture} disabled={!cameraReady || isLoading}>
              {cameraReady ? 'Capture photo' : 'Initializing camera…'}
            </button>
            <button type="button" onClick={onDeactivateCapture}>
              Close camera
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default Capture
