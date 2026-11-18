import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   "KAREEM MUFTEE" as a thermal image, in greyscale.

   A port of the kmufti.com heat word. Each letter is blurred and recoloured
   through a palette (how solid a point is picks its shade: a near-black core
   out through a white-hot band to a grey fringe). Moving the cursor over it
   melts the heat in rings, then it warms back up. Untouched, it costs nothing.
   ───────────────────────────────────────────────────────────────────────────── */

const S = {
  text: 'KAREEM MUFTEE', font: 'Space Grotesk', weight: '700', size: 300, spacing: 14,
  blur: 2, breathe: 6, smooth: 1,
  fringe: 0.05, core: 1.02, melt: 0.42,
  cSize: 70, cStrength: 0.74, cSpread: 0.6, cRings: 9, cFloor: 0.03, cRecover: 0.55,
}

// edge -> core: a white glow and a white-hot line, dropping fast into a black core
const PALETTE: [number, [number, number, number]][] = [
  [0, [1, 1, 1]], [0.38, [1, 1, 1]], [0.5, [0.55, 0.55, 0.55]],
  [0.64, [0.12, 0.12, 0.12]], [1, [0, 0, 0]],
]
// The blue version, to switch back:
// [0, [0.08, 0.38, 0.9]], [0.26, [0.24, 0.72, 0.98]], [0.38, [1, 1, 1]],
// [0.48, [0.24, 0.77, 0.96]], [0.68, [0.1, 0.42, 0.85]], [0.88, [0.04, 0.14, 0.42]], [1, [0.02, 0.05, 0.2]],
const GRAIN = 0.9
const INTRO = { gap: 0.09, hold: 0.5, fade: 0.18 }

// The word's own coordinate space
const VW = 1600, VH = 210
const MW = VW / 4, MH = VH / 4, MS = VW / MW

const NS = 'http://www.w3.org/2000/svg'
const mk = (n: string, a: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, n)
  for (const k in a) e.setAttribute(k, String(a[k]))
  return e
}
const setHref = (el: Element, url: string) => {
  el.setAttribute('href', url)
  el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url)
}

function tables() {
  const at = (t: number) => {
    for (let i = 0; i < PALETTE.length - 1; i++) {
      const [a, ca] = PALETTE[i], [b, cb] = PALETTE[i + 1]
      if (t >= a && t <= b) { const k = (t - a) / (b - a || 1); return ca.map((c, j) => c + (cb[j] - c) * k) }
    }
    return PALETTE[PALETTE.length - 1][1]
  }
  const N = 33, cols: number[][] = [], alpha: number[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    cols.push(at(Math.min(1, t / Math.max(0.01, S.core))))
    alpha.push(Math.min(1, t / S.fringe) ** 1.5)
  }
  const j = (k: number) => cols.map(c => c[k].toFixed(3)).join(' ')
  return { r: j(0), g: j(1), b: j(2), a: alpha.map(v => v.toFixed(3)).join(' ') }
}

export default function HeatName({ className, style, font = S.font, weight = S.weight }: {
  className?: string; style?: React.CSSProperties; font?: string; weight?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    let alive = true
    const rafs = new Set<number>()
    const raf = (fn: FrameRequestCallback) => { const id = requestAnimationFrame(t => { rafs.delete(id); if (alive) fn(t) }); rafs.add(id) }

    /* the cursor's cooling map: white = full heat, darker = cooled */
    const mask = document.createElement('canvas')
    mask.width = MW; mask.height = MH
    const mctx = mask.getContext('2d')!
    mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, MW, MH)

    let cools: Element[] = []
    let comps: { el: Element; text: Element }[] = []

    function build() {
      const defs = mk('defs'), g = mk('g')
      svg!.textContent = ''
      svg!.append(defs, g)
      cools = []; comps = []
      const fam = `"${font}", sans-serif`
      const probe = mk('text', { 'font-family': fam, 'font-weight': weight, 'font-size': S.size }) as SVGTextElement
      g.appendChild(probe)
      const chars = [...S.text]
      const widths = chars.map(ch => { probe.textContent = ch === ' ' ? ' ' : ch; return probe.getComputedTextLength() })
      probe.remove()
      let total = widths.reduce((a, b) => a + b, 0) + S.spacing * (chars.length - 1)
      const fit = Math.min(1, (VW * 0.94) / total)
      const size = S.size * fit
      total *= fit
      let x = VW / 2 - total / 2
      const baseline = VH / 2 + size * 0.36
      const tb = tables(), url = mask.toDataURL()
      const drop = Math.max(0, 1 - S.cFloor)

      chars.forEach((ch, i) => {
        if (ch === ' ') { x += widths[i] * fit + S.spacing * fit; return }
        const s = 0.5
        const meltDip = S.melt * Math.max(0, Math.sin(1.2)) ** 6
        const blurAmt = S.blur + S.breathe * s + meltDip * S.blur * 2.5
        const id = 'heatName' + i
        const fl = mk('filter', { id, x: '-60%', y: '-40%', width: '220%', height: '180%', 'color-interpolation-filters': 'sRGB' })
        fl.append(
          mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: blurAmt.toFixed(2), result: 'soft' }),
        )
        const cool = mk('feImage', { x: 0, y: 0, width: VW, height: VH, preserveAspectRatio: 'none', result: 'coolImg' })
        setHref(cool, url)
        const comp = mk('feComposite', { in: 'soft', in2: 'cool', operator: 'arithmetic', k1: drop.toFixed(3), k2: (1 - drop).toFixed(3), k3: 0, k4: 0, result: 'cooled' })
        fl.append(
          cool,
          mk('feColorMatrix', { in: 'coolImg', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0', result: 'cool' }),
          comp,
          mk('feColorMatrix', { in: 'cooled', type: 'matrix', values: '0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 1 0' }),
        )
        const ct = mk('feComponentTransfer', { result: 'col' })
        ct.append(
          mk('feFuncR', { type: 'table', tableValues: tb.r }), mk('feFuncG', { type: 'table', tableValues: tb.g }),
          mk('feFuncB', { type: 'table', tableValues: tb.b }), mk('feFuncA', { type: 'table', tableValues: tb.a }),
        )
        fl.appendChild(ct)
        const gv = GRAIN, go = 0.5 - 1.5 * GRAIN
        fl.append(
          mk('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: S.smooth, seed: 11 + i, result: 'noise' }),
          mk('feColorMatrix', { in: 'noise', type: 'matrix', result: 'grain',
            values: `${gv} ${gv} ${gv} 0 ${go}  ${gv} ${gv} ${gv} 0 ${go}  ${gv} ${gv} ${gv} 0 ${go}  0 0 0 0 1` }),
          mk('feBlend', { in: 'grain', in2: 'col', mode: 'soft-light', result: 'mix' }),
          mk('feComposite', { in: 'mix', in2: 'col', operator: 'in' }),
        )
        defs.appendChild(fl)

        const t = mk('text', { x: x.toFixed(1), y: baseline.toFixed(1), 'font-family': fam, 'font-weight': weight,
          'font-size': size.toFixed(1), filter: `url(#${id})` })
        t.textContent = ch
        g.appendChild(t)
        cools.push(cool)
        comps.push({ el: comp, text: t })
        x += widths[i] * fit + S.spacing * fit
      })
      introLetters()
    }

    /* the cursor melts it, in rings */
    const pw = 2 ** (2 - 4 * S.cSpread)
    const steps = S.cRings | 0
    const depthAt = (t: number) => {
      let d = (1 - t) ** pw
      if (steps) d = Math.ceil(d * steps - 1e-6) / steps
      return S.cStrength * d
    }
    const stops: number[] = []
    for (let k = 0; k <= 24; k++) stops.push(k / 24)
    for (let k = 1; k < steps; k++) {
      const tb = 1 - (k / steps) ** (1 / pw), soft = Math.min(0.025, 0.1 / steps)
      stops.push(Math.max(0, tb - soft), Math.min(1, tb + soft))
    }
    stops.sort((a, b) => a - b)
    const R = S.cSize / MS
    function stamp(cx: number, cy: number) {
      const g = mctx.createRadialGradient(cx, cy, 0, cx, cy, R)
      for (const t of stops) {
        const v = Math.round(255 * (1 - depthAt(Math.min(t, 0.9999))))
        g.addColorStop(t, `rgb(${v},${v},${v})`)
      }
      g.addColorStop(1, 'rgb(255,255,255)')
      mctx.globalCompositeOperation = 'darken'
      mctx.fillStyle = g
      mctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      mctx.globalCompositeOperation = 'source-over'
    }

    let lastPt: { x: number; y: number } | null = null
    let coolLeft = 0, warmBank = 0, mapDirty = false, sent = 0, running = false, last = 0
    function paint(x: number, y: number) {
      const p = { x: x / MS, y: y / MS }
      if (lastPt) {
        const d = Math.hypot(p.x - lastPt.x, p.y - lastPt.y), n = Math.min(80, Math.ceil(d / Math.max(0.5, R * 0.12)))
        for (let k = 1; k <= n; k++) stamp(lastPt.x + (p.x - lastPt.x) * k / n, lastPt.y + (p.y - lastPt.y) * k / n)
      } else stamp(p.x, p.y)
      lastPt = p
      mapDirty = true
      coolLeft = 1 / S.cRecover + 0.5
      if (!running) { running = true; last = performance.now(); raf(tick) }
    }

    function tick(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      coolLeft -= dt
      let changed = false
      if (coolLeft <= 0) {
        mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, MW, MH)
        warmBank = 0; changed = true
      } else {
        warmBank += dt * S.cRecover * 255
        const levels = Math.floor(warmBank)
        if (levels >= 1) {
          warmBank -= levels
          mctx.globalCompositeOperation = 'lighter'
          mctx.fillStyle = `rgba(255,255,255,${Math.min(1, levels / 255)})`
          mctx.fillRect(0, 0, MW, MH)
          mctx.globalCompositeOperation = 'source-over'
          changed = true
        }
      }
      if (changed) mapDirty = true
      if (mapDirty && (now - sent >= 33 || coolLeft <= 0)) {
        sent = now; mapDirty = false
        const url = mask.toDataURL()
        for (const c of cools) setHref(c, url)
      }
      if (coolLeft > 0) raf(tick)
      else running = false
    }

    let warmed = false
    const onMove = (e: PointerEvent) => {
      if (!cools.length || !warmed) return
      const m = svg.getScreenCTM()
      if (!m) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX; pt.y = e.clientY
      const p = pt.matrixTransform(m.inverse())
      if (p.x < -60 || p.x > VW + 60 || p.y < -60 || p.y > VH + 60) { lastPt = null; return }
      paint(p.x, p.y)
    }
    const onLeave = () => { lastPt = null }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    /* intro: starts blank and warms up letter by letter */
    const DROP = Math.max(0, 1 - S.cFloor)
    const FIRST = 1 - 0.03 / DROP
    let introT = 0
    function introLetters() {
      comps.forEach((c, i) => {
        const t = Math.max(0, introT - INTRO.gap * i) - INTRO.fade
        const off = t < 0 ? FIRST : Math.max(0, FIRST - t * S.cRecover)
        c.el.setAttribute('k2', (S.cFloor - DROP * off).toFixed(4))
        const o = Math.min(1, Math.max(0, introT - INTRO.gap * i) / INTRO.fade)
        c.text.setAttribute('opacity', o >= 1 ? '1' : Math.max(0.004, o * o * (3 - 2 * o)).toFixed(3))
      })
    }
    function warmUp() {
      if (warmed || !alive) return
      warmed = true
      const end = INTRO.gap * (comps.length - 1) + INTRO.fade + FIRST / S.cRecover
      let prev = performance.now()
      raf(function step(now) {
        introT += Math.min(0.1, (now - prev) / 1000)
        prev = now
        introLetters()
        if (introT < end) raf(step)
      })
    }

    let timer = 0
    const go = () => {
      if (!alive) return
      build()
      timer = window.setTimeout(warmUp, INTRO.hold * 1000)
    }
    document.fonts?.load(`${weight} 100px "${font}"`, S.text).then(go, go) ?? go()

    return () => {
      alive = false
      clearTimeout(timer)
      rafs.forEach(id => cancelAnimationFrame(id))
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [font, weight])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: 'block', overflow: 'visible', pointerEvents: 'none', ...style }}
    />
  )
}
