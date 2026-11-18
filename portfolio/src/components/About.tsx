import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useSpring } from 'framer-motion'
import { canvasLoop, MONO } from '../lib/canvas'
import Scramble from './Scramble'

const BG_WORD = 'BUILD '
const CHAR_W = 58
const CHAR_H = 36
const MOUSE_INF_R = 170 // radius within which the cursor pushes chars
const EASE = [0.16, 1, 0.3, 1] as const

interface Particle { x: number; y: number; bx: number; by: number; ch: string }
/** Shockwave sent through the grid on click. */
interface Ripple { x: number; y: number; age: number }

const PARAGRAPHS = [
  <>I build things then watch them break.</>,
  <>
    I'm a CS student at UIC graduating May&nbsp;2027, with a habit of
    building things most students haven't heard of yet.
  </>,
  <>
    I specialize in <em className="not-italic text-white">distributed systems</em>,{' '}
    <em className="not-italic text-white">Full Stack Development</em>, and
    learning new things everyday.
  </>,
]

export default function About() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const ripplesRef = useRef<Ripple[]>([])
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [scrolled, setScrolled] = useState(false)

  const tiltX = useSpring(0, { stiffness: 120, damping: 18 })
  const tiltY = useSpring(0, { stiffness: 120, damping: 18 })

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    let particles: Particle[] = []

    const stop = canvasLoop(canvas, {
      onResize: ({ w, h }) => {
        const cols = Math.ceil(w / CHAR_W) + 2
        const rows = Math.ceil(h / CHAR_H) + 2
        particles = []
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = c * CHAR_W - CHAR_W / 2
            const by = r * CHAR_H - CHAR_H / 2
            const ch = BG_WORD[(c + r * (cols + 1)) % BG_WORD.length]
            particles.push({ x: bx, y: by, bx, by, ch })
          }
        }
      },
      draw: (ctx, { w, h }, now) => {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, w, h)

        const mx = mouseRef.current.x
        const my = mouseRef.current.y
        const ripples = ripplesRef.current
        for (const rp of ripples) rp.age += 1
        while (ripples.length && ripples[0].age > 140) ripples.shift()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `11px ${MONO}`
        ctx.fillStyle = '#ffffff'

        // Chars near the cursor are drawn in a second, brighter pass
        const hot: { p: Particle; n: number }[] = []

        for (const p of particles) {
          if (p.ch === ' ') continue

          // The cursor is an obstacle — push chars away from it
          const dx = p.x - mx
          const dy = p.y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MOUSE_INF_R && dist > 0.5) {
            const push = Math.pow((MOUSE_INF_R - dist) / MOUSE_INF_R, 1.5) * 26
            p.x += (dx / dist) * push * 0.3
            p.y += (dy / dist) * push * 0.3
          }

          // Click shockwaves: a ring that shoves chars outward as it passes
          let shock = 0
          for (const rp of ripples) {
            const rx = p.bx - rp.x
            const ry = p.by - rp.y
            const rd = Math.sqrt(rx * rx + ry * ry) || 1
            const front = rp.age * 9
            const band = 1 - Math.abs(rd - front) / 70
            if (band > 0) {
              const life = 1 - rp.age / 140
              const force = band * life
              p.x += (rx / rd) * force * 4.5
              p.y += (ry / rd) * force * 4.5
              shock = Math.max(shock, force)
            }
          }

          // Spring back to the grid
          p.x += (p.bx - p.x) * 0.06
          p.y += (p.by - p.y) * 0.06

          // Slow diagonal swell of brightness through the whole field
          const wave = 0.5 + 0.5 * Math.sin(p.bx * 0.006 + p.by * 0.011 - now * 0.0009)
          const nearness = Math.max(Math.max(0, 1 - dist / MOUSE_INF_R), shock)

          if (nearness > 0.02) {
            hot.push({ p, n: nearness })
          } else {
            ctx.globalAlpha = 0.07 + wave * 0.13
            ctx.fillText(p.ch, p.x, p.y)
          }
        }

        for (const { p, n } of hot) {
          const wave = 0.5 + 0.5 * Math.sin(p.bx * 0.006 + p.by * 0.011 - now * 0.0009)
          ctx.globalAlpha = Math.min(1, 0.07 + wave * 0.13 + n * 0.85)
          // white → accent the closer it gets
          const rr = Math.round(255 - n * 194)
          const gg = Math.round(255 - n * 59)
          const bb = Math.round(255 - n * 10)
          ctx.fillStyle = `rgb(${rr},${gg},${bb})`
          ctx.font = `${Math.round(11 + n * 7)}px ${MONO}`
          ctx.fillText(p.ch, p.x, p.y)
        }
        ctx.globalAlpha = 1
      },
    })

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('a, button')) return
      const rect = canvas.getBoundingClientRect()
      ripplesRef.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, age: 0 })
      if (ripplesRef.current.length > 5) ripplesRef.current.shift()
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    section.addEventListener('mouseleave', onLeave)
    section.addEventListener('click', onClick)

    return () => {
      stop()
      window.removeEventListener('mousemove', onMove)
      section.removeEventListener('mouseleave', onLeave)
      section.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onCardMove = (e: React.MouseEvent) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    tiltY.set((px - 0.5) * 5)
    tiltX.set((0.5 - py) * 5)
  }
  const onCardLeave = () => { tiltX.set(0); tiltY.set(0) }

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {},
    transition: { duration: 0.9, delay, ease: EASE },
  })

  return (
    <div
      ref={sectionRef}
      className="relative w-full min-h-screen bg-black flex items-center justify-center overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Blend the field into the sections above and below */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, #000 0%, transparent 16%, transparent 78%, #000 100%), radial-gradient(ellipse 55% 55% at 50% 50%, rgba(0,0,0,0.55), transparent 80%)',
        }}
      />

      {/* Section marker */}
      <div className="absolute top-24 left-5 sm:left-8 hidden sm:flex items-center gap-4 pointer-events-none">
        <span className="eyebrow text-white/30">01</span>
        <span className="h-px w-10" style={{ background: 'var(--accent)' }} />
        <Scramble text="About" onView className="eyebrow" style={{ color: 'var(--accent)' }} />
      </div>
      <p
        className="absolute top-24 right-5 sm:right-8 eyebrow text-white/25 hidden sm:block pointer-events-none"
        style={{ fontSize: '0.55rem', letterSpacing: '0.22em' }}
      >
        click the field
      </p>

      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.97 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 1.1, ease: EASE }}
        className="relative z-10 w-full max-w-xl mx-auto px-5 sm:px-8 py-28"
        style={{ perspective: 1200 }}
      >
        <motion.div
          ref={cardRef}
          onMouseMove={onCardMove}
          onMouseLeave={onCardLeave}
          className="spot spot-border relative rounded-2xl px-7 sm:px-12 py-10 sm:py-12"
          style={{
            rotateX: tiltX,
            rotateY: tiltY,
            transformStyle: 'preserve-3d',
            background: 'linear-gradient(160deg, rgba(18,18,18,0.86), rgba(6,6,6,0.9))',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 50px 120px -30px rgba(0,0,0,0.95), 0 0 80px -30px rgba(61,196,245,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Corner ticks */}
          {(['top-3 left-3 border-t border-l', 'top-3 right-3 border-t border-r', 'bottom-3 left-3 border-b border-l', 'bottom-3 right-3 border-b border-r'] as const).map(c => (
            <span key={c} className={`absolute w-2.5 h-2.5 border-white/25 pointer-events-none ${c}`} />
          ))}

          {/* Header row: UIC badge + class */}
          <motion.div {...reveal(0.15)} className="mb-10 flex items-center justify-between">
            <svg width="34" height="34" viewBox="0 0 100 100" fill="none" aria-label="UIC">
              <circle cx="50" cy="50" r="50" fill="white" />
              <text
                x="50" y="50"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#0a0a0a"
                fontSize="36"
                fontWeight="800"
                fontFamily="Arial, sans-serif"
                letterSpacing="2"
              >UIC</text>
            </svg>
            <div className="font-mono uppercase text-right text-white/35" style={{ fontSize: '0.55rem', letterSpacing: '0.22em', lineHeight: 1.9 }}>
              <div>Computer Science</div>
              <div><span style={{ color: 'var(--accent)' }}>●</span> Class of May 2027</div>
            </div>
          </motion.div>

          {/* Opener */}
          <h2
            className="text-white mb-8 leading-tight"
            style={{ fontSize: 'clamp(2rem, 5.5vw, 3.1rem)', fontWeight: 200, letterSpacing: '-0.025em' }}
            aria-label="Hey, I'm Kareem."
          >
            {['Hey,', "I'm", 'Kareem.'].map((word, i) => (
              <span key={word} className="inline-block overflow-hidden align-bottom mr-[0.25em]" aria-hidden="true">
                <motion.span
                  className="inline-block"
                  initial={{ y: '105%' }}
                  animate={isInView ? { y: 0 } : {}}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.1, ease: EASE }}
                >
                  {word === 'Kareem.' ? <>Kareem<span style={{ color: 'var(--accent)' }}>.</span></> : word}
                </motion.span>
              </span>
            ))}
          </h2>

          {/* Letter paragraphs */}
          <div className="flex flex-col gap-5" style={{ color: 'rgba(255,255,255,0.62)', lineHeight: '1.75', fontWeight: 300 }}>
            {PARAGRAPHS.map((para, i) => (
              <motion.p key={i} {...reveal(0.55 + i * 0.12)}>{para}</motion.p>
            ))}
            <motion.p {...reveal(0.95)}>
              <a
                href="#contact"
                className="group inline-flex items-center gap-2 text-white/45 hover:text-white transition-colors duration-300"
              >
                Let's talk.
                <span
                  className="inline-block transition-transform duration-300 group-hover:translate-x-1.5"
                  style={{ color: 'var(--accent)' }}
                >→</span>
              </a>
            </motion.p>
          </div>

          {/* Footer: name + signature */}
          <motion.div
            {...reveal(1.1)}
            className="mt-12 pt-6 flex items-end justify-between gap-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-white/80 text-sm" style={{ fontWeight: 300 }}>Kareem Muftee</span>
              <a
                href="https://github.com/k-mufti"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-white/35 hover:text-[color:var(--accent)] transition-colors duration-200"
                style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}
              >
                @k-mufti ↗
              </a>
            </div>

            {/* Signature — wipes in like it's being signed */}
            <motion.img
              src="/Muftee-signature.svg"
              alt="Kareem Muftee signature"
              style={{ height: '52px' }}
              initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0.85 }}
              animate={isInView ? { clipPath: 'inset(0 0% 0 0)' } : {}}
              transition={{ duration: 1.6, delay: 1.4, ease: [0.65, 0, 0.35, 1] }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll cue — fixed at bottom, hides on scroll */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 transition-opacity duration-500"
        style={{ opacity: scrolled ? 0 : 1, pointerEvents: 'none' }}
      >
        <span className="font-mono uppercase text-white/85" style={{ fontSize: '0.85rem', letterSpacing: '0.35em', paddingLeft: '0.35em' }}>
          scroll
        </span>
        <span className="relative block w-0.5 h-14 overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)' }}>
          <span
            className="absolute left-0 top-0 w-0.5 h-5"
            style={{ background: 'var(--accent)', animation: 'scroll-cue 1.6s cubic-bezier(0.65,0,0.35,1) infinite' }}
          />
        </span>
      </div>
    </div>
  )
}
