import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PROJECTS } from './Work'

type Item = { text: string; color: string }

// The original strip: what I build, and with what
const ACC = 'var(--accent)'
const STACK_A: Item[] = ['Distributed Systems', 'Full Stack', 'Real-Time Streaming', 'GPU Compute'].map(text => ({ text, color: ACC }))
const STACK_B: Item[] = ['Kafka', 'Redis', 'Go', 'TypeScript', 'CUDA', 'PostgreSQL', 'React', 'WebSockets', 'C++', 'Docker'].map(text => ({ text, color: ACC }))

// The project strip: names on top, each one's one-liner underneath, diamonds in the project's colour
const PROJ_A: Item[] = PROJECTS.map(p => ({ text: p.title, color: p.accent }))
const PROJ_B: Item[] = PROJECTS.map(p => ({ text: p.reveal.replace(/\.$/, ''), color: p.accent }))

const ROWS = { stack: [STACK_A, STACK_B], projects: [PROJ_A, PROJ_B] } as const

function Row({ items, outline, reverse }: { items: Item[]; outline?: boolean; reverse?: boolean }) {
  // Repeated an even number of times so the -50% translate loops seamlessly.
  const loop = [...items, ...items, ...items, ...items]
  return (
    <div className={`marquee-track ${reverse ? 'reverse' : ''}`}>
      {loop.map((item, i) => (
        <span key={i} className="flex items-center shrink-0">
          <span
            className={`uppercase ${outline ? 'text-outline' : 'text-white/[0.07]'}`}
            style={{
              fontSize: 'clamp(2.6rem, 8vw, 6.5rem)',
              fontWeight: 200,
              letterSpacing: '0.02em',
              lineHeight: 1.05,
              padding: '0 0.35em',
            }}
          >
            {item.text}
          </span>
          <span style={{ color: item.color, fontSize: '0.7rem', opacity: 0.85 }}>◆</span>
        </span>
      ))}
    </div>
  )
}

/** Two oversized type bands drifting in opposite directions, nudged by scroll. */
export default function Marquee({ variant = 'stack' }: { variant?: keyof typeof ROWS }) {
  const [ROW_A, ROW_B] = ROWS[variant]
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const xA = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])
  const xB = useTransform(scrollYProgress, [0, 1], ['-10%', '0%'])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative w-full overflow-hidden py-16 select-none"
      style={{
        maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
      }}
    >
      <motion.div style={{ x: xA }}><Row items={ROW_A} outline /></motion.div>
      <motion.div style={{ x: xB }} className="mt-2"><Row items={ROW_B} reverse /></motion.div>
    </div>
  )
}
