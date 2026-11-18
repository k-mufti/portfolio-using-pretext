import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { canvasLoop, MONO } from '../lib/canvas'
import Scramble from './Scramble'
import HeatName from './HeatName'

const SPHERE_SKILLS = [
  'React', 'TypeScript', 'Go', 'Python', 'Kafka',
  'C', 'Redis', 'C++', 'PostgreSQL', 'Docker',
  'Node.js', 'Supabase', 'WebSockets', 'Linux', 'SQL',
  'Three.js', 'Vite', 'Tailwind', 'Azure', 'AWS', 'gRPC',
]

/** Vertical centre of the sphere, as a % of the viewport. Shared with the App transition. */
export const SPHERE_TOP_PCT = 60

// Globe highlight colour (packets, hovered node, glow). Was the cyan '61,196,245'.
const ACCENT = '255,255,255'
const NAME = 'KAREEM MUFTEE'
// Experiment: the kmufti.com thermal word, in greyscale. false = the old thin name.
const HEAT_NAME = true

type Vec3 = [number, number, number]

function fibSphere(n: number): Vec3[] {
  const pts: Vec3[] = []
  const phi = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < n; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / n)
    const lam = (2 * Math.PI * i) / phi
    pts.push([
      Math.sin(theta) * Math.cos(lam),
      Math.sin(theta) * Math.sin(lam),
      Math.cos(theta),
    ])
  }
  return pts
}

function buildEdges(p: Vec3[], K = 6): [number, number][] {
  const result: [number, number][] = []
  const seen = new Set<string>()
  for (let i = 0; i < p.length; i++) {
    const dists: { j: number; d: number }[] = []
    for (let j = 0; j < p.length; j++) {
      if (j === i) continue
      const dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], dz = p[i][2] - p[j][2]
      dists.push({ j, d: dx * dx + dy * dy + dz * dz })
    }
    dists.sort((a, b) => a.d - b.d)
    for (let k = 0; k < K; k++) {
      const j = dists[k].j
      const key = i < j ? `${i},${j}` : `${j},${i}`
      if (!seen.has(key)) { seen.add(key); result.push([i, j]) }
    }
  }
  return result
}

function buildSkillMap(count: number): string[] {
  const map = Array.from({ length: count }, (_, i) => SPHERE_SKILLS[i % SPHERE_SKILLS.length])
  for (let i = map.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[map[i], map[j]] = [map[j], map[i]]
  }
  return map
}

interface ExplodeParticle { x: number; y: number; vx: number; vy: number; ch: string; depth: number; hot: boolean }
/** A packet of light travelling along one edge of the network. */
interface Pulse { edge: number; t: number; speed: number; forward: boolean }
interface Dust { x: number; y: number; z: number; phase: number }

interface Network {
  pts: Vec3[]
  edges: [number, number][]
  /** For each node, the indices of the edges touching it. */
  adj: number[][]
  skills: string[]
  pulses: Pulse[]
}

function buildNetwork(count: number, pulseCount: number): Network {
  const pts = fibSphere(count)
  const edges = buildEdges(pts)
  const adj: number[][] = Array.from({ length: count }, () => [])
  edges.forEach(([a, b], i) => { adj[a].push(i); adj[b].push(i) })
  const pulses: Pulse[] = Array.from({ length: pulseCount }, () => ({
    edge: Math.floor(Math.random() * edges.length),
    t: Math.random(),
    speed: 0.012 + Math.random() * 0.02,
    forward: Math.random() > 0.5,
  }))
  return { pts, edges, adj, skills: buildSkillMap(count), pulses }
}

interface SphereState {
  rX: number; rY: number; vX: number; vY: number
  dragging: boolean; lastX: number; lastY: number
  mx: number; my: number
  hover: number
  born: number
  exploding: boolean; explodeT: number; explodePts: ExplodeParticle[]
}

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
    const update = () => setTime(fmt.format(new Date()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</span>
}

interface Props { onEnter: () => void }

export default function Hero({ onEnter }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [btnVisible, setBtnVisible] = useState(true)
  const [btnHover, setBtnHover] = useState(0)
  const [hoverNode, setHoverNode] = useState<{ index: number; name: string } | null>(null)

  const net = useRef<Network | null>(null)
  if (!net.current) {
    const mobile = typeof window !== 'undefined' && window.innerWidth < 640
    net.current = buildNetwork(mobile ? 80 : 150, mobile ? 9 : 20)
  }
  // Screen-space projection of every node from the last frame: [x, y, z]
  const proj = useRef<Vec3[]>(net.current.pts.map((): Vec3 => [0, 0, 0]))
  const launched = useRef(false)

  const state = useRef<SphereState>({
    rX: 0.3, rY: 0, vX: 0, vY: 0.004,
    dragging: false, lastX: 0, lastY: 0,
    mx: -9999, my: -9999,
    hover: -1,
    born: 0,
    exploding: false, explodeT: 0, explodePts: [],
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { pts, edges, adj, skills, pulses } = net.current!
    const n = pts.length
    const P = proj.current
    const sortArr = Array.from({ length: n }, (_, i) => i)
    const near = new Uint8Array(n)
    let dust: Dust[] = []
    let lastHover = -1

    const stop = canvasLoop(canvas, {
      onResize: ({ w, h }) => {
        const count = Math.round(Math.min(140, (w * h) / 9000))
        dust = Array.from({ length: count }, () => ({
          x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, phase: Math.random() * 6.28,
        }))
      },
      draw: (ctx, { w, h }, now) => {
        const s = state.current
        if (!s.born) s.born = now
        const mobile = w < 640
        const cx = w / 2
        const cy = h * (SPHERE_TOP_PCT / 100)
        const baseR = Math.min(w * 0.42, h * 0.26)
        const fontMin = mobile ? 6 : 7
        const fontSpan = mobile ? 5 : 7

        // Intro: the network unfolds from a point
        const introT = Math.min(1, (now - s.born) / 1900)
        const intro = 1 - Math.pow(1 - introT, 4)
        const r = baseR * (0.15 + 0.85 * intro)

        ctx.clearRect(0, 0, w, h)

        // ── Core glow ──
        const breathe = 0.85 + 0.15 * Math.sin(now * 0.0011)
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2.2)
        glow.addColorStop(0, `rgba(${ACCENT},${0.11 * breathe * intro})`)
        glow.addColorStop(0.45, `rgba(${ACCENT},${0.03 * intro})`)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, w, h)

        const inside = s.mx > -9000

        // ── Dust field ──
        ctx.fillStyle = '#fff'
        for (const d of dust) {
          const px = d.x * w
          const py = d.y * h
          ctx.globalAlpha = (0.08 + 0.3 * d.z) * (0.55 + 0.45 * Math.sin(now * 0.0012 + d.phase))
          const sz = d.z > 0.8 ? 1.6 : 1
          ctx.fillRect(px, py, sz, sz)
        }
        ctx.globalAlpha = 1

        // ── Explosion phase ──
        if (s.exploding) {
          s.explodeT += 1
          const fade = Math.max(0, 1 - s.explodeT / 60)

          const flash = Math.max(0, 1 - s.explodeT / 14)
          if (flash > 0) {
            const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.6)
            fg.addColorStop(0, `rgba(255,255,255,${0.5 * flash})`)
            fg.addColorStop(0.4, `rgba(${ACCENT},${0.25 * flash})`)
            fg.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = fg
            ctx.fillRect(0, 0, w, h)
          }

          ctx.font = `14px ${MONO}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.lineWidth = 1
          for (const ep of s.explodePts) {
            ep.x += ep.vx
            ep.y += ep.vy
            ep.vx *= 0.965
            ep.vy *= 0.965
            const ev = Math.round(30 + ep.depth * 225)
            const color = ep.hot ? `rgb(${ACCENT})` : `rgb(${ev},${ev},${ev})`
            // Motion streak
            ctx.globalAlpha = fade * 0.25
            ctx.strokeStyle = color
            ctx.beginPath()
            ctx.moveTo(ep.x, ep.y)
            ctx.lineTo(ep.x - ep.vx * 5, ep.y - ep.vy * 5)
            ctx.stroke()
            ctx.globalAlpha = fade * (0.3 + ep.depth * 0.7)
            ctx.fillStyle = color
            ctx.fillText(ep.ch, ep.x, ep.y)
          }
          ctx.globalAlpha = 1
          return
        }

        if (!s.dragging) {
          s.rY += s.vY
          s.vX *= 0.97
          s.rX += s.vX
          s.vY += (0.003 - s.vY) * 0.002
        }

        // ── Rotate + project ──
        const aY = s.rY
        const aX = s.rX
        const cosY = Math.cos(aY), sinY = Math.sin(aY)
        const cosX = Math.cos(aX), sinX = Math.sin(aX)
        for (let i = 0; i < n; i++) {
          const p = pts[i]
          const tx = p[0] * cosY - p[2] * sinY
          const tz = p[0] * sinY + p[2] * cosY
          const ty = p[1] * cosX - tz * sinX
          const z = p[1] * sinX + tz * cosX
          const persp = 1 + z * 0.14
          P[i][0] = cx + tx * r * persp
          P[i][1] = cy + ty * r * persp
          P[i][2] = z
        }
        sortArr.sort((a, b) => P[a][2] - P[b][2] || a - b)

        // ── Hover: nearest front-facing node to the cursor ──
        let hover = -1
        if (inside && !s.dragging && introT >= 1) {
          let best = 34 * 34
          for (let i = 0; i < n; i++) {
            if (P[i][2] < 0.05) continue
            const dx = P[i][0] - s.mx, dy = P[i][1] - s.my
            const d = dx * dx + dy * dy
            if (d < best) { best = d; hover = i }
          }
        }
        s.hover = hover
        near.fill(0)
        if (hover >= 0) {
          for (const ei of adj[hover]) {
            near[edges[ei][0]] = 1
            near[edges[ei][1]] = 1
          }
        }
        if (hover !== lastHover) {
          lastHover = hover
          setHoverNode(hover >= 0 ? { index: hover, name: skills[hover] } : null)
        }


        // ── Network edges ──
        ctx.lineWidth = 0.78
        for (let e = 0; e < edges.length; e++) {
          const a = P[edges[e][0]], b = P[edges[e][1]]
          const depth = (a[2] + b[2] + 2) / 4
          const lit = hover >= 0 && (edges[e][0] === hover || edges[e][1] === hover)
          if (lit) {
            ctx.globalAlpha = 0.95
            ctx.strokeStyle = `rgb(${ACCENT})`
            ctx.lineWidth = 1.3
          } else {
            ctx.globalAlpha = (0.07 + depth * 0.34) * intro
            const ev = Math.round(70 + depth * 156)
            ctx.strokeStyle = `rgb(${ev},${ev},${ev})`
            ctx.lineWidth = 0.78
          }
          ctx.beginPath()
          ctx.moveTo(a[0], a[1])
          ctx.lineTo(b[0], b[1])
          ctx.stroke()
        }

        // ── Packets hopping node to node ──
        ctx.fillStyle = `rgb(${ACCENT})`
        for (const pulse of pulses) {
          pulse.t += pulse.speed
          if (pulse.t >= 1) {
            const [ea, eb] = edges[pulse.edge]
            const arrived = pulse.forward ? eb : ea
            const options = adj[arrived]
            const next = options[Math.floor(Math.random() * options.length)]
            pulse.edge = next
            pulse.forward = edges[next][0] === arrived
            pulse.t = 0
          }
          const [ea, eb] = edges[pulse.edge]
          const from = P[pulse.forward ? ea : eb], to = P[pulse.forward ? eb : ea]
          const x = from[0] + (to[0] - from[0]) * pulse.t
          const y = from[1] + (to[1] - from[1]) * pulse.t
          const depth = (from[2] + (to[2] - from[2]) * pulse.t + 1) / 2
          ctx.globalAlpha = (0.15 + depth * 0.85) * intro
          ctx.beginPath()
          ctx.arc(x, y, 1 + depth * 1.1, 0, Math.PI * 2)
          ctx.fill()
        }

        // ── Skill labels, back to front ──
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let si = 0; si < n; si++) {
          const i = sortArr[si]
          const [px, py, pz] = P[i]
          const depth = (pz + 1) / 2
          const size = Math.round(fontMin + depth * fontSpan)
          if (i === hover) continue
          if (near[i]) {
            ctx.globalAlpha = Math.min(1, 0.45 + depth)
            ctx.fillStyle = '#fff'
          } else {
            ctx.globalAlpha = (0.08 + depth * 0.92) * intro
            const v = Math.round(30 + depth * 225)
            ctx.fillStyle = `rgb(${v},${v},${v})`
          }
          ctx.font = `${size}px ${MONO}`
          ctx.fillText(skills[i], px, py)
        }
        if (hover >= 0) {
          const [px, py] = P[hover]
          ctx.globalAlpha = 1
          ctx.font = `${fontMin + fontSpan + 5}px ${MONO}`
          ctx.shadowColor = `rgb(${ACCENT})`
          ctx.shadowBlur = 18
          ctx.fillStyle = `rgb(${ACCENT})`
          ctx.fillText(skills[hover], px, py)
          ctx.shadowBlur = 0
        }
        ctx.globalAlpha = 1
      },
    })

    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onDown = (e: PointerEvent) => {
      const s = state.current
      s.dragging = true
      s.lastX = e.clientX; s.lastY = e.clientY
      s.vX = 0; s.vY = 0
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      const s = state.current
      const { x, y } = local(e)
      if (e.pointerType === 'mouse') { s.mx = x; s.my = y }
      if (!s.dragging) return
      const dx = e.clientX - s.lastX
      const dy = e.clientY - s.lastY
      // drag right → rY decreases → front face moves right
      s.rY -= dx * 0.004
      s.rX -= dy * 0.004
      s.vY = -dx * 0.004
      s.vX = -dy * 0.004
      s.lastX = e.clientX; s.lastY = e.clientY
    }
    const onUp = () => { state.current.dragging = false }
    const onLeave = () => { state.current.mx = -9999; state.current.my = -9999 }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      stop()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const handleLaunch = () => {
    if (launched.current) return
    launched.current = true
    setBtnVisible(false)
    const s = state.current
    const canvas = canvasRef.current
    if (canvas) {
      const cx = canvas.clientWidth / 2
      const cy = canvas.clientHeight * (SPHERE_TOP_PCT / 100)
      const skills = net.current!.skills
      s.explodePts = proj.current.map(([sx, sy, pz], i) => {
        const dirX = sx - cx
        const dirY = sy - cy
        const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1
        const speed = 6 + Math.random() * 13
        return {
          x: sx, y: sy,
          vx: (dirX / len) * speed + (Math.random() - 0.5) * 2,
          vy: (dirY / len) * speed + (Math.random() - 0.5) * 2,
          ch: skills[i],
          depth: (pz + 1) / 2,
          hot: i % 5 === 0,
        }
      })
      s.exploding = true
      s.explodeT = 0
    }
    onEnter()
  }

  // Enter key launches too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') handleLaunch() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nodeCount = net.current.pts.length
  const edgeCount = net.current.edges.length
  const hud = 'absolute font-mono uppercase text-white/35 hidden md:flex flex-col gap-1 pointer-events-none'
  const hudStyle = { fontSize: '0.55rem', letterSpacing: '0.22em' }

  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ height: '100svh' }}>
      <canvas
        ref={canvasRef}
        data-cursor="drag"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, #000 100%)' }}
      />

      {/* ── HUD frame ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 1.5 }}
      >
        {(['top-5 left-5 border-t border-l', 'top-5 right-5 border-t border-r', 'bottom-5 left-5 border-b border-l', 'bottom-5 right-5 border-b border-r'] as const).map(c => (
          <span key={c} className={`absolute w-4 h-4 border-white/30 ${c}`} />
        ))}
        <div className={`${hud} top-9 left-10`} style={hudStyle}>
          <span className="text-white/60">KM <span className="text-white">/</span> Portfolio</span>
          <span>v2 — {new Date().getFullYear()}</span>
        </div>
        <div className={`${hud} top-9 right-10 items-end`} style={hudStyle}>
          <span className="text-white/60">Chicago, IL</span>
          <span><Clock /> CT</span>
        </div>
        <div className={`${hud} bottom-9 left-10`} style={hudStyle}>
          <span className="text-white/60">{nodeCount} nodes · {edgeCount} links</span>
          <span>Drag to rotate</span>
        </div>
        <div className={`${hud} bottom-9 right-10 items-end`} style={hudStyle}>
          <span className="text-white/60">Press enter ↵</span>
          <span>to explore</span>
        </div>
      </motion.div>

      {/* ── Name ── */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center pointer-events-none px-4"
        style={{ top: '5.5%' }}
      >
        {HEAT_NAME ? (
          <h1 aria-label="Kareem Muftee" className="w-full flex justify-center" style={{ margin: "-1.2rem 0 -0.6rem" }}>
            <HeatName style={{ width: 'min(86vw, 900px)', height: 'auto' }} />
          </h1>
        ) : (
          <h1
            className="text-white uppercase whitespace-nowrap"
            style={{
              fontSize: 'clamp(1.25rem, 6vw, 5rem)',
              fontWeight: 100,
              letterSpacing: '0.5em',
              paddingLeft: '0.5em', // balances the trailing letter-spacing so it centres optically
            }}
            aria-label="Kareem Muftee"
          >
            {NAME.split('').map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="inline-block"
                initial={{ opacity: 0, y: 28, filter: 'blur(14px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1.1, delay: 0.35 + i * 0.055, ease: [0.16, 1, 0.3, 1] }}
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </h1>
        )}
        <motion.span
          className="block h-px mt-4"
          style={{ width: 'min(60vw, 420px)', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)' }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.4, delay: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        <p className="font-mono text-white/50 mt-4 tracking-[0.2em] text-center"
          style={{ fontSize: 'clamp(0.6rem, 1.4vw, 0.75rem)' }}>
          <Scramble text="Software Engineer & Systems Builder" onView delay={1100} speed={22} />
        </p>
        <p className="font-mono text-white/30 mt-1.5 tracking-[0.15em] text-center"
          style={{ fontSize: 'clamp(0.55rem, 1.1vw, 0.64rem)' }}>
          <Scramble text="BS in CS @ UIC · Building things" onView delay={1700} speed={22} />
        </p>
      </div>

      {/* ── Hovered node readout ── */}
      <div
        className="absolute left-0 right-0 hidden md:flex justify-center pointer-events-none font-mono uppercase"
        style={{ bottom: '6.5%', fontSize: '0.6rem', letterSpacing: '0.24em' }}
      >
        <AnimatePresence mode="wait">
          {hoverNode && btnVisible ? (
            <motion.span
              key={hoverNode.index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="text-white/45"
            >
              node {String(hoverNode.index).padStart(3, '0')} <span className="text-white/20">::</span>{' '}
              <span className="text-white">{hoverNode.name}</span>
            </motion.span>
          ) : (
            btnVisible && (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-white/20"
              >
                hover the network
              </motion.span>
            )
          )}
        </AnimatePresence>
      </div>

      {/* ── Enter button — centered ON the sphere ── */}
      <div
        className="absolute z-10"
        style={{ top: `${SPHERE_TOP_PCT}%`, left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <AnimatePresence>
          {btnVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.6, transition: { duration: 0.2 } }}
              transition={{ duration: 0.9, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                onClick={handleLaunch}
                onMouseEnter={() => setBtnHover(h => h + 1)}
                className="relative font-mono uppercase text-white/75 hover:text-white border border-white/25 hover:border-white/60 transition-colors duration-300"
                style={{
                  fontSize: 'clamp(0.8rem, 1.6vw, 0.95rem)', letterSpacing: '0.38em', background: '#000',
                  padding: '22px 52px 22px 58px', borderRadius: '999px',
                }}
              >
                <Scramble text="explore" play={btnHover} speed={34} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
