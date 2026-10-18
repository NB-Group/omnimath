import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'

export type GlobeHandle = { dispose: () => void }

type Options = {
  mapUrl: string
  reduced: boolean
  onReady: () => void
}

const FOV = 32
const CORE_RADIUS = 0.985
const DOT_RADIUS = 1.006

// The logo's band is a wide hoop floating around the globe, not a narrow
// ribbon painted on its surface. The front pass is nearly horizontal; the
// ends curl up on the left and down on the right, forming the loop and tail.
const RIBBON_RADIUS = 1.6
const RIBBON_HALF_WIDTH = 0.185
const RIBBON_HALF_THICKNESS = 0.018
const RIBBON_RISE_LEFT = 0.42
const RIBBON_RISE_RIGHT = 0.28

/**
 * A thick gold hoop with four flat faces:
 * outer (bright), inner (dark), and two narrow edge faces. Building it as a
 * solid band rather than a zero-thickness strip gives the logo's crisp
 * yellow-to-orange edge, and the dark inner face forms the loop at the left.
 */
function buildRibbonGeometry() {
  const segments = 480
  const positions: number[] = []
  const colors: number[] = []

  // The band stands upright, with its width along world Y. The path rises
  // sharply only near the left and right edges, so the front pass stays level
  // like the logo instead of sloping across the whole globe.
  const axis = new Vector3(0, 1, 0)
  const light = new Vector3(0.35, 0.75, 0.55).normalize()

  const outerBase = new Color('#feda12')
  const innerBase = new Color('#b97900')
  const edgeBase = new Color('#925d00')

  const pointAt = (u: number) => {
    const cosU = Math.cos(u)
    const sinU = Math.sin(u)
    const side = Math.abs(cosU)
    const baseRise =
      cosU < 0
        ? RIBBON_RISE_LEFT * Math.pow(side, 4)
        : -RIBBON_RISE_RIGHT * Math.pow(side, 4)
    // Lift the back-left of the hoop and drop the back-right. The front pass
    // stays level; the separated back arc becomes the loop at the left and the
    // tail at the right, as in the mark.
    const backness = Math.max(0, -sinU)
    const loopLift = 1.3 * backness * backness * -cosU
    const center = new Vector3(
      RIBBON_RADIUS * cosU,
      baseRise + loopLift,
      RIBBON_RADIUS * sinU,
    )
    const radial = new Vector3(cosU, 0, sinU).normalize()
    return { center, radial }
  }

  const shade = (base: Color, amount: number, color: Color) =>
    color.copy(base).multiplyScalar(amount)

  const pushQuad = (
    a0: Vector3,
    b0: Vector3,
    a1: Vector3,
    b1: Vector3,
    color: Color,
  ) => {
    // Two triangles; the material is DoubleSide, so only the shape matters.
    positions.push(
      a0.x, a0.y, a0.z,
      b0.x, b0.y, b0.z,
      a1.x, a1.y, a1.z,
      b0.x, b0.y, b0.z,
      b1.x, b1.y, b1.z,
      a1.x, a1.y, a1.z,
    )
    for (let i = 0; i < 6; i++) colors.push(color.r, color.g, color.b)
  }

  for (let i = 0; i < segments; i++) {
    const u0 = (i / segments) * Math.PI * 2
    const u1 = ((i + 1) / segments) * Math.PI * 2
    const uMid = (u0 + u1) / 2

    const p0 = pointAt(u0)
    const p1 = pointAt(u1)
    const pMid = pointAt(uMid)

    const corner = (
      point: { center: Vector3; radial: Vector3 },
      radialAmount: number,
      widthAmount: number,
    ) =>
      point.center
        .clone()
        .addScaledVector(point.radial, radialAmount * RIBBON_HALF_THICKNESS)
        .addScaledVector(axis, widthAmount * RIBBON_HALF_WIDTH)

    const outerTop0 = corner(p0, 1, 1)
    const outerBottom0 = corner(p0, 1, -1)
    const innerTop0 = corner(p0, -1, 1)
    const innerBottom0 = corner(p0, -1, -1)

    const outerTop1 = corner(p1, 1, 1)
    const outerBottom1 = corner(p1, 1, -1)
    const innerTop1 = corner(p1, -1, 1)
    const innerBottom1 = corner(p1, -1, -1)

    const outerShade = 0.9 + 0.1 * Math.max(0, pMid.radial.dot(light))
    const innerShade = 0.78 + 0.16 * Math.max(0, -pMid.radial.dot(light))
    const edgeShade = 0.86 + 0.1 * Math.max(0, axis.dot(light))

    const outerColor = new Color()
    const innerColor = new Color()
    const edgeColor = new Color()
    shade(outerBase, Math.min(1, outerShade), outerColor)
    shade(innerBase, innerShade, innerColor)
    shade(edgeBase, edgeShade, edgeColor)

    pushQuad(outerTop0, outerBottom0, outerTop1, outerBottom1, outerColor)
    pushQuad(innerTop0, innerBottom0, innerTop1, innerBottom1, innerColor)
    pushQuad(outerTop0, innerTop0, outerTop1, innerTop1, edgeColor)
    pushQuad(outerBottom0, innerBottom0, outerBottom1, innerBottom1, edgeColor)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the land mask'))
    image.src = url
  })
}

type DotCloud = { geometry: BufferGeometry; count: number }

/**
 * A lat/lon lattice of dots: green over land, blue over ocean. The land mask
 * is sampled from the equirectangular map already used for the Earth texture.
 */
function buildDots(image: HTMLImageElement | null): DotCloud {
  let pixels: Uint8ClampedArray | null = null
  let mapWidth = 0
  let mapHeight = 0

  if (image) {
    const canvas = document.createElement('canvas')
    mapWidth = image.naturalWidth || image.width
    mapHeight = image.naturalHeight || image.height
    canvas.width = mapWidth
    canvas.height = mapHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context) {
      context.drawImage(image, 0, 0)
      pixels = context.getImageData(0, 0, mapWidth, mapHeight).data
    }
  }

  const positions: number[] = []
  const colors: number[] = []
  const sizes: number[] = []
  const alphas: number[] = []

  const landColor = new Color('#74c74c')
  const oceanColor = new Color('#4f8fe8')
  const rows = 80
  const maxColumns = 160

  for (let row = 0; row <= rows; row++) {
    const lat = -90 + (row / rows) * 180
    const latRad = (lat * Math.PI) / 180
    const columns = Math.max(1, Math.round(maxColumns * Math.cos(latRad)))
    const offset = (row % 2) * 0.5

    for (let column = 0; column < columns; column++) {
      const lon = ((column + offset) / columns) * 360 - 180
      const lonRad = (lon * Math.PI) / 180

      let land = false
      if (pixels) {
        const u = (lon + 180) / 360
        const v = (90 - lat) / 180
        const px = Math.min(mapWidth - 1, Math.max(0, Math.round(u * (mapWidth - 1))))
        const py = Math.min(mapHeight - 1, Math.max(0, Math.round(v * (mapHeight - 1))))
        const index = (py * mapWidth + px) * 4
        const r = pixels[index]
        const g = pixels[index + 1]
        const b = pixels[index + 2]
        land = g > 110 && g > b + 35 && g > r + 20
      }

      const cosLat = Math.cos(latRad)
      // East must appear to the right: x = sin(lon), z = cos(lon). The earlier
      // cos/sin pairing produced a mirrored world.
      positions.push(
        cosLat * Math.sin(lonRad) * DOT_RADIUS,
        Math.sin(latRad) * DOT_RADIUS,
        cosLat * Math.cos(lonRad) * DOT_RADIUS,
      )

      const color = land ? landColor : oceanColor
      colors.push(color.r, color.g, color.b)
      sizes.push(land ? 0.02 : 0.0075)
      alphas.push(land ? 1 : 0.5)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new Float32BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1))
  geometry.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1))

  return { geometry, count: positions.length / 3 }
}

/**
 * The Omnimath mark as a real 3D object: a deep blue globe rendered as a
 * dotted lattice and the wide gold hoop from the logo. Three.js is lazy-loaded.
 */
export function createGlobe(
  canvas: HTMLCanvasElement,
  wrap: HTMLElement,
  options: Options,
): GlobeHandle {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping

  const scene = new Scene()
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  camera.position.set(0, 0, 4.55)

  const root = new Group()
  // The hoop is wider than the globe; scale the whole composition so both the
  // loop and the tail stay inside the canvas, matching the logo's framing.
  root.scale.setScalar(0.72)
  scene.add(root)

  // The dotted globe spins inside a stationary hoop. Keeping the hoop out of
  // the globe's yaw keeps the logo's left-up / right-down tilt facing camera,
  // instead of rotating that tilt toward the viewer.
  const globeGroup = new Group()
  root.add(globeGroup)
  const ribbonGroup = new Group()
  root.add(ribbonGroup)

  // ---- Deep blue core ------------------------------------------------------
  const coreGeometry = new SphereGeometry(CORE_RADIUS, 96, 72)
  const coreMaterial = new ShaderMaterial({
    uniforms: {
      uDeep: { value: new Color('#001634') },
      uBright: { value: new Color('#003f8c') },
      uRim: { value: new Color('#2a6fd0') },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uBright;
      uniform vec3 uRim;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vView);
        float top = smoothstep(-0.9, 0.95, n.y);
        vec3 color = mix(uDeep, uBright, top);
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.1);
        color += uRim * fresnel * 0.45;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
  const core = new Mesh(coreGeometry, coreMaterial)
  globeGroup.add(core)

  // ---- Gold hoop -----------------------------------------------------------
  const ribbonGeometry = buildRibbonGeometry()
  const ribbonMaterial = new MeshBasicMaterial({
    vertexColors: true,
    side: DoubleSide,
  })
  const ribbon = new Mesh(ribbonGeometry, ribbonMaterial)
  ribbon.renderOrder = 2
  ribbonGroup.add(ribbon)

  // ---- Dotted surface ------------------------------------------------------
  let dotGeometry: BufferGeometry | null = null
  let dotMaterial: ShaderMaterial | null = null
  let dotPoints: Points | null = null

  const installDots = (image: HTMLImageElement | null) => {
    if (dotGeometry) return
    const dots = buildDots(image)
    dotGeometry = dots.geometry

    dotMaterial = new ShaderMaterial({
      uniforms: {
        uScale: { value: 1 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uScale;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
          vColor = aColor;
          vAlpha = aAlpha;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          if (d > 0.5) discard;
          float mask = smoothstep(0.5, 0.3, d);
          gl_FragColor = vec4(vColor, vAlpha * mask);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    })

    dotPoints = new Points(dotGeometry, dotMaterial)
    dotPoints.renderOrder = 1
    globeGroup.add(dotPoints)
    resize()
    if (options.reduced) renderer.render(scene, camera)
    options.onReady()
  }

  // ---- Orientation ---------------------------------------------------------
  const baseTilt = -0.14
  // With x = sin(lon), rotating by -120° brings 120°E (East Asia and
  // Australia) to the front, matching the mark.
  const baseYaw = -2.094
  globeGroup.rotation.x = baseTilt
  globeGroup.rotation.y = baseYaw
  globeGroup.rotation.z = 0.02

  const resize = () => {
    const rect = wrap.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (dotMaterial) {
      // gl_PointSize is in device pixels, so the projection scale comes from
      // the drawing-buffer height rather than the CSS height.
      dotMaterial.uniforms.uScale.value =
        canvas.height / (2 * Math.tan((FOV * Math.PI) / 360))
    }
    if (options.reduced) renderer.render(scene, camera)
  }
  resize()
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(wrap)

  // ---- Pointer parallax ----------------------------------------------------
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    const rect = wrap.getBoundingClientRect()
    pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2
  }
  const onPointerLeave = () => {
    pointer.targetX = 0
    pointer.targetY = 0
  }
  wrap.addEventListener('pointermove', onPointerMove)
  wrap.addEventListener('pointerleave', onPointerLeave)

  // ---- Render loop ---------------------------------------------------------
  let frame = 0
  let visible = true
  let pageVisible = !document.hidden

  const renderFrame = () => {
    pointer.x += (pointer.targetX - pointer.x) * 0.06
    pointer.y += (pointer.targetY - pointer.y) * 0.06
    const t = performance.now() / 1000
    globeGroup.rotation.y = baseYaw + t * 0.045 + pointer.x * 0.32
    globeGroup.rotation.x = baseTilt + pointer.y * 0.14
    ribbonGroup.rotation.y = pointer.x * 0.04
    ribbonGroup.rotation.x = pointer.y * 0.03
    root.position.y = Math.sin(t * 0.7) * 0.015
    renderer.render(scene, camera)
  }

  const loop = () => {
    frame = requestAnimationFrame(loop)
    if (!visible || !pageVisible) return
    renderFrame()
  }

  const start = () => {
    if (options.reduced || frame) return
    frame = requestAnimationFrame(loop)
  }
  const stop = () => {
    if (!frame) return
    cancelAnimationFrame(frame)
    frame = 0
  }

  if (options.reduced) renderer.render(scene, camera)
  else start()

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible) start()
      else stop()
    },
    { threshold: 0 },
  )
  intersectionObserver.observe(wrap)

  const onVisibility = () => {
    pageVisible = !document.hidden
    if (pageVisible) start()
    else stop()
  }
  document.addEventListener('visibilitychange', onVisibility)

  let disposed = false

  loadImage(options.mapUrl)
    .then((image) => {
      if (!disposed) installDots(image)
    })
    .catch(() => {
      if (!disposed) installDots(null)
    })

  return {
    dispose() {
      disposed = true
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerleave', onPointerLeave)
      coreGeometry.dispose()
      coreMaterial.dispose()
      ribbonGeometry.dispose()
      ribbonMaterial.dispose()
      dotGeometry?.dispose()
      dotMaterial?.dispose()
      renderer.dispose()
    },
  }
}
