// Reusable street furniture & flora: London plane trees, NPS benches,
// historic double-globe lampposts, seawall railings, the flagpole with a
// waving Stars-and-Stripes, spring tulip beds, coin binoculars, kiosks,
// stanchions, plaques and the sculpture-garden bronzes.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl, sph, cone, textPlane } from './materials'
import { mulberry } from './environment'

const rng = mulberry(99)

// shared geometries
const puffGeo = new THREE.IcosahedronGeometry(1, 0)

export function londonPlane(scale = 1): THREE.Group {
  const g = new THREE.Group()
  const trunkH = (2.6 + rng() * 1.2) * scale
  const trunk = cyl(0.16 * scale, 0.26 * scale, trunkH, 0x9a8a72, 7)
  trunk.position.y = trunkH / 2
  g.add(trunk)
  const canopyMat = mat(rng() > 0.5 ? PALETTE.grassLight : 0x73a763, { rough: 1 })
  const puffs = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < puffs; i++) {
    const r = (1.1 + rng() * 0.9) * scale
    const m = new THREE.Mesh(puffGeo, canopyMat)
    m.scale.setScalar(r)
    m.scale.y = r * 0.85
    m.position.set((rng() - 0.5) * 1.6 * scale, trunkH + (0.4 + rng() * 1.1) * scale, (rng() - 0.5) * 1.6 * scale)
    m.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    m.castShadow = true
    g.add(m)
  }
  return g
}

export function bench(): THREE.Group {
  const g = new THREE.Group()
  const frameMat = mat(0x2f3a33, { rough: 0.6, metal: 0.4 })
  for (const side of [-0.78, 0.78]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.5), frameMat)
    leg.position.set(side, 0.225, 0)
    g.add(leg)
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), frameMat)
    back.position.set(side, 0.65, -0.24)
    back.rotation.x = -0.18
    g.add(back)
  }
  for (let i = 0; i < 3; i++) {
    const slat = box(1.8, 0.05, 0.14, PALETTE.wood)
    slat.position.set(0, 0.45, -0.18 + i * 0.18)
    g.add(slat)
  }
  for (let i = 0; i < 2; i++) {
    const slat = box(1.8, 0.14, 0.05, PALETTE.wood)
    slat.position.set(0, 0.62 + i * 0.2, -0.31 - i * 0.045)
    slat.rotation.x = -0.18
    g.add(slat)
  }
  return g
}

export function lampPost(): THREE.Group {
  const g = new THREE.Group()
  const poleMat = mat(0x29372e, { rough: 0.5, metal: 0.5 })
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 4.2, 7), poleMat)
  pole.position.y = 2.1
  pole.castShadow = true
  g.add(pole)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 7), poleMat)
  collar.position.y = 3.6
  g.add(collar)
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5), poleMat)
    arm.rotation.z = Math.PI / 2
    arm.position.set(side * 0.4, 3.85, 0)
    g.add(arm)
    const globe = sph(0.19, 0xf4f2e6, 8, { rough: 0.3, emissive: 0xf4f2e6, emissiveIntensity: 0.12 })
    globe.position.set(side * 0.78, 3.88, 0)
    g.add(globe)
  }
  const finial = cone(0.07, 0.22, 0x29372e, 6)
  finial.position.y = 4.4
  g.add(finial)
  return g
}

/** seawall railing run between two points */
export function railingRun(x1: number, z1: number, x2: number, z2: number, y: number): THREE.Group {
  const g = new THREE.Group()
  const len = Math.hypot(x2 - x1, z2 - z1)
  const railMat = mat(0x33403a, { rough: 0.55, metal: 0.4 })
  const posts = Math.max(2, Math.round(len / 2.2))
  const dx = (x2 - x1) / posts
  const dz = (z2 - z1) / posts
  for (let i = 0; i <= posts; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.05, 0.07), railMat)
    post.position.set(x1 + dx * i, y + 0.52, z1 + dz * i)
    g.add(post)
  }
  for (const h of [1.02, 0.62]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, h === 1.02 ? 0.09 : 0.05, 0.07), railMat)
    rail.position.set((x1 + x2) / 2, y + h, (z1 + z2) / 2)
    rail.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
    g.add(rail)
  }
  return g
}

export function trashBin(): THREE.Group {
  const g = new THREE.Group()
  const body = cyl(0.34, 0.3, 0.85, 0x5d4f3d, 9)
  body.position.y = 0.43
  g.add(body)
  const rim = cyl(0.36, 0.36, 0.08, 0x3c332a, 9)
  rim.position.y = 0.88
  g.add(rim)
  return g
}

export function binoculars(): THREE.Group {
  const g = new THREE.Group()
  const pole = cyl(0.07, 0.09, 1.1, 0x6a7076, 7)
  pole.position.y = 0.55
  g.add(pole)
  const head = box(0.5, 0.34, 0.3, 0xb9c0c6, { rough: 0.35, metal: 0.6 })
  head.position.y = 1.28
  g.add(head)
  for (const side of [-0.13, 0.13]) {
    const eye = cyl(0.07, 0.09, 0.16, 0x33383d, 8)
    eye.rotation.x = Math.PI / 2
    eye.position.set(side, 1.28, 0.2)
    g.add(eye)
  }
  const slot = box(0.16, 0.05, 0.02, 0x33383d)
  slot.position.set(0, 1.36, -0.16)
  g.add(slot)
  return g
}

export interface FlagPole {
  group: THREE.Group
  update(t: number): void
}

export function flagpole(height = 24, flagW = 6.2, flagH = 4): FlagPole {
  const g = new THREE.Group()
  const pole = cyl(0.09, 0.17, height, 0xdfe2e2, 9, { rough: 0.35, metal: 0.6 })
  pole.position.y = height / 2
  g.add(pole)
  const ball = sph(0.32, PALETTE.torchGold, 8, { rough: 0.3, metal: 0.7 })
  ball.position.y = height + 0.3
  g.add(ball)

  // stars & stripes canvas
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 164
  const gg = c.getContext('2d')!
  for (let i = 0; i < 13; i++) {
    gg.fillStyle = i % 2 === 0 ? '#B22234' : '#ffffff'
    gg.fillRect(0, (i * 164) / 13, 256, 164 / 13 + 1)
  }
  gg.fillStyle = '#3C3B6E'
  gg.fillRect(0, 0, 102, 88)
  gg.fillStyle = '#fff'
  for (let r = 0; r < 5; r++)
    for (let s = 0; s < 6; s++) {
      gg.beginPath()
      gg.arc(9 + s * 17 + (r % 2) * 8, 9 + r * 17, 3.2, 0, Math.PI * 2)
      gg.fill()
    }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH, 16, 8)
  const flagMat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 })
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.castShadow = true
  flag.position.set(flagW / 2 + 0.12, height - flagH / 2 - 0.4, 0)
  g.add(flag)

  const basePos = flagGeo.attributes.position.array.slice() as unknown as Float32Array

  return {
    group: g,
    update(t: number) {
      const pos = flagGeo.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = basePos[i * 3]
        const y = basePos[i * 3 + 1]
        const k = (x + flagW / 2) / flagW // 0 at hoist → 1 at fly end
        pos.setZ(i, Math.sin(x * 1.6 + t * 5.2) * 0.34 * k + Math.sin(y * 2.2 + t * 3.6) * 0.13 * k)
      }
      pos.needsUpdate = true
      flagGeo.computeVertexNormals()
    },
  }
}

/** spring tulip bed */
export function flowerBed(w: number, d: number): THREE.Group {
  const g = new THREE.Group()
  const soil = box(w, 0.22, d, 0x584434)
  soil.position.y = 0.11
  g.add(soil)
  const colors = [0xd23b56, 0xe9b64f, 0xe06fa0, 0xf2f3ee]
  const count = Math.floor(w * d * 1.6)
  for (let i = 0; i < count; i++) {
    const stem = cyl(0.015, 0.02, 0.32, 0x4d7a42, 5)
    const x = (rng() - 0.5) * (w - 0.3)
    const z = (rng() - 0.5) * (d - 0.3)
    stem.position.set(x, 0.36, z)
    g.add(stem)
    const headMat = mat(colors[Math.floor(rng() * colors.length)], { rough: 0.8 })
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), headMat)
    head.scale.y = 1.5
    head.position.set(x, 0.56, z)
    g.add(head)
  }
  return g
}

export function cafeTable(withUmbrella = true): THREE.Group {
  const g = new THREE.Group()
  const top = cyl(0.55, 0.55, 0.05, PALETTE.white, 12)
  top.position.y = 0.74
  g.add(top)
  const leg = cyl(0.04, 0.06, 0.74, 0x4a4f54, 7)
  leg.position.y = 0.37
  g.add(leg)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4
    const chair = box(0.42, 0.05, 0.42, PALETTE.navy)
    chair.position.set(Math.cos(a) * 1.0, 0.45, Math.sin(a) * 1.0)
    g.add(chair)
    const back = box(0.42, 0.45, 0.05, PALETTE.navy)
    back.position.set(Math.cos(a) * 1.0 + Math.cos(a) * 0.19, 0.68, Math.sin(a) * 1.0 + Math.sin(a) * 0.19)
    back.rotation.y = -a + Math.PI / 2
    g.add(back)
    for (const [lx, lz] of [
      [-0.16, -0.16],
      [0.16, -0.16],
      [-0.16, 0.16],
      [0.16, 0.16],
    ]) {
      const cl = cyl(0.02, 0.02, 0.45, 0x4a4f54, 5)
      cl.position.set(Math.cos(a) * 1.0 + lx, 0.22, Math.sin(a) * 1.0 + lz)
      g.add(cl)
    }
  }
  if (withUmbrella) {
    const upole = cyl(0.03, 0.03, 2.1, 0xe3ded2, 6)
    upole.position.y = 1.6
    g.add(upole)
    const canopy = cone(1.45, 0.5, PALETTE.canopy, 8)
    canopy.position.y = 2.6
    g.add(canopy)
  }
  return g
}

export function stanchionRow(x1: number, z1: number, x2: number, z2: number): THREE.Group {
  const g = new THREE.Group()
  const len = Math.hypot(x2 - x1, z2 - z1)
  const n = Math.max(1, Math.round(len / 1.8))
  const beltMat = mat(0x32466b, { rough: 0.7 })
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x1 + (x2 - x1) * t
    const z = z1 + (z2 - z1) * t
    const post = cyl(0.045, 0.13, 0.95, 0x8e969c, 7, { rough: 0.4, metal: 0.5 })
    post.position.set(x, 0.48, z)
    g.add(post)
    if (i < n) {
      const nx = x1 + ((x2 - x1) * (i + 0.5)) / n
      const nz = z1 + ((z2 - z1) * (i + 0.5)) / n
      const belt = new THREE.Mesh(new THREE.BoxGeometry(len / n - 0.1, 0.07, 0.03), beltMat)
      belt.position.set(nx, 0.82, nz)
      belt.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
      g.add(belt)
    }
  }
  return g
}

export function plaqueStand(lines: string[]): THREE.Group {
  const g = new THREE.Group()
  const post = box(0.5, 0.9, 0.08, 0x4f4538)
  post.position.y = 0.45
  post.rotation.x = 0
  g.add(post)
  const board = textPlane(lines, { w: 0.95, h: 0.6, bg: '#5d5246', fg: '#f3ecd8' })
  board.position.set(0, 1.05, 0.02)
  board.rotation.x = -0.32
  g.add(board)
  return g
}

/** sculpture-garden bronze on a plinth (Bartholdi, Eiffel, Lazarus, Pulitzer, Laboulaye) */
export function bronzeFigure(name: string): THREE.Group {
  const g = new THREE.Group()
  const plinth = box(1.1, 1.2, 1.1, PALETTE.graniteDark)
  plinth.position.y = 0.6
  g.add(plinth)
  const bronze = mat(0x6b5a3e, { rough: 0.45, metal: 0.7 })
  const bust = new THREE.Group()
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.7, 8), bronze)
  torso.position.y = 1.55
  bust.add(torso)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), bronze)
  head.position.y = 2.1
  bust.add(head)
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.18, 0.34), bronze)
  shoulders.position.y = 1.86
  bust.add(shoulders)
  bust.children.forEach((m) => {
    m.castShadow = true
  })
  g.add(bust)
  const label = textPlane([name], { w: 1.0, h: 0.24, bg: '#3d352b', fg: '#e8ddb8' })
  label.position.set(0, 0.78, 0.56)
  g.add(label)
  return g
}

export function iceCreamKiosk(): THREE.Group {
  const g = new THREE.Group()
  const cart = box(2.2, 1.2, 1.2, PALETTE.white)
  cart.position.y = 0.85
  g.add(cart)
  const trim = box(2.24, 0.18, 1.24, PALETTE.red)
  trim.position.y = 1.5
  g.add(trim)
  for (const [wx, wz] of [
    [-0.85, -0.45],
    [0.85, -0.45],
    [-0.85, 0.45],
    [0.85, 0.45],
  ]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 10), mat(0x3a3f44, { rough: 0.6 }))
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(wx, 0.26, wz)
    g.add(wheel)
  }
  const upole = cyl(0.04, 0.04, 2.3, 0xe3ded2, 6)
  upole.position.set(0.4, 2.4, 0)
  g.add(upole)
  const umbrella = cone(1.7, 0.55, PALETTE.red, 8)
  umbrella.position.set(0.4, 3.55, 0)
  g.add(umbrella)
  const sign = textPlane(['ICE CREAM • SNACKS'], { w: 1.9, h: 0.34, bg: '#c4484a', fg: '#fff' })
  sign.position.set(0, 1.18, 0.62)
  g.add(sign)
  return g
}

export function signBoard(lines: string[], w = 2.4, h = 1.0): THREE.Group {
  const g = new THREE.Group()
  for (const side of [-w / 2 + 0.15, w / 2 - 0.15]) {
    const post = box(0.1, 2.0, 0.1, 0x4f4538)
    post.position.set(side, 1.0, 0)
    g.add(post)
  }
  const board = textPlane(lines, { w, h, bg: '#3e6b50', fg: '#f3ecd8' })
  board.position.set(0, 1.7, 0.06)
  g.add(board)
  return g
}
