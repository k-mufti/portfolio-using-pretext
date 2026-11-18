export interface Size { w: number; h: number }

interface LoopOptions {
  /** Called whenever the canvas is (re)sized, in CSS pixels. */
  onResize?: (size: Size) => void
  /** Called every frame while the canvas is on screen. Coordinates are CSS pixels. */
  draw: (ctx: CanvasRenderingContext2D, size: Size, now: number) => void
  maxDpr?: number
}

/**
 * Retina-crisp canvas render loop that only runs while the canvas is
 * actually visible (on screen + tab focused). Returns a cleanup function.
 */
export function canvasLoop(canvas: HTMLCanvasElement, opts: LoopOptions): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const size: Size = { w: 0, h: 0 }
  let raf = 0
  let running = false
  let onScreen = true

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr ?? 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    size.w = w
    size.h = h
    opts.onResize?.(size)
  }

  const frame = (now: number) => {
    if (!running) return
    if (size.w && size.h) opts.draw(ctx, size, now)
    raf = requestAnimationFrame(frame)
  }
  const start = () => {
    if (running || !onScreen || document.hidden) return
    running = true
    raf = requestAnimationFrame(frame)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting
    if (onScreen) start()
    else stop()
  })
  io.observe(canvas)
  const onVisibility = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibility)

  resize()
  start()

  return () => {
    stop()
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

export const MONO = `'JetBrains Mono', monospace`
