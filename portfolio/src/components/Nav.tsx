import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import Scramble from './Scramble'

interface Props { onHome: () => void }

const LINKS = [
  { num: '01', label: 'About', id: 'about' },
  { num: '02', label: 'Work', id: 'work' },
  { num: '03', label: 'Stack', id: 'skills' },
  { num: '04', label: 'Contact', id: 'contact' },
]

function NavLink({ num, label, id, active }: { num: string; label: string; id: string; active: boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <a
      href={`#${id}`}
      onMouseEnter={() => setHover(h => h + 1)}
      className={`relative font-mono uppercase transition-colors duration-300 ${
        id === 'skills' ? 'hidden sm:flex' : 'flex'
      } items-baseline gap-1.5 ${active ? 'text-white' : 'text-white/40 hover:text-white'}`}
      style={{ fontSize: '0.6rem', letterSpacing: '0.2em' }}
    >
      <span
        className="hidden md:inline transition-colors duration-300"
        style={{ fontSize: '0.5rem', color: active ? 'var(--accent)' : 'rgba(255,255,255,0.22)' }}
      >
        {num}
      </span>
      <Scramble text={label} play={hover} speed={22} />
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute left-0 right-0 h-px"
          style={{ bottom: -7, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
    </a>
  )
}

export default function Nav({ onHome }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('about')
  const [homeHover, setHomeHover] = useState(0)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight whichever section is crossing the middle of the viewport
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const { id } of LINKS) {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [])

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-8 py-5 transition-[background,backdrop-filter,border-color] duration-500 border-b ${
        scrolled ? 'bg-black/60 backdrop-blur-xl border-white/[0.06]' : 'border-transparent'
      }`}
    >
      <button
        onClick={onHome}
        onMouseEnter={() => setHomeHover(h => h + 1)}
        className="group flex items-center gap-3 font-mono uppercase text-white/60 hover:text-white transition-colors duration-200"
        style={{ fontSize: '0.65rem', letterSpacing: '0.25em', background: 'none', border: 'none', padding: 0 }}
        aria-label="Kareem Muftee — back to intro"
      >
        <span
          className="block w-1.5 h-1.5 rounded-full transition-transform duration-300 group-hover:scale-150"
          style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}
        />
        <span className="hidden sm:inline"><Scramble text="Kareem Muftee" play={homeHover} speed={18} /></span>
        <span className="sm:hidden">KM</span>
      </button>

      <div className="flex items-center gap-5 sm:gap-8">
        {LINKS.map(link => (
          <NavLink key={link.id} {...link} active={active === link.id} />
        ))}
        <a
          href="/Kareem-Muftee-Resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono uppercase text-white/70 hover:text-black hover:bg-white border border-white/25 hover:border-white rounded-full px-3 py-1.5 transition-all duration-300"
          style={{ fontSize: '0.56rem', letterSpacing: '0.2em' }}
        >
          Resume ↗
        </a>
      </div>

      {/* Scroll progress */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 h-px origin-left"
        style={{
          scaleX: progress,
          background: 'linear-gradient(to right, transparent, var(--accent) 30%, #fff)',
        }}
      />
    </motion.nav>
  )
}
