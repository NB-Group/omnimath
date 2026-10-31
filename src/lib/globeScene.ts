import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
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
import { LAND_MASK_MAX_COLUMNS, LAND_MASK_ROWS, decodeLandMask } from './landMask'

export type GlobeHandle = { dispose: () => void }

type Options = {
  reduced: boolean
  onReady: () => void
}

const FOV = 32
const CORE_RADIUS = 0.985
const DOT_RADIUS = 1.006

// The gold band from the mark: one half-turn as it circles the globe, so the
// front pass is seen edge-on while the wide faces show in the side loops.
// The hoop hugs the globe in the mark, and its outer edge must stay inside the
// square canvas — the earlier radius reached past the frame and the loops were
// clipped at the sides.
const RIBBON_RADIUS = 1.38
const RIBBON_HALF_WIDTH = 0.34
const RIBBON_HALF_THICKNESS = 0.022
// theta = u/2 - phase. A Möbius band turns edge-on exactly once per loop and
// the phase decides where; this value puts the twist on the front pass, which
// is how the drawn mark reads (two broad faces in the side loops). Shifting it
// a quarter turn instead turned the band into a belt across the globe, so it
// stays where the original tuning put it.
const RIBBON_TWIST_PHASE = -Math.PI / 4
// Composition of the hoop relative to the camera. Shallow on purpose: a steep
// tilt drops the near pass below the globe's equator and it reads as rings.
const RIBBON_TILT_X = 0.14
const RIBBON_TILT_Z = 0.13

function buildRibbonGeometry() {
  const segments = 480
  const positions: number[] = []
  const normals: number[] = []

  type Frame = {
    center: Vector3
    width: Vector3
    normal: Vector3
  }

  const frameAt = (u: number): Frame => {
    const radial = new Vector3(Math.cos(u), 0, Math.sin(u))
    const tangent = new Vector3(-Math.sin(u), 0, Math.cos(u))
    // theta advances by pi over one loop: a half-twist.
    const theta = u / 2 - RIBBON_TWIST_PHASE
    const width = new Vector3(0, Math.cos(theta), 0)
      .addScaledVector(radial, Math.sin(theta))
      .normalize()
    const normal = new Vector3().crossVectors(width, tangent).normalize()
    const center = radial.clone().multiplyScalar(RIBBON_RADIUS)
    return { center, width, normal }
  }

  const cornersAt = (frame: Frame): Vector3[] => {
    const { center, width, normal } = frame
    return [
      center
        .clone()
        .addScaledVector(width, RIBBON_HALF_WIDTH)
        .addScaledVector(normal, RIBBON_HALF_THICKNESS),
      center
        .clone()
        .addScaledVector(width, -RIBBON_HALF_WIDTH)
        .addScaledVector(normal, RIBBON_HALF_THICKNESS),
      center
        .clone()
        .addScaledVector(width, -RIBBON_HALF_WIDTH)
        .addScaledVector(normal, -RIBBON_HALF_THICKNESS),
      center
        .clone()
        .addScaledVector(width, RIBBON_HALF_WIDTH)
        .addScaledVector(normal, -RIBBON_HALF_THICKNESS),
    ]
  }

  const faceNormal = (frame: Frame, face: number) => {
    if (face === 0) return frame.normal
    if (face === 2) return frame.normal.clone().negate()
    if (face === 1) return frame.width.clone().negate()
    return frame.width
  }

  const pushQuad = (
    a0: Vector3,
    b0: Vector3,
    a1: Vector3,
    b1: Vector3,
    normal: Vector3,
  ) => {
    // Two triangles with a shared flat normal. Wind them counter-clockwise
    // around the assigned outward normal: the earlier order was backwards,
    // so DoubleSide flipped every front normal away from the key light and
    // the gold rendered as a dull olive. The seam closes with the corners
    // swapped, as a Möbius band must.
    positions.push(
      a0.x, a0.y, a0.z,
      a1.x, a1.y, a1.z,
      b0.x, b0.y, b0.z,
      b0.x, b0.y, b0.z,
      a1.x, a1.y, a1.z,
      b1.x, b1.y, b1.z,
    )
    for (let i = 0; i < 6; i++) normals.push(normal.x, normal.y, normal.z)
  }

  const firstRing = cornersAt(frameAt(0))

  for (let i = 0; i < segments; i++) {
    const u0 = (i / segments) * Math.PI * 2
    const u1 = ((i + 1) / segments) * Math.PI * 2
    const frame0 = frameAt(u0)
    const frame1 = frameAt(u1)
    const frameMid = frameAt((u0 + u1) / 2)
    const ring0 = cornersAt(frame0)
    const ring1 = cornersAt(frame1)
    const closing = i === segments - 1

    for (let face = 0; face < 4; face++) {
      const a0 = ring0[face]
      const b0 = ring0[(face + 1) % 4]
      // At the seam the +W/+N frame has become -W/-N, so the final quad
      // joins the opposite pair of corners on the first ring.
      const a1 = closing ? firstRing[(face + 2) % 4] : ring1[face]
      const b1 = closing ? firstRing[(face + 3) % 4] : ring1[(face + 1) % 4]
      pushQuad(a0, b0, a1, b1, faceNormal(frameMid, face))
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  return geometry
}

function loadLandMask(): Uint8Array {
  return decodeLandMask()
}

type DotCloud = { geometry: BufferGeometry; count: number }

/**
 * A lat/lon lattice of dots: green over land, blue over ocean. The land bits
 * are baked from the equirectangular map so the globe never depends on an
 * image fetch at runtime.
 */
function buildDots(mask: Uint8Array): DotCloud {
  const positions: number[] = []
  const colors: number[] = []
  const sizes: number[] = []
  const alphas: number[] = []

  const landColor = new Color('#74c74c')
  const oceanColor = new Color('#4f8fe8')
  const rows = LAND_MASK_ROWS - 1
  const maxColumns = LAND_MASK_MAX_COLUMNS
  let bitIndex = 0

  for (let row = 0; row <= rows; row++) {
    const lat = -90 + (row / rows) * 180
    const latRad = (lat * Math.PI) / 180
    const columns = Math.max(1, Math.round(maxColumns * Math.cos(latRad)))
    const offset = (row % 2) * 0.5

    for (let column = 0; column < columns; column++) {
      const lon = ((column + offset) / columns) * 360 - 180
      const lonRad = (lon * Math.PI) / 180

      const byte = mask[bitIndex >> 3] ?? 0
      const land = ((byte >> (7 - (bitIndex & 7))) & 1) === 1
      bitIndex += 1

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

  // The gold Möbius band is shaded by its own shader; no scene lights needed.

  const root = new Group()
  // Scale the whole composition so the hoop's outer edge clears the square
  // canvas; at 0.72 the loops were cropped at the left and right.
  root.scale.setScalar(0.70)
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

  // ---- Gold Möbius band ----------------------------------------------------
  const ribbonGeometry = buildRibbonGeometry()
  // Two flat tones, as in the drawn mark: the lit face is saturated sun and
  // the underside is a deep amber. The normals decide which is which, so no
  // lighting model is needed and the colour never washes out.
  const ribbonMaterial = new ShaderMaterial({
    uniforms: {
      uGold: { value: new Color('#ffd818') },
      uDeep: { value: new Color('#c98a00') },
      uLight: { value: new Vector3(0.15, 0.55, 0.82).normalize() },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uGold;
      uniform vec3 uDeep;
      uniform vec3 uLight;
      varying vec3 vNormal;
      void main() {
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        // Hard-ish two-tone with a narrow blend, like flat vector art.
        float lit = smoothstep(-0.08, 0.22, dot(n, normalize(uLight)));
        gl_FragColor = vec4(mix(uDeep, uGold, lit), 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: DoubleSide,
  })
  const ribbon = new Mesh(ribbonGeometry, ribbonMaterial)
  ribbon.renderOrder = 2
  ribbonGroup.add(ribbon)
  // Left high and right low, like the mark. The tilt is deliberately shallow:
  // at 0.3 the hoop's near pass dropped below the globe's equator and the whole
  // thing read as a ringed planet rather than a ribbon crossing a sphere.
  // Shared with the render loop, which would otherwise reset it each frame.
  ribbonGroup.rotation.z = RIBBON_TILT_Z
  ribbonGroup.rotation.x = RIBBON_TILT_X

  // ---- Dotted surface ------------------------------------------------------
  let dotGeometry: BufferGeometry | null = null
  let dotMaterial: ShaderMaterial | null = null
  let dotPoints: Points | null = null

  const installDots = () => {
    if (dotGeometry) return
    const dots = buildDots(loadLandMask())
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

  // ---- Pointer: parallax when idle, drag to spin --------------------------
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value))

  // Where the visitor has spun the globe, on top of the slow auto-rotation.
  let spinYaw = 0
  let spinPitch = 0
  let dragging = false
  let dragId: number | null = null
  let lastX = 0
  let lastY = 0

  // Vertical swipes still scroll the page; horizontal ones spin the globe.
  wrap.style.touchAction = 'pan-y'
  if (!options.reduced) wrap.style.cursor = 'grab'

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    dragging = true
    dragId = event.pointerId
    lastX = event.clientX
    lastY = event.clientY
    wrap.style.cursor = 'grabbing'
    try {
      wrap.setPointerCapture(event.pointerId)
    } catch {
      /* capture is best-effort */
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (dragging && event.pointerId === dragId) {
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      spinYaw += dx * 0.0062
      spinPitch = clamp(spinPitch + dy * 0.0042, -0.55, 0.55)
      if (options.reduced) {
        // No render loop in reduced motion, so paint the drag directly.
        applyTransform(0)
        renderer.render(scene, camera)
      }
      return
    }
    if (event.pointerType === 'touch') return
    const rect = wrap.getBoundingClientRect()
    pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2
  }

  const endDrag = (event: PointerEvent) => {
    if (!dragging) return
    if (dragId !== null && event.pointerId !== dragId) return
    dragging = false
    dragId = null
    wrap.style.cursor = options.reduced ? '' : 'grab'
    try {
      wrap.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  const onPointerLeave = () => {
    if (dragging) return
    pointer.targetX = 0
    pointer.targetY = 0
  }

  wrap.addEventListener('pointerdown', onPointerDown)
  wrap.addEventListener('pointermove', onPointerMove)
  wrap.addEventListener('pointerup', endDrag)
  wrap.addEventListener('pointercancel', endDrag)
  wrap.addEventListener('pointerleave', onPointerLeave)

  // ---- Render loop ---------------------------------------------------------
  let frame = 0
  let visible = true
  let pageVisible = !document.hidden

  const applyTransform = (t: number) => {
    pointer.x += (pointer.targetX - pointer.x) * 0.06
    pointer.y += (pointer.targetY - pointer.y) * 0.06
    globeGroup.rotation.y = baseYaw + spinYaw + t * 0.045 + pointer.x * 0.32
    globeGroup.rotation.x = baseTilt + spinPitch + pointer.y * 0.14
    ribbonGroup.rotation.y = pointer.x * 0.04
    ribbonGroup.rotation.x = RIBBON_TILT_X + pointer.y * 0.03
    root.position.y = Math.sin(t * 0.7) * 0.015
  }

  const renderFrame = () => {
    applyTransform(performance.now() / 1000)
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

  installDots()

  return {
    dispose() {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      wrap.removeEventListener('pointerdown', onPointerDown)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerup', endDrag)
      wrap.removeEventListener('pointercancel', endDrag)
      wrap.removeEventListener('pointerleave', onPointerLeave)
      wrap.style.cursor = ''
      wrap.style.touchAction = ''
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
