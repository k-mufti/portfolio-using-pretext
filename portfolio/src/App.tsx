import { useState, useEffect } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import Nav from './components/Nav'
import Hero, { SPHERE_TOP_PCT } from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import Work from './components/Work'
import Contact from './components/Contact'
import Marquee from './components/Marquee'
import Cursor from './components/Cursor'

type OverlayPhase = 'hidden' | 'expanding' | 'fading'

export default function App() {
  const [siteVisible, setSiteVisible] = useState(false)
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>('hidden')
  const [goingHome, setGoingHome] = useState(false)

  const goHome = () => setGoingHome(true)

  const handleHomeFaded = () => {
    setSiteVisible(false)
    setGoingHome(false)
    window.scrollTo(0, 0)
  }

  // Lock body scroll until the site is revealed
  useEffect(() => {
    const locked = !siteVisible
    document.body.style.overflow = locked ? 'hidden' : ''
    document.documentElement.style.overflow = locked ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [siteVisible])

  // Let the sphere's burst play before the black disc wipes over it
  const handleEnter = () => { window.setTimeout(() => setOverlayPhase('expanding'), 520) }

  const handleExpanded = () => {
    setSiteVisible(true)
    setOverlayPhase('fading')
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="bg-black text-white">
        {/* ── Phase 1: Hero only (no scroll) ── */}
        {!siteVisible && <Hero onEnter={handleEnter} />}

        {/* ── Phase 2: Full scrollable site ── */}
        {siteVisible && (
          <>
            <Nav onHome={goHome} />
            <section id="about"><About /></section>
            <Marquee variant="projects" />
            <section id="work"><Work /></section>
            <Marquee variant="stack" />
            <section id="skills"><Skills /></section>
            <section id="contact"><Contact /></section>
          </>
        )}

        {/* ── Global transition overlay ── */}
        <AnimatePresence>
          {overlayPhase === 'expanding' && (
            <motion.div
              key="circle-expand"
              className="pointer-events-none"
              style={{
                position: 'fixed',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#000',
                top: `${SPHERE_TOP_PCT}vh`,
                left: '50vw',
                x: '-50%',
                y: '-50%',
                zIndex: 9999,
              }}
              initial={{ scale: 1 }}
              animate={{ scale: 280 }}
              transition={{ duration: 0.78, ease: [0.5, 0, 0.9, 0.6] }}
              onAnimationComplete={handleExpanded}
            />
          )}
          {overlayPhase === 'expanding' && (
            // Bright rim that rides the edge of the expanding black disc
            <motion.div
              key="circle-rim"
              className="pointer-events-none"
              style={{
                position: 'fixed',
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.85)',
                boxShadow: '0 0 40px 4px rgba(255,255,255,0.25), inset 0 0 40px 4px rgba(255,255,255,0.12)',
                top: `${SPHERE_TOP_PCT}vh`,
                left: '50vw',
                x: '-50%',
                y: '-50%',
                zIndex: 10000,
              }}
              initial={{ width: 20, height: 20, opacity: 1 }}
              animate={{ width: 5600, height: 5600, opacity: 0.4 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.78, ease: [0.5, 0, 0.9, 0.6] }}
            />
          )}

          {overlayPhase === 'fading' && (
            <motion.div
              key="black-fade"
              className="pointer-events-none"
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999 }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              onAnimationComplete={() => setOverlayPhase('hidden')}
            />
          )}
          {goingHome && (
            <motion.div
              key="home-fade"
              className="pointer-events-none"
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, ease: 'easeIn' }}
              onAnimationComplete={handleHomeFaded}
            />
          )}
        </AnimatePresence>

        <div className="grain" aria-hidden="true" />
        <Cursor />
      </main>
    </MotionConfig>
  )
}
