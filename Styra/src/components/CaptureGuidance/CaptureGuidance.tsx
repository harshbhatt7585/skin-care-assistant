import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import './CaptureGuidance.css'

type Props = {
  videoRef: MutableRefObject<HTMLVideoElement | null>
  instruction?: string
  isActive: boolean
}

type GuidePoint = {
  label: string
  x: number
  y: number
  depth: number
}

type PoseKey = 'front' | 'left' | 'right'

const GUIDE_PRESETS: Record<PoseKey, GuidePoint[]> = {
  front: [
    { label: 'left eye', x: 0.32, y: 0.38, depth: -0.2 },
    { label: 'right eye', x: 0.68, y: 0.38, depth: -0.2 },
    { label: 'nose', x: 0.5, y: 0.55, depth: 0.8 },
    { label: 'chin', x: 0.5, y: 0.78, depth: -0.1 },
    { label: 'right jaw', x: 0.75, y: 0.6, depth: -0.4 },
    { label: 'left jaw', x: 0.25, y: 0.6, depth: -0.4 },
    { label: 'head', x: 0.5, y: 0.28, depth: -0.2 },
  ],
  left: [
    { label: 'eye', x: 0.62, y: 0.38, depth: -0.2 },
    { label: 'nose bridge', x: 0.55, y: 0.46, depth: 0.3 },
    { label: 'nose tip', x: 0.4, y: 0.54, depth: 0.8 },
    { label: 'chin', x: 0.48, y: 0.8, depth: -0.1 },
    { label: 'jawline', x: 0.7, y: 0.7, depth: -0.2 },
  ],
  right: [
    { label: 'eye', x: 0.38, y: 0.38, depth: -0.2 },
    { label: 'nose bridge', x: 0.45, y: 0.46, depth: 0.3 },
    { label: 'nose tip', x: 0.6, y: 0.54, depth: 0.8 },
    { label: 'chin', x: 0.52, y: 0.8, depth: -0.1 },
    { label: 'jawline', x: 0.3, y: 0.7, depth: -0.2 },
  ],
}

const GUIDE_CONNECTIONS: Record<PoseKey, Array<[number, number]>> = {
  front: [
    [0, 1],
    [0, 2],
    [1, 2],
    [6, 0],
    [6, 1],
    [0, 5],
    [1, 4],
    [2, 4],
    [2, 5],
    [4, 3],
    [3, 5],
  ],
  left: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
  ],
  right: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
  ],
}

const determinePose = (instruction?: string): PoseKey => {
  const copy = instruction?.toLowerCase() ?? ''
  if (copy.includes('left')) return 'left'
  if (copy.includes('right')) return 'right'
  return 'front'
}

const drawScanLine = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
) => {
  // Scan line moves from top to bottom in a loop (3 second cycle)
  const scanSpeed = 0.0004
  const progress = (time * scanSpeed) % 1
  const scanY = progress * height

  // Scan line glow gradient (fades above the line)
  const trailHeight = height * 0.15
  const gradient = ctx.createLinearGradient(0, scanY - trailHeight, 0, scanY + 4)
  gradient.addColorStop(0, 'rgba(114, 255, 230, 0)')
  gradient.addColorStop(0.7, 'rgba(114, 255, 230, 0.08)')
  gradient.addColorStop(1, 'rgba(114, 255, 230, 0.25)')

  // Draw the trail (full width)
  ctx.fillStyle = gradient
  ctx.fillRect(0, scanY - trailHeight, width, trailHeight + 4)

  // Main scan line (full width)
  ctx.save()
  ctx.shadowColor = 'rgba(114, 255, 230, 0.8)'
  ctx.shadowBlur = 15
  
  const lineGradient = ctx.createLinearGradient(0, 0, width, 0)
  lineGradient.addColorStop(0, 'rgba(114, 255, 230, 0.6)')
  lineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
  lineGradient.addColorStop(1, 'rgba(114, 255, 230, 0.6)')

  ctx.strokeStyle = lineGradient
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, scanY)
  ctx.lineTo(width, scanY)
  ctx.stroke()
  ctx.restore()
}

// Helper to get animated point position with floating effect
const getAnimatedPoint = (
  point: GuidePoint,
  index: number,
  time: number,
  width: number,
  height: number,
) => {
  // Each point has a unique phase offset based on index
  const phase = index * 0.8
  // Gentle floating motion
  const floatX = Math.sin(time * 0.001 + phase) * 3
  const floatY = Math.cos(time * 0.0008 + phase) * 2
  // Breathing scale effect (centered on the skeleton)
  const breathe = 1 + Math.sin(time * 0.0015) * 0.008
  
  const centerX = width * 0.5
  const centerY = height * 0.5
  const baseX = point.x * width
  const baseY = point.y * height
  
  // Apply breathing scale from center
  const scaledX = centerX + (baseX - centerX) * breathe
  const scaledY = centerY + (baseY - centerY) * breathe
  
  return {
    x: scaledX + floatX,
    y: scaledY + floatY,
  }
}

const drawGuide = (
  canvas: HTMLCanvasElement,
  pose: PoseKey,
  points: GuidePoint[],
  time: number,
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = canvas.width
  const height = canvas.height
  ctx.clearRect(0, 0, width, height)

  // Draw scan line first (behind everything)
  drawScanLine(ctx, width, height, time)

  const glow = 0.6 + 0.4 * Math.sin(time * 0.0012)
  
  // Pre-calculate animated positions for all points
  const animatedPoints = points.map((point, index) => 
    getAnimatedPoint(point, index, time, width, height)
  )

  // Draw connection lines with shimmer effect
  ctx.shadowColor = 'rgba(114,255,230,0.35)'
  ctx.shadowBlur = 10

  GUIDE_CONNECTIONS[pose]?.forEach(([startIndex, endIndex], lineIndex) => {
    const start = animatedPoints[startIndex]
    const end = animatedPoints[endIndex]
    if (!start || !end) return

    // Create gradient along the line for shimmer effect
    const lineGradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y)
    
    // Shimmer travels along the line
    const shimmerPos = ((time * 0.001 + lineIndex * 0.3) % 1)
    const shimmerWidth = 0.15
    
    const baseOpacity = 0.45 + glow * 0.35
    lineGradient.addColorStop(0, `rgba(114,255,230,${baseOpacity})`)
    lineGradient.addColorStop(Math.max(0, shimmerPos - shimmerWidth), `rgba(114,255,230,${baseOpacity})`)
    lineGradient.addColorStop(shimmerPos, `rgba(200,255,250,${Math.min(1, baseOpacity + 0.4)})`)
    lineGradient.addColorStop(Math.min(1, shimmerPos + shimmerWidth), `rgba(114,255,230,${baseOpacity})`)
    lineGradient.addColorStop(1, `rgba(114,255,230,${baseOpacity})`)

    ctx.strokeStyle = lineGradient
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  })

  ctx.shadowBlur = 0

  // Draw points with staggered pulsing
  points.forEach((landmark, index) => {
    const { x, y } = animatedPoints[index]
    
    // Staggered pulse - each point pulses at different times
    const pulsePhase = index * 0.5
    const pulse = Math.sin(time * 0.003 + pulsePhase)
    
    const baseRadius = 8 + landmark.depth * 8
    const radius = baseRadius + pulse * 3
    
    // Outer glow ring
    const outerRadius = radius * 1.8 + pulse * 2
    const outerGradient = ctx.createRadialGradient(x, y, radius, x, y, outerRadius)
    outerGradient.addColorStop(0, `rgba(114,255,230,${0.2 + pulse * 0.1})`)
    outerGradient.addColorStop(1, 'rgba(114,255,230,0)')
    
    ctx.beginPath()
    ctx.fillStyle = outerGradient
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2)
    ctx.fill()
    
    // Main point gradient
    const gradient = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
    gradient.addColorStop(0.5, `rgba(114,255,230,${0.65 + glow * 0.2})`)
    gradient.addColorStop(1, 'rgba(114,255,230,0)')

    ctx.beginPath()
    ctx.fillStyle = gradient
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}

const CaptureGuidance = ({ videoRef, instruction, isActive }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const pose = useMemo(() => determinePose(instruction), [instruction])
  const guidePoints = useMemo(() => GUIDE_PRESETS[pose], [pose])

  useEffect(() => {
    if (!isActive || !guidePoints) {
      const canvas = canvasRef.current
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    let cancelled = false
    let rafId: number | null = null

    const syncCanvasSize = () => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return false
      const rect = video.getBoundingClientRect()
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)
      const needsResize = canvas.width !== width || canvas.height !== height
      if (needsResize) {
        canvas.width = width
        canvas.height = height
      }
      return Boolean(canvas && video)
    }

    const render = (time = 0) => {
      if (cancelled) return
      if (!syncCanvasSize()) {
        rafId = requestAnimationFrame(render)
        return
      }
      const canvas = canvasRef.current
      if (canvas) {
        drawGuide(canvas, pose, guidePoints, time)
      }
      rafId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelled = true
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      const canvas = canvasRef.current
      if (canvas) {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [guidePoints, isActive, pose, videoRef])

  if (!instruction) {
    return null
  }

  return (
    <div className="capture-guidance">
      <canvas ref={canvasRef} className="capture-guidance__canvas" aria-hidden="true" />
    </div>
  )
}

export default CaptureGuidance
