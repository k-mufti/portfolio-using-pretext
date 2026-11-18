import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import SectionHeader from './SectionHeader'

const EASE = [0.16, 1, 0.3, 1] as const

const CATEGORIES = [
  { num: '01', label: 'Languages',          skills: ['C', 'C++', 'Go', 'TypeScript', 'JavaScript', 'Python', 'SQL', 'F#', 'Swift'] },
  { num: '02', label: 'Frameworks & Tools', skills: ['React', 'Node.js', 'Express.js', 'FastAPI', 'Vue.js', 'AWS'] },
  { num: '03', label: 'Data & Streaming',   skills: ['Redis', 'Kafka', 'Redpanda', 'PostgreSQL', 'MySQL'] },
  { num: '04', label: 'Systems & Infra',    skills: ['Linux', 'Git', 'Docker', 'Elasticsearch', 'OpenSearch'] },
  { num: '05', label: 'GPU & Scientific',   skills: ['CUDA', 'CuPy', 'NumPy'] },
]

const TOTAL = CATEGORIES.reduce((n, c) => n + c.skills.length, 0)

function Row({ cat, index }: { cat: typeof CATEGORIES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.06, ease: EASE }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
        e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
      }}
      className="spot relative grid gap-x-10 gap-y-4 py-8 sm:py-10 md:grid-cols-[14rem_minmax(0,1fr)_3rem] items-baseline cursor-default"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Accent sweep along the top edge */}
      <span
        className="absolute left-0 right-0 h-px origin-left pointer-events-none"
        style={{
          top: -1,
          background: 'linear-gradient(to right, var(--accent), transparent 70%)',
          transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* Index + label */}
      <div className="relative flex items-center gap-4">
        <span
          className="font-mono select-none transition-colors duration-300"
          style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.22)' }}
        >
          {cat.num}
        </span>
        <span
          className="font-mono uppercase transition-all duration-500"
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            color: hovered ? '#fff' : 'rgba(255,255,255,0.45)',
            transform: hovered ? 'translateX(6px)' : 'translateX(0)',
          }}
        >
          {cat.label}
        </span>
      </div>

      {/* Skills */}
      <div className="relative flex flex-wrap gap-x-7 gap-y-2">
        {cat.skills.map((skill, si) => (
          <motion.span
            key={skill}
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.7, delay: 0.15 + index * 0.06 + si * 0.045, ease: EASE }}
            className="group/skill relative inline-block"
          >
            <span
              className="inline-block transition-all duration-300 group-hover/skill:-translate-y-1 group-hover/skill:!text-[color:var(--accent)]"
              style={{
                fontSize: 'clamp(1.05rem, 1.9vw, 1.5rem)',
                fontWeight: 200,
                letterSpacing: '-0.01em',
                color: hovered ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.5)',
                transitionDelay: hovered ? `${si * 25}ms` : '0ms',
              }}
            >
              {skill}
            </span>
            <span
              className="absolute left-0 right-0 -bottom-0.5 h-px origin-left scale-x-0 group-hover/skill:scale-x-100 transition-transform duration-300"
              style={{ background: 'var(--accent)' }}
            />
          </motion.span>
        ))}
      </div>

      {/* Count */}
      <span
        className="relative hidden md:block font-mono text-right transition-colors duration-300"
        style={{
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          fontVariantNumeric: 'tabular-nums',
          color: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
        }}
      >
        ×{String(cat.skills.length).padStart(2, '0')}
      </span>
    </motion.div>
  )
}

export default function Skills() {
  return (
    <div className="relative w-full bg-black pt-16 pb-28 px-5 sm:px-12">
      <SectionHeader
        index="03"
        eyebrow="What I build with"
        title="Stack"
        note={`${TOTAL} tools · ${String(CATEGORIES.length).padStart(2, '0')} layers`}
        className="max-w-6xl mx-auto"
      />

      <div className="max-w-6xl mx-auto">
        {CATEGORIES.map((cat, i) => (
          <Row key={cat.label} cat={cat} index={i} />
        ))}
      </div>
    </div>
  )
}
