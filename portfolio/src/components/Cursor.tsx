import { useEffect, useRef } from 'react'

/**
 * Custom cursor: a dot that tracks exactly and a ring that trails behind.
 * The ring grows over links/buttons and turns into a labelled disc over
 * anything with a `data-cursor="label"` attribute. Desktop pointers only.
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current
    if (!dot || !ring || !label) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let x = -100, y = -100, rx = -100, ry = -100
    let raf = 0
    let shown = false

    const show = (v: boolean) => {
      dot.style.opacity = v ? '1' : '0'
      ring.style.opacity = v ? '1' : '0'
    }

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      if (!shown) {
        shown = true
        rx = x
        ry = y
        document.documentElement.classList.add('has-cursor')
        show(true)
      }
      const target = e.target instanceof Element ? e.target : null
      const labelled = target?.closest<HTMLElement>('[data-cursor]')
      const text = labelled?.dataset.cursor
      if (text) {
        ring.dataset.state = 'label'
        if (label.textContent !== text) label.textContent = text
      } else if (target?.closest('a, button, [role="button"]')) {
        ring.dataset.state = 'link'
      } else {
        ring.dataset.state = 'idle'
      }
    }
    const onDown = () => { ring.dataset.down = 'true' }
    const onUp = () => { ring.dataset.down = 'false' }
    const onLeave = () => show(false)
    const onEnter = () => { if (shown) show(true) }

    const tick = () => {
      rx += (x - rx) * 0.2
      ry += (y - ry) * 0.2
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)

    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="cursor-ring" data-state="idle" aria-hidden="true">
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
