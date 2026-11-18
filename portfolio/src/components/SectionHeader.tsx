import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Scramble from './Scramble'

const EASE = [0.16, 1, 0.3, 1] as const

/** Numbered eyebrow + oversized thin title whose letters rise out of a mask. */
export default function SectionHeader({
  index, eyebrow, title, note, className = '',
}: { index: string; eyebrow: string; title: string; note?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <div ref={ref} className={className}>
      <div className="flex items-center gap-4 mb-5">
        <span className="eyebrow text-white/30">{index}</span>
        <motion.span
          className="h-px w-10 origin-left"
          style={{ background: 'var(--accent)' }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, ease: EASE }}
        />
        <Scramble text={eyebrow} onView className="eyebrow" style={{ color: 'var(--accent)' }} />
      </div>

      <div className="flex items-end justify-between gap-6">
        <h2
          className="text-white overflow-hidden"
          style={{
            fontSize: 'clamp(3rem, 10vw, 7.5rem)',
            fontWeight: 100,
            letterSpacing: '-0.035em',
            lineHeight: 0.95,
            paddingBottom: '0.12em',
          }}
          aria-label={title}
        >
          {title.split('').map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="inline-block"
              initial={{ y: '110%', opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.9, delay: 0.08 + i * 0.035, ease: EASE }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h2>
        {note && (
          <motion.p
            className="eyebrow text-white/30 text-right hidden sm:block pb-4 shrink-0"
            style={{ fontSize: '0.58rem', letterSpacing: '0.2em' }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {note}
          </motion.p>
        )}
      </div>

      <motion.div
        className="h-px w-full origin-left mt-8"
        style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.28), rgba(255,255,255,0.06))' }}
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
      />
    </div>
  )
}
