/**
 * Generative line-art for the six Omnimath worlds. Each sketch is a pure
 * function of time, drawn on a transparent canvas so the card colour shows
 * through. No images, no dependencies.
 */

export type Sketch = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void

const SUN = '254, 218, 18'
const LEAF = '116, 199, 76'
const PAPER = '246, 242, 232'

const rgba = (c: string, a: number) => `rgba(${c}, ${a})`
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* ------------------------------------------------------------------ */
/* Elections — a district map whose boundary keeps re-drawing itself.   */
/* ------------------------------------------------------------------ */
const elections: Sketch = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h)
  const x0 = w * 0.1
  const x1 = w * 0.9
  const y0 = h * 0.16
  const y1 = h * 0.84
  const cols = 15
  const rows = 9

  ctx.strokeStyle = rgba(PAPER, 0.08)
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const x = lerp(x0, x1, i / 4)
    ctx.beginPath()
    ctx.moveTo(x, y0 - 8)
    ctx.lineTo(x, y1 + 8)
    ctx.stroke()
  }

  const boundaryAt = (y: number) =>
    (x0 + x1) / 2 + Math.sin(y * 0.028 + t * 0.55) * w * 0.035 + Math.sin(t * 0.31) * w * 0.012

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = lerp(x0, x1, c / (cols - 1))
      const y = lerp(y0, y1, r / (rows - 1))
      const left = x < boundaryAt(y)
      ctx.beginPath()
      ctx.fillStyle = left ? rgba(LEAF, 0.8) : rgba(PAPER, 0.62)
      ctx.arc(x, y, Math.min(w, h) * 0.0075, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.beginPath()
  for (let py = y0 - 10; py <= y1 + 10; py += 5) {
    const bx = boundaryAt(py)
    if (py === y0 - 10) ctx.moveTo(bx, py)
    else ctx.lineTo(bx, py)
  }
  ctx.strokeStyle = rgba(SUN, 0.95)
  ctx.lineWidth = 2
  ctx.stroke()
}

/* ------------------------------------------------------------------ */
/* History — radioactive decay, read like a timeline.                   */
/* ------------------------------------------------------------------ */
const history: Sketch = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h)
  const x0 = w * 0.1
  const x1 = w * 0.9
  const y0 = h * 0.2
  const y1 = h * 0.78
  const base = y1

  ctx.strokeStyle = rgba(PAPER, 0.22)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, base)
  ctx.lineTo(x1, base)
  ctx.stroke()

  for (let i = 0; i <= 8; i++) {
    const x = lerp(x0, x1, i / 8)
    ctx.strokeStyle = rgba(PAPER, i % 2 === 0 ? 0.26 : 0.12)
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x, base + (i % 2 === 0 ? 8 : 5))
    ctx.stroke()
  }

  const curveY = (u: number) => base - (base - y0) * Math.exp(-3.2 * u)
  const curveX = (u: number) => lerp(x0, x1, u)

  ctx.beginPath()
  for (let i = 0; i <= 120; i++) {
    const u = i / 120
    const x = curveX(u)
    const y = curveY(u)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = rgba(PAPER, 0.16)
  ctx.lineWidth = 2
  ctx.stroke()

  const progress = 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(t * 0.22 - Math.PI / 2))
  ctx.beginPath()
  for (let i = 0; i <= 120; i++) {
    const u = (i / 120) * progress
    const x = curveX(u)
    const y = curveY(u)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = rgba(LEAF, 0.95)
  ctx.lineWidth = 2.4
  ctx.lineJoin = 'round'
  ctx.stroke()

  for (const u of [0, 0.33, 0.66, 1]) {
    const x = curveX(u)
    const y = curveY(u)
    ctx.beginPath()
    ctx.fillStyle = rgba(PAPER, 0.18)
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()
  }

  const tx = curveX(progress)
  const ty = curveY(progress)
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 0.18)
  ctx.arc(tx, ty, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 1)
  ctx.arc(tx, ty, 4.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.setLineDash([4, 5])
  ctx.strokeStyle = rgba(PAPER, 0.2)
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(tx, base)
  ctx.stroke()
  ctx.setLineDash([])
}

/* ------------------------------------------------------------------ */
/* Economics — supply, demand and the equilibrium between them.         */
/* ------------------------------------------------------------------ */
const economics: Sketch = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h)
  const x0 = w * 0.12
  const x1 = w * 0.9
  const y0 = h * 0.18
  const y1 = h * 0.8
  const px = (q: number) => lerp(x0, x1, q)
  const py = (p: number) => lerp(y1, y0, p)
  const demand = (q: number) => 1 - 0.85 * q
  const supply = (q: number) => 0.16 + 0.76 * q

  ctx.strokeStyle = rgba(PAPER, 0.22)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y0 - 8)
  ctx.lineTo(x0, y1 + 8)
  ctx.lineTo(x1 + 8, y1 + 8)
  ctx.stroke()

  const eqQ = (1 - 0.16) / (0.85 + 0.76)
  const eqP = demand(eqQ)
  const breathe = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.6))

  // Surplus shading.
  ctx.beginPath()
  ctx.moveTo(px(0), py(1))
  ctx.lineTo(px(eqQ), py(eqP))
  ctx.lineTo(px(0), py(eqP))
  ctx.closePath()
  ctx.fillStyle = rgba(LEAF, 0.1 * breathe)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(px(0), py(0.16))
  ctx.lineTo(px(eqQ), py(eqP))
  ctx.lineTo(px(0), py(eqP))
  ctx.closePath()
  ctx.fillStyle = rgba(SUN, 0.1 * breathe)
  ctx.fill()

  ctx.lineWidth = 2.2
  ctx.strokeStyle = rgba(LEAF, 0.95)
  ctx.beginPath()
  ctx.moveTo(px(0), py(demand(0)))
  ctx.lineTo(px(1), py(demand(1)))
  ctx.stroke()

  ctx.strokeStyle = rgba(PAPER, 0.8)
  ctx.beginPath()
  ctx.moveTo(px(0), py(supply(0)))
  ctx.lineTo(px(1), py(supply(1)))
  ctx.stroke()

  const ex = px(eqQ)
  const ey = py(eqP)
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = rgba(PAPER, 0.22)
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex, y1)
  ctx.moveTo(ex, ey)
  ctx.lineTo(x0, ey)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 0.16 * breathe)
  ctx.arc(ex, ey, 16 * (0.9 + 0.1 * breathe), 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 1)
  ctx.arc(ex, ey, 4.6, 0, Math.PI * 2)
  ctx.fill()
}

/* ------------------------------------------------------------------ */
/* Games — a minimax tree with the optimal line lit up.                 */
/* ------------------------------------------------------------------ */
const games: Sketch = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h)
  const depth = 3
  const leafCount = 2 ** depth
  const top = h * 0.16
  const bottom = h * 0.8
  const left = w * 0.12
  const right = w * 0.88

  const xAt = (level: number, index: number) => {
    const span = (right - left) / 2 ** level
    return left + span / 2 + index * span
  }
  const yAt = (level: number) => lerp(top, bottom, level / depth)

  const values = Array.from({ length: leafCount }, (_, i) => {
    const v = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1
    return 1 + Math.round(v * 8)
  })

  type TreeNode = {
    level: number
    index: number
    value: number
    children?: [TreeNode, TreeNode]
    bestChild?: 0 | 1
  }

  const build = (level: number, index: number): TreeNode => {
    if (level === depth) return { level, index, value: values[index] }
    const a = build(level + 1, index * 2)
    const b = build(level + 1, index * 2 + 1)
    const isMax = (depth - level) % 2 === 1
    const value = isMax ? Math.max(a.value, b.value) : Math.min(a.value, b.value)
    const bestChild: 0 | 1 = isMax ? (a.value >= b.value ? 0 : 1) : (a.value <= b.value ? 0 : 1)
    return { level, index, value, children: [a, b], bestChild }
  }
  const root = build(0, 0)

  const hot = new Set<string>()
  const path: TreeNode[] = []
  const walk = (node: TreeNode) => {
    hot.add(`${node.level}:${node.index}`)
    path.push(node)
    if (node.children && node.bestChild !== undefined) walk(node.children[node.bestChild])
  }
  walk(root)

  const edges: { a: TreeNode; b: TreeNode }[] = []
  const collect = (node: TreeNode) => {
    if (!node.children) return
    for (const child of node.children) {
      edges.push({ a: node, b: child })
      collect(child)
    }
  }
  collect(root)

  for (const { a, b } of edges) {
    const isHot = hot.has(`${a.level}:${a.index}`) && hot.has(`${b.level}:${b.index}`)
    ctx.strokeStyle = isHot ? rgba(SUN, 0.9) : rgba(PAPER, 0.15)
    ctx.lineWidth = isHot ? 2 : 1.2
    ctx.beginPath()
    ctx.moveTo(xAt(a.level, a.index), yAt(a.level))
    ctx.lineTo(xAt(b.level, b.index), yAt(b.level))
    ctx.stroke()
  }

  const nodeR = Math.min(w, h) * 0.019
  const drawNode = (node: TreeNode, pulse: number) => {
    const x = xAt(node.level, node.index)
    const y = yAt(node.level)
    const isHot = hot.has(`${node.level}:${node.index}`)
    if (node.level === depth) {
      ctx.beginPath()
      ctx.fillStyle = isHot ? rgba(SUN, 0.95) : rgba(PAPER, 0.3)
      ctx.arc(x, y, nodeR * 0.85, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    ctx.beginPath()
    ctx.fillStyle = rgba(PAPER, isHot ? 0.92 : 0.24)
    ctx.arc(x, y, nodeR * (1 + (isHot ? pulse : 0) * 0.08), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = isHot ? 'rgba(5, 26, 56, 0.92)' : 'rgba(5, 26, 56, 0.6)'
    ctx.font = `600 ${Math.round(w * 0.019)}px "JetBrains Mono Variable", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(node.value), x, y + 1)
  }

  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4)
  const all: TreeNode[] = []
  const flatten = (n: TreeNode) => {
    all.push(n)
    n.children?.forEach(flatten)
  }
  flatten(root)
  for (const node of all) drawNode(node, pulse)

  // A pulse travelling down the optimal line.
  const travel = (t * 0.32) % 1
  const f = travel * depth
  const seg = Math.min(depth - 1, Math.floor(f))
  const local = f - seg
  const from = path[seg]
  const to = path[seg + 1] ?? path[seg]
  const x = lerp(xAt(from.level, from.index), xAt(to.level, to.index), local)
  const y = lerp(yAt(from.level), yAt(to.level), local)
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 0.22)
  ctx.arc(x, y, nodeR * 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 1)
  ctx.arc(x, y, nodeR * 0.75, 0, Math.PI * 2)
  ctx.fill()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}


/* ------------------------------------------------------------------ */
/* Science — logistic growth towards a carrying capacity.               */
/* ------------------------------------------------------------------ */
const science: Sketch = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h)
  const x0 = w * 0.1
  const x1 = w * 0.9
  const y0 = h * 0.18
  const y1 = h * 0.8
  const K = 0.86

  ctx.strokeStyle = rgba(PAPER, 0.14)
  ctx.setLineDash([5, 6])
  ctx.beginPath()
  ctx.moveTo(x0, lerp(y1, y0, K))
  ctx.lineTo(x1, lerp(y1, y0, K))
  ctx.stroke()
  ctx.setLineDash([])
  ctx.font = `500 ${Math.round(w * 0.024)}px "JetBrains Mono Variable", monospace`
  ctx.fillStyle = rgba(PAPER, 0.4)
  ctx.fillText('K', x1 - 12, lerp(y1, y0, K) - 8)

  const curve = (u: number, r: number) => 1 / (1 + Math.exp(-r * (u - 0.5) * 10))
  const xAt = (u: number) => lerp(x0, x1, u)
  const yAt = (n: number) => lerp(y1, y0, n)

  for (const r of [0.45, 1.05]) {
    ctx.beginPath()
    for (let i = 0; i <= 100; i++) {
      const u = i / 100
      const x = xAt(u)
      const y = yAt(curve(u, r))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = rgba(LEAF, 0.3)
    ctx.lineWidth = 1.6
    ctx.stroke()
  }

  const mainR = 2.35
  const progress = 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.3 - Math.PI / 2))
  ctx.beginPath()
  for (let i = 0; i <= 160; i++) {
    const u = (i / 160) * progress
    const x = xAt(u)
    const y = yAt(curve(u, mainR))
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = rgba(SUN, 0.95)
  ctx.lineWidth = 2.6
  ctx.stroke()

  for (const u of [0.18, 0.34, 0.5, 0.66, 0.82]) {
    const x = xAt(u)
    const y = yAt(curve(u, mainR))
    ctx.beginPath()
    ctx.fillStyle = rgba(PAPER, 0.28)
    ctx.arc(x, y, 3.4, 0, Math.PI * 2)
    ctx.fill()
  }

  const tx = xAt(progress)
  const ty = yAt(curve(progress, mainR))
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 0.16)
  ctx.arc(tx, ty, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 1)
  ctx.arc(tx, ty, 4, 0, Math.PI * 2)
  ctx.fill()
}

/* ------------------------------------------------------------------ */
/* Everyday systems — a network with one route lit up.                  */
/* ------------------------------------------------------------------ */
const systems: Sketch = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h)
  const cols = 4
  const rows = 3
  const nodes: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jx = Math.sin((r * 7 + c * 13) * 1.7) * w * 0.018
      const jy = Math.cos((r * 11 + c * 5) * 2.1) * h * 0.022
      nodes.push({
        x: w * 0.13 + (c / (cols - 1)) * w * 0.74 + jx,
        y: h * 0.2 + (r / (rows - 1)) * h * 0.6 + jy,
      })
    }
  }
  const index = (c: number, r: number) => r * cols + c

  const edges: [number, number][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = index(c, r)
      if (c < cols - 1) edges.push([i, index(c + 1, r)])
      if (r < rows - 1) edges.push([i, index(c, r + 1)])
      if (c < cols - 1 && r < rows - 1 && (c + r) % 2 === 0) edges.push([i, index(c + 1, r + 1)])
    }
  }

  ctx.strokeStyle = rgba(PAPER, 0.13)
  ctx.lineWidth = 1.2
  for (const [a, b] of edges) {
    ctx.beginPath()
    ctx.moveTo(nodes[a].x, nodes[a].y)
    ctx.lineTo(nodes[b].x, nodes[b].y)
    ctx.stroke()
  }

  const route = [
    index(0, 2),
    index(1, 2),
    index(1, 1),
    index(2, 1),
    index(2, 0),
    index(3, 0),
  ]

  ctx.strokeStyle = rgba(SUN, 0.9)
  ctx.lineWidth = 2.4
  ctx.beginPath()
  route.forEach((n, i) => {
    if (i === 0) ctx.moveTo(nodes[n].x, nodes[n].y)
    else ctx.lineTo(nodes[n].x, nodes[n].y)
  })
  ctx.stroke()

  for (let i = 0; i < nodes.length; i++) {
    const hot = route.includes(i)
    ctx.beginPath()
    ctx.fillStyle = hot ? rgba(SUN, 1) : rgba(PAPER, 0.42)
    ctx.arc(nodes[i].x, nodes[i].y, hot ? 5 : 3.6, 0, Math.PI * 2)
    ctx.fill()
  }

  // A pulse running the route.
  const total = route.length - 1
  const travel = (t * 0.22) % 1
  const scaled = travel * total
  const seg = Math.min(total - 1, Math.floor(scaled))
  const local = scaled - seg
  const a = nodes[route[seg]]
  const b = nodes[route[seg + 1]]
  const x = lerp(a.x, b.x, local)
  const y = lerp(a.y, b.y, local)
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 0.22)
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.fillStyle = rgba(SUN, 1)
  ctx.arc(x, y, 4.2, 0, Math.PI * 2)
  ctx.fill()
}

export const sketches: Record<string, Sketch> = {
  elections,
  history,
  economics,
  games,
  science,
  systems,
}
