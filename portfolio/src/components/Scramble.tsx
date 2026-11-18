import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useInView } from 'framer-motion'

const GLYPHS = '<>-_\\/[]{}=+*^?#01◆▲◇'

interface Props {
  text: string
  /** Replays the decode whenever this value changes to something truthy. */
  play?: unknown
  /** Decode once when scrolled into view. */
  onView?: boolean
  /** Delay before the in-view decode starts (ms). */
  delay?: number
  /** Milliseconds per character. */
  speed?: number
  className?: string
  style?: CSSProperties
}

/** Text that decodes itself out of random glyphs. */
export default function Scramble({ text, play, onView, delay = 0, speed = 28, className, style }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [out, setOut] = useState(onView ? ' '.repeat(text.length) : text)
  const raf = useRef(0)

  const run = (wait: number) => {
    cancelAnimationFrame(raf.current)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOut(text)
      return
    }
    const start = performance.now() + wait
    const total = text.length * speed + 260
    const tick = (now: number) => {
      const t = now - start
      if (t < 0) { raf.current = requestAnimationFrame(tick); return }
      let s = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === ' ' || t > i * speed + 260) s += ch
        else if (t > i * speed - 120) s += GLYPHS[(Math.random() * GLYPHS.length) | 0]
        else s += onView && !done.current ? ' ' : ch
      }
      setOut(s)
      if (t < total) raf.current = requestAnimationFrame(tick)
      else { done.current = true; setOut(text) }
    }
    raf.current = requestAnimationFrame(tick)
  }
  const done = useRef(!onView)

  useEffect(() => {
    if (onView && inView) run(delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, onView])

  useEffect(() => {
    if (play) run(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play])

  useEffect(() => {
    if (done.current) setOut(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <span ref={ref} className={className} style={{ whiteSpace: 'pre', ...style }} aria-label={text}>
      <span aria-hidden="true">{out || ' '}</span>
    </span>
  )
}
