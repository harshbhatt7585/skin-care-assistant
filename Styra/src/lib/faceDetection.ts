import { FaceDetection } from '@mediapipe/face_detection'
import type { InputImage, Results } from '@mediapipe/face_detection'

let detectorPromise: Promise<FaceDetection> | null = null
let hasResultsHandler = false
const detectionListeners = new Set<(results: Results) => void>()
let sendQueue: Promise<void> = Promise.resolve()

const buildFaceDetector = async () => {
  const detector = new FaceDetection({
    locateFile: (file) => `/mediapipe/face_detection/${file}`,
  })

  detector.setOptions({
    model: 'short',
    minDetectionConfidence: 0.5,
  })

  await detector.initialize()
  return detector
}

const getFaceDetector = () => {
  if (!detectorPromise) {
    detectorPromise = buildFaceDetector().catch((error) => {
      detectorPromise = null
      throw error
    })
  }
  return detectorPromise
}

const ensureDetectorReady = async () => {
  const detector = await getFaceDetector()
  if (!hasResultsHandler) {
    detector.onResults((results) => {
      detectionListeners.forEach((listener) => listener(results))
    })
    hasResultsHandler = true
  }
  return detector
}

const addDetectionListener = (listener: (results: Results) => void) => {
  detectionListeners.add(listener)
  return () => detectionListeners.delete(listener)
}

export const subscribeToFaceDetections = async (
  listener: (results: Results) => void,
): Promise<() => void> => {
  await ensureDetectorReady()
  return addDetectionListener(listener)
}

export const runFaceDetection = async (image: InputImage) => {
  const detector = await ensureDetectorReady()
  sendQueue = sendQueue.then(() => detector.send({ image }))
  return sendQueue
}

const loadImage = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the provided image.'))
    image.src = dataUrl
  })

export const detectFaceFromDataUrl = async (dataUrl: string): Promise<boolean> => {
  const image = await loadImage(dataUrl)

  return new Promise<boolean>((resolve, reject) => {
    let unsubscribe: (() => void) | null = null
    const cleanup = () => {
      unsubscribe?.()
      window.clearTimeout(timeoutId)
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('Face detection timed out.'))
    }, 5000)

    subscribeToFaceDetections((results) => {
      cleanup()
      resolve(Boolean(results.detections?.length))
    })
      .then((remove) => {
        unsubscribe = remove
        return runFaceDetection(image)
      })
      .catch((error) => {
        cleanup()
        reject(error)
      })
  })
}
