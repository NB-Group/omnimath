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

export type GlobeHandle = { dispose: () => void }

type Options = {
  mapUrl: string
  reduced: boolean
  onReady: () => void
}

const FOV = 32
const CORE_RADIUS = 0.985
const DOT_RADIUS = 1.006

// A true Möbius band: one half-twist over the loop. The wide gold band
// circles the globe; the front pass faces the camera and the twist turns the
// band over as it wraps around the back, exactly the single-surface object
// Bella asked for.
const RIBBON_RADIUS = 1.43
const RIBBON_HALF_WIDTH = 0.225
const RIBBON_HALF_THICKNESS = 0.024
const RIBBON_TWIST_PHASE = Math.PI / 4

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

  // The gold Möbius band is shaded by its own shader; no scene lights needed.

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

  // ---- Gold Möbius band ----------------------------------------------------
  const ribbonGeometry = buildRibbonGeometry()
  // The gold is deliberately unlit: a stylised two-tone shade keeps the
  // mark's saturated sun yellow instead of the olive a physically lit metal
  // produced, while the normal-based falloff still reveals the twist.
  const ribbonMaterial = new ShaderMaterial({
    uniforms: {
      uGold: { value: new Color('#ffd41f') },
      uDeep: { value: new Color('#b57a00') },
      uEdge: { value: new Color('#fff0a6') },
      uLight: { value: new Vector3(0.35, 0.6, 0.72).normalize() },
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
      uniform vec3 uGold;
      uniform vec3 uDeep;
      uniform vec3 uEdge;
      uniform vec3 uLight;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(vView);
        float key = max(dot(n, normalize(uLight)), 0.0);
        float up = 0.5 + 0.5 * n.y;
        vec3 color = mix(uDeep, uGold, clamp(0.32 + 0.5 * key + 0.18 * up, 0.0, 1.0));
        float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);
        color += uEdge * rim * 0.2;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: DoubleSide,
  })
  const ribbon = new Mesh(ribbonGeometry, ribbonMaterial)
  ribbon.renderOrder = 2
  ribbonGroup.add(ribbon)
  // Left high and right low, like the mark. The band itself carries the
  // half-twist; this only sets the composition. Pitch the loop toward the
  // viewer so the back pass clears the globe at the sides and the band reads
  // as a loop, not a straight plank across the sphere.
  ribbonGroup.rotation.z = -0.24
  ribbonGroup.rotation.x = 0.38

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
    ribbonGroup.rotation.x = 0.38 + pointer.y * 0.03
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
