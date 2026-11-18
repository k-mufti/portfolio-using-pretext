import { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import SectionHeader from './SectionHeader'
import Scramble from './Scramble'

const EASE = [0.16, 1, 0.3, 1] as const

export const PROJECTS: {
  num: string; title: string; year: string; desc: string; reveal: string
  tags: string[]; url: string; live?: string; image: string; accent: string
}[] = [
  {
    num: '01',
    title: 'VITALIS',
    year: '2026',
    desc: 'Health monitoring software for astronauts on long missions, built in one weekend for NASA Space Apps 2026. It gathers 30 health readings from 8 sources (wearables, the med bay kit and the ship\'s own sensors) onto a 3D body you can peel layer by layer. Every reading is checked against medical ranges, NASA limits and the astronaut\'s own preflight baseline, then cross-checked with live NOAA and NASA space-weather data. When something goes wrong, Vitaly, the built-in AI, talks the crew through each step out loud while the readings go to Earth with a real comms-delay countdown.',
    reveal: 'THERE IS NO DOCTOR ON MARS.',
    tags: ['Three.js', 'Python', 'WebSockets', 'NASA APIs', 'AI'],
    url: 'https://github.com/k-mufti/VITALIS',
    live: 'https://kareemmuftee.com/vitalis/',
    image: '/projects/vitalis.jpg',
    accent: 'hsl(212,100%,58%)',
  },
  {
    num: '02',
    title: 'Nuevo RSS',
    year: '2026',
    desc: 'A Bloomberg-terminal-style live news dashboard. A Go service polls about 66 RSS and Atom feeds plus 20 news sitemaps, follows each feed\'s cache headers, and takes WebSub pushes. Headlines are classified, then clustered into stories by IDF-weighted word overlap; when four outlets cover the same story within 90 minutes it gets flagged BREAKING. Every change streams to a SolidJS front end over Server-Sent Events, next to a live market strip.',
    reveal: 'IT NEVER MISSES A HEADLINE.',
    tags: ['Go', 'SolidJS', 'SSE', 'SQLite', 'RSS'],
    url: 'https://github.com/k-mufti/nuevo-terminal',
    live: 'https://nevarmiss.com',
    image: '/projects/nuevo.jpg',
    accent: 'hsl(45,95%,55%)',
  },
  {
    num: '03',
    title: 'kmufti.com',
    year: '2026',
    desc: 'My personal corner of the internet: a hub of small real-time web apps, hand-written in HTML, CSS and vanilla JS with no build step. A shared jigsaw everyone solves at once, an r/place-style pixel wall, 1v1 Yahtzee with server-rolled dice, multi-team Jeopardy with 600 real episodes, and more. A handful of zero-dependency Node backends talk WebSockets and Server-Sent Events behind an NGINX proxy on my own VPS. About 5,000 people have used it.',
    reveal: '5,000 USERS.',
    tags: ['JavaScript', 'Node.js', 'WebSockets', 'SSE', 'NGINX'],
    url: 'https://github.com/k-mufti/kmufti',
    live: 'https://kmufti.com',
    image: '/projects/kmufti.jpg',
    accent: 'hsl(305,78%,66%)',
  },
  {
    num: '04',
    title: 'Meteor Impact Simulator',
    year: '2025',
    desc: 'Asteroid impact simulator for NASA Space Apps 2025, built with a team of four. The physics engine uses published models for crater size, blast radius and tsunami effects, and the heavy math runs on the GPU with CUDA via CuPy so it updates in real time instead of taking forever. Real asteroid data from the NASA NEO API, terrain from USGS and ocean depth from GEBCO, rendered live in Three.js and checked against real impacts like Tunguska and Chelyabinsk. Drop a rock anywhere on Earth and watch the numbers.',
    reveal: 'WHAT IF EXTINCTION WAS INTERACTIVE.',
    tags: ['CUDA', 'Python', 'FastAPI', 'Three.js', 'CuPy'],
    url: 'https://github.com/k-mufti/meteor-simulator-cuda',
    image: '/projects/meteor-madness.jpg',
    accent: 'hsl(245,78%,68%)',
  },
  {
    num: '05',
    title: 'Scripta',
    year: '2026',
    desc: 'A platform for remote film and theatre table reads, no scheduling required. Screenwriters upload a script, actors record their lines remotely on their own time, and the Web Audio API stitches every take into one read. It\'s all served through a React Three Fiber typewriter UI that puts you on a stage, with token-based Supabase sessions keeping each production isolated. Built for real collaborators who can\'t be in the same room.',
    reveal: 'TABLE READS. NO TABLE.',
    tags: ['React', 'TypeScript', 'Three.js', 'Supabase', 'Web Audio'],
    url: 'https://github.com/k-mufti/Scripta',
    image: '/projects/scripta.jpg',
    accent: 'hsl(36,80%,58%)',
  },
]

type Project = typeof PROJECTS[0]

const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

/**
 * Description whose words lift and tint toward the cursor.
 * Clicking scatters the words and hands over to the one-line reveal.
 */
function TingleDescription({
  words, accent, hidden, onReveal,
}: {
  words: string[]; accent: string; hidden: boolean; onReveal: () => void
}) {
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const busyRef = useRef(false)
  const rafRef = useRef(0)
  const activeRef = useRef(false)

  const tick = () => {
    if (busyRef.current) { activeRef.current = false; return }
    const mx = mouseRef.current.x
    const my = mouseRef.current.y
    let moving = false
    wordRefs.current.forEach(el => {
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2)
      const nearness = Math.max(0, 1 - dist / 160)
      if (nearness > 0) moving = true
      el.style.transform = nearness > 0 ? `translateY(${-nearness * 7}px)` : ''
      el.style.color = nearness > 0
        ? `color-mix(in srgb, ${accent} ${Math.round(nearness * 100)}%, rgba(255,255,255,0.5))`
        : ''
    })
    // Keep running only while the cursor is actually over the text
    if (moving || mx > -9000) rafRef.current = requestAnimationFrame(tick)
    else activeRef.current = false
  }

  const wake = () => {
    if (activeRef.current) return
    activeRef.current = true
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Coming back from the reveal: words fall back into place
  useEffect(() => {
    if (hidden) return
    busyRef.current = false
    wordRefs.current.forEach((el, i) => {
      if (!el) return
      el.style.transition = `opacity 0.5s ease ${i * 6}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 6}ms`
      el.style.opacity = '1'
      el.style.transform = ''
      el.style.color = ''
    })
    const id = setTimeout(() => {
      wordRefs.current.forEach(el => { if (el) el.style.transition = '' })
    }, 1200)
    return () => clearTimeout(id)
  }, [hidden])

  const handleClick = () => {
    if (busyRef.current) return
    busyRef.current = true
    cancelAnimationFrame(rafRef.current)
    wordRefs.current.forEach(el => {
      if (!el) return
      const dx = (Math.random() - 0.5) * 90
      const dy = (Math.random() - 0.5) * 60
      const rot = (Math.random() - 0.5) * 50
      el.style.transition = 'opacity 0.32s ease, transform 0.36s cubic-bezier(0.5,0,0.9,0.5)'
      el.style.opacity = '0'
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.8)`
    })
    setTimeout(onReveal, 330)
  }

  return (
    <div
      className="leading-relaxed"
      data-cursor="decode"
      style={{
        fontSize: '0.92rem',
        fontWeight: 300,
        visibility: hidden ? 'hidden' : 'visible',
      }}
      onMouseMove={e => { mouseRef.current = { x: e.clientX, y: e.clientY }; wake() }}
      onMouseLeave={() => { mouseRef.current = { x: -9999, y: -9999 } }}
      onClick={handleClick}
    >
      {words.map((w, i) => (
        <span
          key={i}
          ref={el => { wordRefs.current[i] = el }}
          className="inline-block mr-[0.32em]"
          style={{ color: 'rgba(255,255,255,0.5)', willChange: 'transform' }}
        >
          {w}
        </span>
      ))}
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
      className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
      <path d="M2 8L8 2M8 2H3M8 2v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Preview({ project, hovered, onOpen }: { project: Project; hovered: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-cursor="view"
      aria-label={`View ${project.title} screenshot`}
      className="relative block w-full overflow-hidden"
      style={{
        aspectRatio: '16/10',
        borderRadius: '14px',
        padding: 0,
        border: `1px solid ${hovered ? alpha(project.accent, 55) : 'rgba(255,255,255,0.08)'}`,
        background: '#080808',
        boxShadow: hovered
          ? `0 40px 90px -20px rgba(0,0,0,0.9), 0 0 70px -18px ${alpha(project.accent, 55)}`
          : '0 24px 60px rgba(0,0,0,0.6)',
        // Tilt toward the cursor; --rx / --ry are set by the row
        transform: hovered
          ? 'perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(1.03)'
          : 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)',
        transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.5s ease, border-color 0.5s ease',
      }}
    >
      <img
        src={project.image}
        alt={project.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: hovered ? 'grayscale(0) brightness(1)' : 'grayscale(1) brightness(0.55)',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
          transition: 'filter 0.6s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <span className="absolute inset-0 scanlines pointer-events-none" style={{ opacity: hovered ? 0.35 : 1, transition: 'opacity 0.5s' }} />
      <span className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
      <span className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 40%)' }} />
      <span
        className="absolute left-3 bottom-3 font-mono uppercase pointer-events-none"
        style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: hovered ? project.accent : 'rgba(255,255,255,0.4)', transition: 'color 0.4s' }}
      >
        fig. {project.num}
      </span>
    </button>
  )
}

function ProjectRow({
  project, index, revealed, onToggleReveal, onImageClick,
}: {
  project: Project; index: number
  revealed: boolean; onToggleReveal: () => void
  onImageClick: (project: Project) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(rowRef, { once: true, margin: '-60px' })
  const [hovered, setHovered] = useState(false)
  const [ghHover, setGhHover] = useState(0)
  const [liveHover, setLiveHover] = useState(0)

  const onMove = (e: React.MouseEvent) => {
    const el = rowRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    el.style.setProperty('--ry', `${(px - 0.5) * 14}deg`)
    el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`)
  }

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.08, ease: EASE }}
      className="spot relative py-12 sm:py-16"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={onMove}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', ['--spot-color' as string]: project.accent }}
    >
      {/* Accent line that draws across the top of the row on hover */}
      <span
        className="absolute left-0 right-0 h-px origin-left pointer-events-none"
        style={{
          top: -1,
          background: `linear-gradient(to right, ${project.accent}, ${alpha(project.accent, 0)})`,
          transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      <div className="relative grid gap-x-10 gap-y-8 lg:grid-cols-[3.5rem_minmax(0,1fr)_340px] grid-cols-[2.2rem_minmax(0,1fr)] items-start">
        {/* Index */}
        <span
          className="font-mono mt-2 transition-colors duration-500"
          style={{ fontSize: '0.62rem', letterSpacing: '0.15em', color: hovered ? project.accent : 'rgba(255,255,255,0.22)' }}
        >
          {project.num}
          <span
            className="block w-px mt-3 origin-top"
            style={{
              height: 44,
              background: project.accent,
              transform: hovered ? 'scaleY(1)' : 'scaleY(0)',
              transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </span>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h3
              className="text-white"
              style={{
                fontSize: 'clamp(1.5rem, 3.4vw, 2.5rem)',
                fontWeight: 200,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                opacity: hovered ? 1 : 0.6,
                transform: hovered ? 'translateX(10px)' : 'translateX(0)',
                transition: 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {project.title}
            </h3>
            <span className="font-mono text-white/30 shrink-0"
              style={{ fontSize: '0.6rem', letterSpacing: '0.14em' }}>
              {project.year}
            </span>
          </div>

          {/* Mobile / tablet preview sits inline */}
          <div className="lg:hidden mb-6">
            <Preview project={project} hovered onOpen={() => onImageClick(project)} />
          </div>

          {/* Tingle description / reveal — the words stay in flow so the height never jumps */}
          <div className="relative">
            <TingleDescription
              words={project.desc.split(' ')}
              accent={project.accent}
              hidden={revealed}
              onReveal={onToggleReveal}
            />
            <AnimatePresence>
              {revealed && (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  onClick={onToggleReveal}
                  data-cursor="restore"
                  className="absolute inset-0 flex items-center"
                >
                  <p
                    className="font-mono leading-tight"
                    style={{
                      fontSize: 'clamp(1.05rem, 2.6vw, 1.7rem)',
                      letterSpacing: '0.14em',
                      fontStyle: 'italic',
                      color: project.accent,
                      textShadow: `0 0 30px ${alpha(project.accent, 45)}`,
                      whiteSpace: 'normal',
                    }}
                  >
                    <Scramble text={project.reveal} play={revealed} speed={26} style={{ whiteSpace: 'pre-wrap' }} />
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p
            className="font-mono uppercase mt-4 transition-opacity duration-500"
            style={{ fontSize: '0.5rem', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', opacity: hovered ? 1 : 0.35 }}
          >
            <span style={{ color: project.accent }}>▸</span> {revealed ? 'click to restore' : 'click the text'}
          </p>

          <div className="flex items-center justify-between gap-4 flex-wrap mt-7">
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, ti) => (
                <span key={tag} className="font-mono px-2.5 py-1 rounded-full"
                  style={{
                    fontSize: '0.56rem', letterSpacing: '0.1em',
                    border: `1px solid ${hovered ? alpha(project.accent, 40) : 'rgba(255,255,255,0.1)'}`,
                    color: hovered ? project.accent : 'rgba(255,255,255,0.32)',
                    background: hovered ? alpha(project.accent, 6) : 'transparent',
                    transition: `all 0.5s ease ${ti * 40}ms`,
                  }}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {project.live && (
                <a href={project.live} target="_blank" rel="noopener noreferrer"
                  onMouseEnter={() => setLiveHover(h => h + 1)}
                  className="group font-mono uppercase flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-all duration-300"
                  style={{
                    fontSize: '0.58rem', letterSpacing: '0.18em',
                    color: hovered ? '#000' : project.accent,
                    background: hovered ? project.accent : 'transparent',
                    border: `1px solid ${alpha(project.accent, hovered ? 100 : 45)}`,
                  }}>
                  <span className="block w-1.5 h-1.5 rounded-full"
                    style={{ background: hovered ? '#000' : project.accent, boxShadow: hovered ? 'none' : `0 0 8px ${project.accent}` }} />
                  <Scramble text="Live" play={liveHover} speed={30} />
                  <ArrowIcon />
                </a>
              )}
              <a href={project.url} target="_blank" rel="noopener noreferrer"
                onMouseEnter={() => setGhHover(h => h + 1)}
                className="group font-mono uppercase text-white/45 hover:text-white transition-colors duration-200 flex items-center gap-2 px-2 py-1.5"
                style={{ fontSize: '0.58rem', letterSpacing: '0.18em' }}>
                <Scramble text="GitHub" play={ghHover} speed={24} />
                <ArrowIcon />
              </a>
            </div>
          </div>
        </div>

        {/* Desktop preview — dim and grayscale until the row wakes up */}
        <div className="hidden lg:block self-center">
          <Preview project={project} hovered={hovered} onOpen={() => onImageClick(project)} />
        </div>
      </div>
    </motion.div>
  )
}

function Lightbox({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-5"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
      data-cursor="close"
      onClick={onClose}
    >
      <motion.img
        src={project.image}
        alt={project.title}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="max-w-[90vw] max-h-[78vh] object-contain"
        style={{
          borderRadius: '12px',
          border: `1px solid ${alpha(project.accent, 40)}`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.85), 0 0 120px -30px ${alpha(project.accent, 50)}`,
        }}
      />
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-4 font-mono uppercase"
        style={{ fontSize: '0.58rem', letterSpacing: '0.2em' }}
      >
        <span style={{ color: project.accent }}>{project.num}</span>
        <span className="text-white/70">{project.title}</span>
        <span className="text-white/25">esc to close</span>
      </motion.div>
    </motion.div>
  )
}

export default function Work() {
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<Project | null>(null)

  return (
    <div className="relative w-full bg-black px-5 sm:px-12 pt-28 pb-20">
      <SectionHeader
        index="02"
        eyebrow="Selected Work"
        title="Projects"
        note={`${String(PROJECTS.length).padStart(2, '0')} builds · 2025 — 2026`}
        className="max-w-6xl mx-auto"
      />

      <div className="max-w-6xl mx-auto">
        {PROJECTS.map((proj, i) => (
          <ProjectRow
            key={proj.title}
            project={proj}
            index={i}
            revealed={revealedIdx === i}
            onToggleReveal={() => setRevealedIdx(revealedIdx === i ? null : i)}
            onImageClick={setLightbox}
          />
        ))}
      </div>

      <AnimatePresence>
        {lightbox && <Lightbox key="lightbox" project={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </div>
  )
}
