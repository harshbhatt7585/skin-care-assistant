import { FaceDetection } from '@mediapipe/face_detection'

let detectorPromise: Promise<FaceDetection> | null = null

const createFaceDetector = async () => {
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
    detectorPromise = createFaceDetector().catch((error) => {
      detectorPromise = null
      throw error
    })
  }
  return detectorPromise
}

const loadImage = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the provided image.'))
    image.src = dataUrl
  })

export const detectFaceFromDataUrl = async (dataUrl: string): Promise<boolean> => {
  const [detector, image] = await Promise.all([getFaceDetector(), loadImage(dataUrl)])

  return new Promise<boolean>((resolve, reject) => {
    detector.onResults((results) => {
      resolve(Boolean(results.detections?.length))
    })

    detector
      .send({ image })
      .catch((error) => {
        reject(error)
      })
  })
}
