import { useEffect, useRef } from 'react'

type Props = {
  photo: string | null
  isLoading: boolean
}

const ScanVisualization = ({ photo, isLoading }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!photo) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number | null = null
    let stars: Array<{ x: number; y: number; r: number; a: number; tw: number }> = []

    const rand = (min: number, max: number) => Math.random() * (max - min) + min

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const makeStars = () => {
      const rect = container.getBoundingClientRect()
      const area = rect.width * rect.height
      const count = Math.max(40, Math.floor(area / 4500))
      stars = Array.from({ length: count }, () => ({
        x: rand(0, rect.width),
        y: rand(0, rect.height),
        r: rand(0.5, 1.4),
        a: rand(0.2, 0.9),
        tw: rand(0.003, 0.012),
      }))
    }

    const draw = (time: number) => {
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * star.tw)
        const alpha = star.a * twinkle * 0.65
        ctx.fillStyle = `rgba(114,255,230,${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = window.requestAnimationFrame(draw)
    }

    const handleResize = () => {
      resize()
      makeStars()
    }

    if (!isLoading) {
      resize()
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      return
    }

    handleResize()
    animationFrameId = window.requestAnimationFrame(draw)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [photo, isLoading])

  if (!photo) {
    return null
  }

  return (
    <div className="scan-visual" aria-live="polite">
      <div
        ref={containerRef}
        className="scan-visual__circle"
        style={{ backgroundImage: `url(${photo})` }}
      >
        <div className="scan-visual__glass" aria-hidden="true" />
        <canvas ref={canvasRef} className="scan-visual__canvas" aria-hidden="true" />
        {isLoading && (
          <div className="scan-visual__status">
            <span className="scan-visual__dot" />
          </div>
        )}
      </div>
    </div>
  )
}

export default ScanVisualization
