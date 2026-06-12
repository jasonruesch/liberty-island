// Cloudy spring noon: soft overcast light, drifting low-poly clouds, animated
// harbor water, and the skyline ring — Manhattan NE, Ellis Island NNW, Jersey
// City W, Brooklyn E, Governors Island, and the far Verrazzano bridge.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl } from './materials'
import { LANDMARKS, WATER_Y } from '../data/layout'
import type { GameContext } from '../core/context'

export interface Environment {
  update(dt: number, t: number): void
}

export function buildEnvironment(ctx: GameContext): Environment {
  const { scene } = ctx

  // ------------------------------------------------------------ light ---
  scene.fog = new THREE.Fog(PALETTE.fogColor, 420, 2400)
  scene.background = new THREE.Color(PALETTE.skyHorizon)

  const hemi = new THREE.HemisphereLight(0xc8d6dd, 0x66795c, 0.95)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xe6ecee, 1.55)
  sun.position.set(120, 260, -60) // high noon, slightly north — soft overcast key
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -280
  sun.shadow.camera.right = 280
  sun.shadow.camera.top = 280
  sun.shadow.camera.bottom = -280
  sun.shadow.camera.near = 50
  sun.shadow.camera.far = 600
  sun.shadow.bias = -0.0004
  sun.shadow.radius = 6
  scene.add(sun)
  scene.add(sun.target)

  const fill = new THREE.AmbientLight(0xcfd8db, 0.48)
  scene.add(fill)

  // soft bounce from the southeast so the statue's face (she looks SE) reads
  const seFill = new THREE.DirectionalLight(0xdfe4e2, 0.4)
  seFill.position.set(320, 140, 320)
  scene.add(seFill)
  scene.add(seFill.target)

  // -------------------------------------------------------------- sky ---
  const skyGeo = new THREE.SphereGeometry(2800, 24, 14)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      cZenith: { value: new THREE.Color(PALETTE.skyZenith) },
      cHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 cZenith;
      uniform vec3 cHorizon;
      varying vec3 vPos;
      void main() {
        float h = clamp(normalize(vPos).y, 0.0, 1.0);
        vec3 col = mix(cHorizon, cZenith, pow(h, 0.78));
        // bright glow where the hidden noon sun sits
        vec3 sunDir = normalize(vec3(0.35, 0.72, -0.2));
        float glow = pow(max(dot(normalize(vPos), sunDir), 0.0), 6.0);
        col = mix(col, vec3(0.97, 0.97, 0.94), glow * 0.35);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const sky = new THREE.Mesh(skyGeo, skyMat)
  scene.add(sky)

  // ------------------------------------------------------------ clouds ---
  const cloudMat = mat(PALETTE.cloud, { flat: true, rough: 1 })
  const clouds: { g: THREE.Group; speed: number }[] = []
  const cloudField = new THREE.Group()
  scene.add(cloudField)
  const rng = mulberry(7)
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group()
    const puffs = 3 + Math.floor(rng() * 4)
    const baseR = 26 + rng() * 42
    for (let p = 0; p < puffs; p++) {
      const r = baseR * (0.45 + rng() * 0.6)
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), cloudMat)
      m.position.set((p - puffs / 2) * baseR * 0.74 + rng() * 14, (rng() - 0.5) * baseR * 0.3, (rng() - 0.5) * baseR * 0.8)
      m.scale.y = 0.46
      m.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
      g.add(m)
    }
    g.position.set((rng() - 0.5) * 3600, 220 + rng() * 240, (rng() - 0.5) * 3600)
    cloudField.add(g)
    clouds.push({ g, speed: 2.5 + rng() * 3.5 })
  }

  // ------------------------------------------------------------- water ---
  const waterGeo = new THREE.PlaneGeometry(6800, 6800, 96, 96)
  waterGeo.rotateX(-Math.PI / 2)
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      cShallow: { value: new THREE.Color(PALETTE.water) },
      cDeep: { value: new THREE.Color(PALETTE.waterDeep) },
      cFoam: { value: new THREE.Color(PALETTE.foam) },
      cFog: { value: new THREE.Color(PALETTE.fogColor) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float w = sin(wp.x * 0.045 + uTime * 0.9) * 0.22
                + sin(wp.z * 0.06 - uTime * 0.7) * 0.18
                + sin((wp.x + wp.z) * 0.025 + uTime * 0.5) * 0.25;
        wp.y += w;
        vWave = w;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 cShallow;
      uniform vec3 cDeep;
      uniform vec3 cFoam;
      uniform vec3 cFog;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        float d = length(vWorld.xz) / 3000.0;
        vec3 col = mix(cShallow, cDeep, clamp(d * 1.4, 0.0, 1.0));
        col += vWave * 0.06;
        // stylized glint stripes — soft, broad, overcast shimmer
        float g1 = sin(vWorld.x * 0.16 + uTime * 0.9) * sin(vWorld.z * 0.13 - uTime * 0.6);
        float g2 = sin(vWorld.x * 0.05 - uTime * 0.4) * sin(vWorld.z * 0.045 + uTime * 0.5);
        float glint = smoothstep(0.78, 1.0, g1) * 0.22 + smoothstep(0.7, 1.0, g2) * 0.2;
        col = mix(col, cFoam, glint);
        float fogF = smoothstep(400.0, 2400.0, distance(cameraPosition, vWorld));
        col = mix(col, cFog, fogF);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = WATER_Y
  scene.add(water)

  // --------------------------------------------------------- skylines ---
  const skyline = new THREE.Group()
  scene.add(skyline)

  // Lower Manhattan (NE): a cluster with One WTC
  {
    const g = new THREE.Group()
    const rngM = mulberry(12)
    const towerMat = mat(0x9eb0bd, { rough: 0.7 })
    const towerMat2 = mat(0x8da0ae, { rough: 0.7 })
    for (let i = 0; i < 26; i++) {
      const w = 22 + rngM() * 38
      const h = 60 + rngM() * 200
      const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * (0.7 + rngM() * 0.6)), rngM() > 0.5 ? towerMat : towerMat2)
      t.position.set((rngM() - 0.5) * 560, h / 2, (rngM() - 0.5) * 320)
      g.add(t)
    }
    // One WTC: tapered prism + spire
    const wtc = new THREE.Mesh(new THREE.CylinderGeometry(16, 26, 320, 4), mat(0xafc4cf, { rough: 0.4, metal: 0.2 }))
    wtc.rotation.y = Math.PI / 4
    wtc.position.set(40, 160, 0)
    g.add(wtc)
    const spire = cyl(0.8, 2.2, 76, 0x93a7b3, 6)
    spire.position.set(40, 320 + 38, 0)
    g.add(spire)
    g.position.set(LANDMARKS.manhattan.x, 0, LANDMARKS.manhattan.z)
    skyline.add(g)
  }

  // Brooklyn (E): long low mass + cranes
  {
    const g = new THREE.Group()
    const rngB = mulberry(31)
    for (let i = 0; i < 16; i++) {
      const w = 60 + rngB() * 90
      const h = 18 + rngB() * 50
      const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, 60), mat(0x96a4a8, { rough: 0.85 }))
      t.position.set((i - 8) * 95 + rngB() * 40, h / 2, (rngB() - 0.5) * 120)
      g.add(t)
    }
    g.position.set(LANDMARKS.brooklyn.x, 0, LANDMARKS.brooklyn.z)
    skyline.add(g)
  }

  // Jersey City (W)
  {
    const g = new THREE.Group()
    const rngJ = mulberry(44)
    for (let i = 0; i < 14; i++) {
      const w = 26 + rngJ() * 36
      const h = 50 + rngJ() * 150
      const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(0xa3b2ba, { rough: 0.75 }))
      t.position.set((rngJ() - 0.5) * 200, h / 2, (i - 7) * 90 + rngJ() * 30)
      g.add(t)
    }
    // green Liberty State Park shoreline
    const park = new THREE.Mesh(new THREE.BoxGeometry(120, 4, 900), mat(0x6c9460, { rough: 1 }))
    park.position.set(150, 2, 100)
    g.add(park)
    g.position.set(LANDMARKS.jerseyCity.x, 0, LANDMARKS.jerseyCity.z)
    skyline.add(g)
  }

  // Ellis Island (NNW): red-brick main building, four towers
  {
    const g = new THREE.Group()
    const island = new THREE.Mesh(new THREE.CylinderGeometry(150, 160, 5, 10), mat(0x7e8c78, { rough: 1 }))
    island.position.y = 0.5
    g.add(island)
    const main = box(110, 26, 44, 0xa45c47, { rough: 0.9 })
    main.position.y = 16
    g.add(main)
    const roof = box(112, 5, 46, 0x6f7d84)
    roof.position.y = 31
    g.add(roof)
    for (const [dx, dz] of [
      [-46, -16],
      [46, -16],
      [-46, 16],
      [46, 16],
    ]) {
      const tower = box(14, 44, 14, 0xa45c47)
      tower.position.set(dx, 25, dz)
      g.add(tower)
      const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), mat(0x8aa39a, { rough: 0.6 }))
      dome.position.set(dx, 50, dz)
      dome.scale.y = 0.8
      g.add(dome)
    }
    g.position.set(LANDMARKS.ellisIsland.x, 0, LANDMARKS.ellisIsland.z)
    skyline.add(g)
  }

  // Governors Island (E, low green)
  {
    const g = new THREE.Group()
    const land = new THREE.Mesh(new THREE.CylinderGeometry(180, 190, 6, 12), mat(0x6c8f63, { rough: 1 }))
    land.position.y = 0
    g.add(land)
    const fort = cyl(40, 44, 10, 0x9b8d77, 12)
    fort.position.set(-30, 7, 20)
    g.add(fort)
    g.position.set(LANDMARKS.governors.x, 0, LANDMARKS.governors.z)
    skyline.add(g)
  }

  // Verrazzano-Narrows bridge silhouette (far S)
  {
    const g = new THREE.Group()
    const bmat = mat(0x96a4ad, { rough: 0.8 })
    const span = 900
    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(16, 200, 10), bmat)
      tower.position.set((side * span) / 2, 100, 0)
      g.add(tower)
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(span * 1.7, 8, 14), bmat)
    deck.position.y = 80
    g.add(deck)
    // catenary cables
    const cablePts: THREE.Vector3[] = []
    for (let i = 0; i <= 30; i++) {
      const t = i / 30
      const x = (t - 0.5) * span
      const y = 196 - Math.cos((t - 0.5) * Math.PI) * 110
      cablePts.push(new THREE.Vector3(x, y, 0))
    }
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 30, 2.4, 5), bmat)
    g.add(cable)
    g.position.set(LANDMARKS.verrazzano.x, 0, LANDMARKS.verrazzano.z)
    skyline.add(g)
  }

  // --------------------------------------------------- harbor traffic ---
  const boats: { g: THREE.Group; a: THREE.Vector3; b: THREE.Vector3; t: number; speed: number }[] = []
  const mkBoat = (color: number, w: number, len: number) => {
    const g = new THREE.Group()
    const hull = box(w, 6, len, color)
    hull.position.y = 3
    g.add(hull)
    const cabin = box(w * 0.7, 5, len * 0.4, 0xf2f3ee)
    cabin.position.y = 8
    g.add(cabin)
    scene.add(g)
    return g
  }
  boats.push({ g: mkBoat(0xe8762c, 22, 60), a: new THREE.Vector3(900, WATER_Y, 600), b: new THREE.Vector3(1400, WATER_Y, -900), t: 0.2, speed: 0.012 }) // Staten Island ferry orange
  boats.push({ g: mkBoat(0x4a5a66, 14, 80), a: new THREE.Vector3(-1200, WATER_Y, -1400), b: new THREE.Vector3(800, WATER_Y, 1600), t: 0.55, speed: 0.006 }) // barge
  boats.push({ g: mkBoat(0xf2f3ee, 10, 34), a: new THREE.Vector3(-800, WATER_Y, 700), b: new THREE.Vector3(-200, WATER_Y, -900), t: 0.8, speed: 0.016 }) // sightseeing boat

  // distant gull specks circling
  const gullFlock = new THREE.Group()
  const gullMat = mat(0xe8edef)
  for (let i = 0; i < 9; i++) {
    const gull = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.2, 3), gullMat)
    gull.rotation.x = Math.PI / 2
    gullFlock.add(gull)
  }
  scene.add(gullFlock)

  return {
    update(dt: number, t: number): void {
      waterMat.uniforms.uTime.value = t
      for (const c of clouds) {
        c.g.position.x += c.speed * dt
        if (c.g.position.x > 1900) c.g.position.x = -1900
      }
      for (const b of boats) {
        b.t += b.speed * dt
        if (b.t > 1) {
          b.t = 0
          const tmp = b.a.clone()
          b.a.copy(b.b)
          b.b.copy(tmp)
        }
        const prev = b.g.position.clone()
        b.g.position.lerpVectors(b.a, b.b, b.t)
        b.g.position.y = WATER_Y + 0.5
        const dirV = b.g.position.clone().sub(prev)
        if (dirV.lengthSq() > 1e-6) b.g.rotation.y = Math.atan2(dirV.x, dirV.z)
      }
      gullFlock.children.forEach((gull, i) => {
        const a = t * (0.18 + i * 0.012) + i * 1.7
        const r = 130 + (i % 4) * 60
        gull.position.set(Math.cos(a) * r + 60, 65 + Math.sin(t * 0.6 + i) * 12, Math.sin(a) * r - 40)
        gull.rotation.z = a + Math.PI / 2
      })
      // keep the sky + far water centered on the camera so edges never show
      sky.position.x = ctx.camera.position.x
      sky.position.z = ctx.camera.position.z
    },
  }
}

/** tiny deterministic rng so the world looks the same every visit */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
