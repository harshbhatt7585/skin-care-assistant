import type { RefObject } from 'react'
import CaptureGuidance from '../CaptureGuidance'
import './Capture.css'

type CaptureProps = {
  isCaptureActive: boolean
  captureStep: number
  captureInstructions: string[]
  videoRef: RefObject<HTMLVideoElement>
  cameraReady: boolean
  onDeactivateCapture: () => void
  onCapture: () => Promise<void>
  onVideoReady: () => void
  isLoading: boolean
}

const Capture = ({
  isCaptureActive,
  captureStep,
  captureInstructions,
  videoRef,
  cameraReady,
  onDeactivateCapture,
  onCapture,
  onVideoReady,
  isLoading,
}: CaptureProps) => {
  if (!isCaptureActive) {
    return null
  }

  return (
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
        <button
          type="button"
          onClick={() => {
            void onCapture()
          }}
          disabled={!cameraReady || isLoading}
        >
          {cameraReady ? 'Capture photo' : 'Initializing camera…'}
        </button>
        <button type="button" onClick={onDeactivateCapture}>
          Close camera
        </button>
      </div>
    </div>
  )
}

export default Capture
