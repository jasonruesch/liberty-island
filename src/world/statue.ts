// The Statue of Liberty stack, faithful to the research:
// • Fort Wood — 11-point star granite walls, walkable terreplein
// • Hunt's pedestal — truncated pyramid, Doric loggia, observation balcony
// • The copper lady — 46m, torch raised in her right hand, tablet inscribed
//   JULY IV MDCCLXXVI in her left, 7-ray crown with 25 windows, broken
//   shackles at her feet, raised right heel (she is walking forward), facing SE
// • Interiors — pedestal lobby, elevator, stairs, observation deck at the top
//   of the pedestal, and the double-helix spiral to the crown room.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl, sph, cone, textPlane } from './materials'
import { FORT, STATUE_LEVELS as L } from '../data/layout'
import { mulberry } from './environment'
import type { GameContext } from '../core/context'

export interface StatueBuild {
  group: THREE.Group
  /** world position of the torch flame (for camera framing) */
  torchWorld: THREE.Vector3
  headWorld: THREE.Vector3
  update(dt: number): void
}

const FX = FORT.x
const FZ = FORT.z

function starPoints(outerR: number, innerR: number, points: number, rot = 0): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = (i / (points * 2)) * Math.PI * 2 + rot
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return pts
}

/** lathe with per-vertex fold ripples for the robe */
function foldedLathe(profile: [number, number][], radialSegs: number, folds: number, foldAmp: number): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y))
  const geo = new THREE.LatheGeometry(pts, radialSegs)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const a = Math.atan2(v.z, v.x)
    const r = Math.hypot(v.x, v.z)
    if (r < 0.01) continue
    const ripple = Math.sin(a * folds + v.y * 0.35) * foldAmp * Math.min(1, r / 2)
    const k = (r + ripple) / r
    pos.setX(i, v.x * k)
    pos.setZ(i, v.z * k)
  }
  geo.computeVertexNormals()
  return geo
}

/** limb segment between two points */
function limb(from: THREE.Vector3, to: THREE.Vector3, r1: number, r2: number, color: number): THREE.Mesh {
  const dir = to.clone().sub(from)
  const len = dir.length()
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 9), mat(color))
  m.position.copy(from).addScaledVector(dir, 0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  m.castShadow = true
  return m
}

export function buildStatue(ctx: GameContext): StatueBuild {
  const g = new THREE.Group()
  g.position.set(FX, 0, FZ)
  ctx.scene.add(g)
  const rng = mulberry(1886)

  // ════════════════════════════════════════════════════ FORT WOOD ═══
  const starRot = Math.PI / 22 // a star point toward the west entrance ramp
  const star = starPoints(FORT.starOuterR, FORT.starInnerR, FORT.points, starRot)
  const starShape = new THREE.Shape()
  star.forEach(([x, z], i) => (i === 0 ? starShape.moveTo(x, z) : starShape.lineTo(x, z)))
  starShape.closePath()
  const fortGeo = new THREE.ExtrudeGeometry(starShape, { depth: FORT.wallH, bevelEnabled: false })
  fortGeo.rotateX(-Math.PI / 2) // extrude up
  const fort = new THREE.Mesh(fortGeo, [mat(PALETTE.granite, { rough: 0.95 }), mat(PALETTE.graniteDark, { rough: 0.95 })])
  fort.castShadow = true
  fort.receiveShadow = true
  g.add(fort)

  // world-space star ring (for zones/walls)
  const starWorld = star.map(([x, z]) => [x + FX, z + FZ] as [number, number])
  ctx.colliders.flatPolygon(starWorld, L.terreplein, 2)

  // entrance ramp through the western notch
  const rampOuterX = FX - FORT.starOuterR - 9
  const rampInnerX = FX - FORT.starInnerR + 2
  ctx.colliders.ramp(rampOuterX, FZ, rampInnerX, FZ, 8, 0, L.terreplein, 5)
  const rampLen = rampInnerX - rampOuterX
  const rampMesh = box(rampLen, 1.2, 8, PALETTE.granite)
  rampMesh.position.set((rampOuterX + rampInnerX) / 2 - FX, L.terreplein / 2 - 0.05, 0)
  rampMesh.rotation.z = Math.atan2(L.terreplein, rampLen)
  rampMesh.scale.x = Math.hypot(rampLen, L.terreplein) / rampLen
  g.add(rampMesh)
  // ramp railings (visual) + side walls (collide)
  for (const side of [-4, 4]) {
    ctx.colliders.addWall(rampOuterX, FZ + side, rampInnerX, FZ + side, 0, L.terreplein + 1.2)
    const railV = box(Math.hypot(rampLen, L.terreplein), 1.0, 0.12, PALETTE.graniteDark)
    railV.position.set((rampOuterX + rampInnerX) / 2 - FX, L.terreplein / 2 + 0.6, side)
    railV.rotation.z = Math.atan2(L.terreplein, rampLen)
    g.add(railV)
  }
  // fort step detail at ramp base
  const stepPlinth = box(6, 0.6, 10, PALETTE.graniteDark)
  stepPlinth.position.set(rampOuterX - FX - 2.4, 0.3, 0)
  g.add(stepPlinth)

  // star wall colliders + parapet (skip segments near the ramp mouth)
  for (let i = 0; i < starWorld.length; i++) {
    const a = starWorld[i]
    const b = starWorld[(i + 1) % starWorld.length]
    const midX = (a[0] + b[0]) / 2
    const midZ = (a[1] + b[1]) / 2
    const nearRamp = Math.abs(midZ - FZ) < 7 && midX < FX - FORT.starInnerR + 4 && midX > FX - FORT.starOuterR - 10
    if (!nearRamp) {
      ctx.colliders.addWall(a[0], a[1], b[0], b[1], 0, L.terreplein + 1.3)
      // parapet block
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const par = box(len, 1.1, 0.8, PALETTE.granite)
      par.position.set(midX - FX, L.terreplein + 0.55, midZ - FZ)
      par.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0])
      g.add(par)
    }
  }

  // ══════════════════════════════════════════════════════ PEDESTAL ═══
  // Kelly's concrete foundation berm
  const berm = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 17, 6, 4, 1), mat(PALETTE.concrete, { rough: 1 }))
  berm.rotation.y = Math.PI / 4
  berm.position.y = L.terreplein + 3
  berm.castShadow = true
  berm.receiveShadow = true
  g.add(berm)

  // Hunt pedestal: base block
  const base = new THREE.Mesh(new THREE.CylinderGeometry(11.4, 12.6, 4, 4, 1), mat(PALETTE.pedestal, { rough: 0.92 }))
  base.rotation.y = Math.PI / 4
  base.position.y = L.terreplein + 6 + 2
  base.castShadow = true
  g.add(base)

  // main shaft (truncated pyramid with panels)
  const shaftH = L.pedestalDeck - (L.terreplein + 10) // 38 - 18 = 20
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 10.6, shaftH, 4, 1), mat(PALETTE.pedestal, { rough: 0.92 }))
  shaft.rotation.y = Math.PI / 4
  shaft.position.y = L.terreplein + 10 + shaftH / 2
  shaft.castShadow = true
  g.add(shaft)
  // recessed panels + slit windows on each face
  for (let f = 0; f < 4; f++) {
    const a = (f * Math.PI) / 2
    const panel = box(6.4, shaftH - 4, 0.4, PALETTE.pedestalDark)
    const r = 9.1
    panel.position.set(Math.sin(a) * r, L.terreplein + 10 + shaftH / 2, Math.cos(a) * r)
    panel.rotation.y = a
    g.add(panel)
    const slit = box(0.7, 2.6, 0.2, 0x3c3833)
    slit.position.set(Math.sin(a) * (r + 0.35), L.terreplein + 13, Math.cos(a) * (r + 0.35))
    slit.rotation.y = a
    g.add(slit)
  }

  // Doric loggia level (columns each face) supporting the balcony
  const logH = 5
  const logY = L.pedestalDeck - logH // 33
  const logCore = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 8.2, logH, 4, 1), mat(PALETTE.pedestalDark, { rough: 0.95 }))
  logCore.rotation.y = Math.PI / 4
  logCore.position.y = logY + logH / 2
  g.add(logCore)
  for (let f = 0; f < 4; f++) {
    const a = (f * Math.PI) / 2
    for (let c = -1.5; c <= 1.5; c++) {
      const col = cyl(0.42, 0.5, logH - 0.8, PALETTE.pedestal, 8)
      const r = 8.6
      col.position.set(Math.sin(a) * r + Math.cos(a) * c * 2.4, logY + (logH - 0.8) / 2 + 0.2, Math.cos(a) * r - Math.sin(a) * c * 2.4)
      g.add(col)
    }
  }

  // observation balcony slab + balustrade (walkable ring at L.pedestalDeck)
  const deckSlab = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.4, 0.7, 4, 1), mat(PALETTE.pedestal, { rough: 0.9 }))
  deckSlab.rotation.y = Math.PI / 4
  deckSlab.position.y = L.pedestalDeck - 0.35
  deckSlab.castShadow = true
  g.add(deckSlab)
  const deckHalf = 7.0 // walkable half-extent (square, axis-aligned)
  const blockHalf = 4.6 // upper block half-extent
  // four strip zones forming the ring
  ctx.colliders.flatRect(FX - deckHalf, FZ - deckHalf, FX + deckHalf, FZ - blockHalf, L.pedestalDeck, 6)
  ctx.colliders.flatRect(FX - deckHalf, FZ + blockHalf, FX + deckHalf, FZ + deckHalf, L.pedestalDeck, 6)
  ctx.colliders.flatRect(FX - deckHalf, FZ - blockHalf, FX - blockHalf, FZ + blockHalf, L.pedestalDeck, 6)
  ctx.colliders.flatRect(FX + blockHalf, FZ - blockHalf, FX + deckHalf, FZ + blockHalf, L.pedestalDeck, 6)
  // balustrade visual + containment walls
  const balH = 1.15
  const balPosts: [number, number, number, number][] = [
    [FX - deckHalf, FZ - deckHalf, FX + deckHalf, FZ - deckHalf],
    [FX + deckHalf, FZ - deckHalf, FX + deckHalf, FZ + deckHalf],
    [FX + deckHalf, FZ + deckHalf, FX - deckHalf, FZ + deckHalf],
    [FX - deckHalf, FZ + deckHalf, FX - deckHalf, FZ - deckHalf],
  ]
  for (const [x1, z1, x2, z2] of balPosts) {
    ctx.colliders.addWall(x1, z1, x2, z2, L.pedestalDeck - 1, L.pedestalDeck + balH)
    const len = Math.hypot(x2 - x1, z2 - z1)
    const railTop = box(len, 0.18, 0.3, PALETTE.pedestal)
    railTop.position.set((x1 + x2) / 2 - FX, L.pedestalDeck + balH, (z1 + z2) / 2 - FZ)
    railTop.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
    g.add(railTop)
    const n = Math.floor(len / 1.1)
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const post = cyl(0.09, 0.12, balH, PALETTE.pedestalDark, 6)
      post.position.set(x1 + (x2 - x1) * t - FX, L.pedestalDeck + balH / 2, z1 + (z2 - z1) * t - FZ)
      g.add(post)
    }
  }

  // upper plinth (statue stands on this)
  const plinthH = L.statueBase - L.pedestalDeck // 6
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 4.5, plinthH, 4, 1), mat(PALETTE.pedestal, { rough: 0.92 }))
  plinth.rotation.y = Math.PI / 4
  plinth.position.y = L.pedestalDeck + plinthH / 2
  plinth.castShadow = true
  g.add(plinth)
  // upper block walls on deck
  ctx.colliders.addWall(FX - blockHalf, FZ - blockHalf, FX + blockHalf, FZ - blockHalf, L.pedestalDeck, L.statueBase)
  ctx.colliders.addWall(FX + blockHalf, FZ - blockHalf, FX + blockHalf, FZ + blockHalf, L.pedestalDeck, L.statueBase)
  ctx.colliders.addWall(FX + blockHalf, FZ + blockHalf, FX - blockHalf, FZ + blockHalf, L.pedestalDeck, L.statueBase)
  ctx.colliders.addWall(FX - blockHalf, FZ + blockHalf, FX - blockHalf, FZ - blockHalf, L.pedestalDeck, L.statueBase)

  // pedestal body blockers at terreplein level (so you walk around it)
  const bodyHalf = 11
  ctx.colliders.addWall(FX - bodyHalf, FZ - bodyHalf, FX + bodyHalf, FZ - bodyHalf, L.terreplein, L.pedestalDeck)
  ctx.colliders.addWall(FX + bodyHalf, FZ - bodyHalf, FX + bodyHalf, FZ + bodyHalf, L.terreplein, L.pedestalDeck)
  ctx.colliders.addWall(FX + bodyHalf, FZ + bodyHalf, FX - bodyHalf, FZ + bodyHalf, L.terreplein, L.pedestalDeck)
  // west face has the entrance door — two wall pieces with a gap
  ctx.colliders.addWall(FX - bodyHalf, FZ + bodyHalf, FX - bodyHalf, FZ + 2.2, L.terreplein, L.pedestalDeck)
  ctx.colliders.addWall(FX - bodyHalf, FZ - 2.2, FX - bodyHalf, FZ - bodyHalf, L.terreplein, L.pedestalDeck)

  // entrance portal on the west face
  const portal = new THREE.Group()
  const arch = box(1.2, 6, 6.4, PALETTE.pedestalDark)
  arch.position.set(-bodyHalf - 0.3, L.terreplein + 3, 0)
  portal.add(arch)
  const doorway = box(1.4, 4.6, 4.2, 0x2c2823)
  doorway.position.set(-bodyHalf - 0.25, L.terreplein + 2.3, 0)
  portal.add(doorway)
  const lintel = textPlane(['PEDESTAL ENTRANCE'], { w: 5.4, h: 0.7, bg: '#5d5246', fg: '#f3ecd8' })
  lintel.position.set(-bodyHalf - 0.95, L.terreplein + 5.4, 0)
  lintel.rotation.y = -Math.PI / 2
  portal.add(lintel)
  g.add(portal)

  // ═══════════════════════════════════════════ PEDESTAL INTERIOR ═══
  const interior = new THREE.Group()
  g.add(interior)
  // lobby shell (visible from inside thanks to BackSide)
  const lobbyHalf = 8
  const lobbyH = 7
  const lobbyShell = new THREE.Mesh(
    new THREE.BoxGeometry(lobbyHalf * 2, lobbyH, lobbyHalf * 2),
    mat(0x8d8474, { side: THREE.BackSide, rough: 1 }),
  )
  lobbyShell.position.y = L.lobby + lobbyH / 2
  interior.add(lobbyShell)
  const lobbyFloor = new THREE.Mesh(new THREE.BoxGeometry(lobbyHalf * 2, 0.3, lobbyHalf * 2), mat(0x6e6657, { rough: 0.9 }))
  lobbyFloor.position.y = L.lobby + 0.02
  interior.add(lobbyFloor)
  // interior lobby walls colliders (keep player inside, door gap on west)
  ctx.colliders.addWall(FX - lobbyHalf, FZ - lobbyHalf, FX + lobbyHalf, FZ - lobbyHalf, L.lobby, L.lobby + lobbyH)
  ctx.colliders.addWall(FX + lobbyHalf, FZ - lobbyHalf, FX + lobbyHalf, FZ + lobbyHalf, L.lobby, L.lobby + lobbyH)
  ctx.colliders.addWall(FX + lobbyHalf, FZ + lobbyHalf, FX - lobbyHalf, FZ + lobbyHalf, L.lobby, L.lobby + lobbyH)
  ctx.colliders.addWall(FX - lobbyHalf, FZ + lobbyHalf, FX - lobbyHalf, FZ + 2.2, L.lobby, L.lobby + lobbyH)
  ctx.colliders.addWall(FX - lobbyHalf, FZ - 2.2, FX - lobbyHalf, FZ - lobbyHalf, L.lobby, L.lobby + lobbyH)

  // soft interior light
  const lobbyLight = new THREE.PointLight(0xffe8c4, 95, 34)
  lobbyLight.position.set(FX - FX, L.lobby + 5, FZ - FZ) // local origin
  lobbyLight.position.set(0, L.lobby + 5, 0)
  interior.add(lobbyLight)

  // the empty original-torch plinth + plaque (torch moved to the Museum, 2019)
  const torchPlinth = cyl(1.3, 1.5, 1.1, PALETTE.graniteDark, 8)
  torchPlinth.position.set(2.5, L.lobby + 0.55, -3)
  interior.add(torchPlinth)
  const torchPlaque = textPlane(
    ['THE ORIGINAL TORCH (1886-1984)', 'stood here for decades —', 'now shining in the', 'Statue of Liberty Museum'],
    { w: 3.4, h: 1.6, bg: '#5d5246', fg: '#f3ecd8' },
  )
  torchPlaque.position.set(2.5, L.lobby + 2.6, -3.8)
  interior.add(torchPlaque)

  // info desk
  const desk = box(3.4, 1.1, 1.1, PALETTE.wood)
  desk.position.set(3.5, L.lobby + 0.55, 4)
  interior.add(desk)
  ctx.colliders.addBox(FX + 1.8, FZ + 3.4, FX + 5.2, FZ + 4.6, L.lobby, L.lobby + 1.2)

  // exhibit panels
  const panels = [
    ['FORT WOOD', '11-point star fort, 1811', 'guarding New York Harbor'],
    ['THE PEDESTAL', 'Richard Morris Hunt, 1886', 'funded by the people'],
    ['154 FEET', 'of granite & concrete', 'beneath her sandals'],
  ]
  panels.forEach((lines, i) => {
    const p = textPlane(lines, { w: 3, h: 1.7, bg: '#324a5e', fg: '#f3ecd8' })
    p.position.set(-3 + i * 3.4, L.lobby + 2.6, lobbyHalf - 0.5)
    p.rotation.y = Math.PI
    interior.add(p)
  })

  // ── switchback stairs lobby(8) → deck(38): four ramps with landings ──
  const stairMat = mat(0x77705f, { rough: 0.95 })
  const flights: { x1: number; z1: number; x2: number; z2: number; h1: number; h2: number }[] = []
  const rises = [8, 15.5, 23, 30.5, 38]
  const cornersSeq = [
    [-5.4, 5.4, 5.4, 5.4], // along north inner wall  (local x from -5.4→5.4 at z 5.4)
    [5.4, 5.4, 5.4, -5.4],
    [5.4, -5.4, -5.4, -5.4],
    [-5.4, -5.4, -5.4, 5.4],
  ]
  for (let f = 0; f < 4; f++) {
    const [lx1, lz1, lx2, lz2] = cornersSeq[f]
    flights.push({ x1: FX + lx1, z1: FZ + lz1, x2: FX + lx2, z2: FZ + lz2, h1: rises[f], h2: rises[f + 1] })
  }
  for (const fl of flights) {
    ctx.colliders.ramp(fl.x1, fl.z1, fl.x2, fl.z2, 2.4, fl.h1, fl.h2, 7)
    const len = Math.hypot(fl.x2 - fl.x1, fl.z2 - fl.z1)
    const rise = fl.h2 - fl.h1
    const rampV = new THREE.Mesh(new THREE.BoxGeometry(len, 0.4, 2.4), stairMat)
    rampV.position.set((fl.x1 + fl.x2) / 2 - FX, (fl.h1 + fl.h2) / 2 - 0.2, (fl.z1 + fl.z2) / 2 - FZ)
    rampV.rotation.y = -Math.atan2(fl.z2 - fl.z1, fl.x2 - fl.x1)
    rampV.rotation.z = Math.atan2(rise, len)
    rampV.scale.x = Math.hypot(len, rise) / len
    interior.add(rampV)
    // simple handrail
    const railI = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(len, rise), 0.08, 0.08), mat(0x4a4438, { rough: 0.6 }))
    railI.position.copy(rampV.position)
    railI.position.y += 1.0
    railI.rotation.copy(rampV.rotation)
    interior.add(railI)
  }
  // shaft shell so the climb feels enclosed
  const shaftShell = new THREE.Mesh(
    new THREE.BoxGeometry(13.4, L.pedestalDeck - L.lobby, 13.4),
    mat(0x837a68, { side: THREE.BackSide, rough: 1 }),
  )
  shaftShell.position.y = L.lobby + (L.pedestalDeck - L.lobby) / 2 + 3
  interior.add(shaftShell)
  for (let i = 0; i < 4; i++) {
    const wl = new THREE.PointLight(0xffe2b8, 45, 18)
    wl.position.set(0, 14 + i * 7, 0)
    interior.add(wl)
  }
  // shaft inner walls (containment between flights and the open middle)
  const sh = 5.4 - 1.3
  ctx.colliders.addBox(FX - sh, FZ - sh, FX + sh, FZ + sh, 9.5, L.pedestalDeck) // central block: can't fall through middle

  // deck access opening: hole in the upper block south face → players step out
  // (handled by the wall gap below)
  // re-do upper block south wall with a door gap:
  // (the solid wall added earlier is replaced by two pieces — remove last matching wall)
  // …simpler: add a doorway zone bridging deck and stairs top
  ctx.colliders.flatRect(FX - 2, FZ + blockHalf - 1.4, FX + 2, FZ + blockHalf + 1.2, L.pedestalDeck, 7)

  // elevator pads (lobby ↔ deck)
  const elevDoor = box(2.4, 3.2, 0.3, 0x9aa3a8, { rough: 0.4, metal: 0.6 })
  elevDoor.position.set(-3.5, L.lobby + 1.6, -lobbyHalf + 0.35)
  interior.add(elevDoor)
  const elevSign = textPlane(['ELEVATOR'], { w: 2, h: 0.4, bg: '#324a5e', fg: '#fff' })
  elevSign.position.set(-3.5, L.lobby + 3.6, -lobbyHalf + 0.45)
  interior.add(elevSign)

  // ═══════════════════════════════════════════════════ THE LADY ═══
  const lady = new THREE.Group()
  lady.position.y = L.statueBase
  lady.rotation.y = Math.PI / 4 + Math.PI / 2 // face southeast
  lady.scale.set(1.14, 1, 1.14) // presence: robe nearly as broad as the pedestal top
  g.add(lady)

  const C = PALETTE.copper
  const CL = PALETTE.copperLight
  const CD = PALETTE.copperDark

  // base mound with broken shackle + chain
  const mound = cyl(4.6, 5.2, 1.4, CD, 14)
  mound.position.y = 0.7
  lady.add(mound)
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.18, 6, 10, Math.PI * 1.4), mat(CD))
  shackle.position.set(1.6, 1.55, 2.9)
  shackle.rotation.x = Math.PI / 2.3
  lady.add(shackle)
  for (let i = 0; i < 3; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 5, 8), mat(CD))
    link.position.set(2.4 + i * 0.55, 1.5, 3.1 + i * 0.3)
    link.rotation.set(rng() * 1.2, rng() * 2, i % 2 === 0 ? 0 : Math.PI / 2)
    lady.add(link)
  }

  // robe — folded lathe silhouette
  const robeProfile: [number, number][] = [
    [4.6, 1.2],
    [4.45, 2.2],
    [4.0, 5],
    [3.55, 9],
    [3.2, 13],
    [2.85, 17],
    [2.45, 20.5],
    [2.25, 22.5],
    [2.5, 24.4],
    [2.6, 26],
    [2.1, 27.2],
    [1.05, 27.9],
  ]
  const robe = new THREE.Mesh(foldedLathe(robeProfile, 20, 9, 0.22), mat(C))
  robe.castShadow = true
  robe.receiveShadow = true
  lady.add(robe)

  // palla drape across the torso (her cloak band)
  const drape = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.5, 7, 16, Math.PI * 1.25), mat(CL))
  drape.position.set(0.1, 23.6, 0.1)
  drape.rotation.set(Math.PI / 2, 0, 0.5)
  drape.scale.set(1, 1, 1.6)
  lady.add(drape)
  // skirt fold accents
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    const foldR = 3.1 + (i % 2) * 0.5
    const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 13 + (i % 3) * 2.5, 5), mat(i % 2 ? CL : CD))
    fold.position.set(Math.cos(a) * foldR * 0.92, 8.5, Math.sin(a) * foldR * 0.92)
    fold.rotation.z = Math.cos(a) * 0.1
    fold.rotation.x = -Math.sin(a) * 0.1
    lady.add(fold)
  }

  // feet: left foot forward, right heel raised (she walks!)
  const footL = box(1.5, 0.8, 2.6, CL)
  footL.position.set(-1.3, 1.6, 3.6)
  lady.add(footL)
  for (let tIdx = 0; tIdx < 3; tIdx++) {
    const strap = box(1.52, 0.16, 0.2, CD)
    strap.position.set(-1.3, 1.75, 3.0 + tIdx * 0.7)
    lady.add(strap)
  }
  const footR = box(1.4, 0.7, 2.2, CL)
  footR.position.set(1.5, 2.0, -2.9)
  footR.rotation.x = 0.5 // heel up — moving forward
  lady.add(footR)

  // ── left arm holding the tablet ──
  const shoulderL = new THREE.Vector3(2.1, 25.6, 0.3)
  const elbowL = new THREE.Vector3(3.3, 21.6, 1.6)
  const handL = new THREE.Vector3(3.4, 18.2, 2.6)
  lady.add(limb(shoulderL, elbowL, 1.05, 0.85, C))
  lady.add(limb(elbowL, handL, 0.85, 0.7, CL))
  const elbowBallL = sph(0.92, C, 8)
  elbowBallL.position.copy(elbowL)
  lady.add(elbowBallL)
  const handBallL = sph(0.78, CL, 8)
  handBallL.position.copy(handL)
  lady.add(handBallL)

  // the tablet — JULY IV MDCCLXXVI
  const tablet = new THREE.Group()
  const slab = box(4.0, 6.4, 0.6, C)
  tablet.add(slab)
  const inscription = textPlane(['JULY IV', 'MDCCLXXVI'], { w: 3.4, h: 5.4, bg: '#6fa28e', fg: '#3f6b5b', font: "800 64px Georgia, serif" })
  inscription.position.z = 0.32
  tablet.add(inscription)
  tablet.position.set(3.75, 20.4, 2.9)
  tablet.rotation.set(-0.18, 0.45, 0.12)
  lady.add(tablet)

  // ── right arm raised with the torch ──
  const shoulderR = new THREE.Vector3(-2.2, 25.9, -0.1)
  const elbowR = new THREE.Vector3(-3.6, 30.6, 0.3)
  const wristR = new THREE.Vector3(-3.9, 36.4, 0.1)
  lady.add(limb(shoulderR, elbowR, 1.1, 0.9, C))
  lady.add(limb(elbowR, wristR, 0.9, 0.72, CL))
  const elbowBallR = sph(0.95, C, 8)
  elbowBallR.position.copy(elbowR)
  lady.add(elbowBallR)
  // the falling sleeve at the elbow — iconic silhouette
  const sleeve = new THREE.Mesh(new THREE.ConeGeometry(1.9, 4.4, 9), mat(C))
  sleeve.position.set(-3.45, 28.6, 0.25)
  sleeve.rotation.z = -0.12
  lady.add(sleeve)
  const handR = sph(0.8, CL, 8)
  handR.position.copy(wristR)
  lady.add(handR)

  // torch: handle, gallery ring, gold flame
  const torch = new THREE.Group()
  const handle = cyl(0.34, 0.46, 2.6, CD, 9)
  handle.position.y = 1.1
  torch.add(handle)
  const knop = cyl(0.62, 0.62, 0.35, CL, 9)
  knop.position.y = 2.3
  torch.add(knop)
  const gallery = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.1, 6, 16), mat(CD))
  gallery.rotation.x = Math.PI / 2
  gallery.position.y = 3.0
  torch.add(gallery)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const balRod = cyl(0.045, 0.045, 0.62, CD, 5)
    balRod.position.set(Math.cos(a) * 1.12, 2.7, Math.sin(a) * 1.12)
    torch.add(balRod)
  }
  const torchDeck = cyl(1.05, 1.05, 0.18, CL, 12)
  torchDeck.position.y = 2.42
  torch.add(torchDeck)
  const flame = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 0),
    mat(PALETTE.torchGold, { rough: 0.35, metal: 0.65, emissive: 0xc98a1d, emissiveIntensity: 0.35 }),
  )
  flame.scale.set(0.9, 1.85, 0.9)
  flame.position.y = 4.3
  flame.castShadow = true
  torch.add(flame)
  torch.position.copy(wristR).add(new THREE.Vector3(-0.1, 0.5, 0))
  lady.add(torch)

  // ── head, face, hair, crown ──
  const neck = cyl(0.95, 1.15, 1.6, C, 10)
  neck.position.set(0, 28.2, 0.1)
  lady.add(neck)
  const head = new THREE.Group()
  head.position.set(0, 30.2, 0.15)
  lady.add(head)
  const skull = sph(1.75, CL, 12)
  skull.scale.set(0.95, 1.12, 1.0)
  head.add(skull)
  const jaw = sph(1.1, CL, 10)
  jaw.scale.set(0.82, 0.78, 0.82)
  jaw.position.set(0, -1.15, 0.45)
  head.add(jaw)
  // serene face
  const nose = box(0.34, 0.85, 0.5, CL)
  nose.position.set(0, -0.25, 1.62)
  nose.rotation.x = 0.12
  head.add(nose)
  const brow = box(1.5, 0.22, 0.3, C)
  brow.position.set(0, 0.32, 1.55)
  head.add(brow)
  for (const side of [-1, 1]) {
    const eye = sph(0.21, CD, 7)
    eye.scale.set(1.4, 0.8, 0.5)
    eye.position.set(side * 0.62, 0.06, 1.52)
    head.add(eye)
  }
  const lips = box(0.62, 0.16, 0.2, C)
  lips.position.set(0, -0.85, 1.5)
  head.add(lips)
  const chin = sph(0.4, CL, 8)
  chin.position.set(0, -1.5, 1.05)
  head.add(chin)
  // classical parted hair
  for (const side of [-1, 1]) {
    const wave = sph(0.62, CD, 8)
    wave.scale.set(0.8, 1.15, 1.1)
    wave.position.set(side * 1.35, -0.1, 0.6)
    head.add(wave)
    const wave2 = sph(0.5, CD, 7)
    wave2.position.set(side * 1.1, -0.9, -0.4)
    head.add(wave2)
  }
  const bun = sph(0.75, CD, 8)
  bun.position.set(0, -0.5, -1.45)
  head.add(bun)

  // crown band with 25 windows (canvas) + visor
  const bandC = document.createElement('canvas')
  bandC.width = 512
  bandC.height = 64
  const bg2 = bandC.getContext('2d')!
  bg2.fillStyle = '#7db09b'
  bg2.fillRect(0, 0, 512, 64)
  bg2.fillStyle = '#2f4a40'
  for (let i = 0; i < 25; i++) bg2.fillRect(8 + i * 20, 18, 12, 30)
  const bandTex = new THREE.CanvasTexture(bandC)
  bandTex.colorSpace = THREE.SRGBColorSpace
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(1.92, 1.98, 1.05, 24, 1, true, -Math.PI * 0.72, Math.PI * 1.44),
    new THREE.MeshStandardMaterial({ map: bandTex, side: THREE.DoubleSide, roughness: 0.8 }),
  )
  band.position.set(0, 0.72, 0.1)
  band.rotation.y = Math.PI // open side at the back of her head
  head.add(band)
  // 7 rays
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.55 + (i / 6) * Math.PI * 1.1
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.34, 3.6, 4), mat(CL))
    const dir = new THREE.Vector3(Math.sin(a), 0.55, Math.cos(a)).normalize()
    ray.position.set(0, 1.1, 0).addScaledVector(dir, 2.4)
    ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    ray.castShadow = true
    head.add(ray)
  }

  // ════════════════════════════════════ CROWN CLIMB & CROWN ROOM ═══
  // interior cavity so the climb feels enclosed (BackSide shell)
  const cavity = new THREE.Mesh(
    new THREE.CylinderGeometry(4.6, 5.4, L.crownFloor - L.statueBase + 4, 12, 1, true),
    mat(0x4e5b50, { side: THREE.BackSide, rough: 1 }),
  )
  cavity.position.y = L.statueBase + (L.crownFloor - L.statueBase) / 2
  g.add(cavity)
  // Eiffel's central pylon truss
  const pylonMat = mat(0x5f7468, { rough: 0.5, metal: 0.5 })
  for (const [px, pz] of [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9],
  ]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, L.crownFloor - L.statueBase, 0.28), pylonMat)
    post.position.set(px, L.statueBase + (L.crownFloor - L.statueBase) / 2, pz)
    g.add(post)
  }
  for (let yy = L.statueBase + 2; yy < L.crownFloor; yy += 3.2) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.16), pylonMat)
    brace.position.set(0, yy, -0.9)
    brace.rotation.z = 0.6
    g.add(brace)
    const brace2 = brace.clone()
    brace2.rotation.z = -0.6
    brace2.position.z = 0.9
    g.add(brace2)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.07, 5, 14), pylonMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = yy + 1.2
    g.add(ring)
  }
  for (let i = 0; i < 5; i++) {
    const cl = new THREE.PointLight(0xffe2b8, 40, 15)
    cl.position.set(0, L.statueBase + 4 + i * 6, 0)
    g.add(cl)
  }

  // double-helix stairs: up & down intertwined (classic 162-step climb)
  const helixY0 = L.statueBase + 0.2
  const turns = 8.2
  const pitch = (L.crownFloor - helixY0) / turns
  ctx.colliders.helix(FX, FZ, 1.35, 2.5, helixY0, 0, pitch, turns, 1, 8)
  // helix visual: ribbon of steps
  const stepMat = mat(0x6c8377, { rough: 0.7, metal: 0.3 })
  const stepCount = 162
  const stepGeo = new THREE.BoxGeometry(1.15, 0.09, 0.55)
  const steps = new THREE.InstancedMesh(stepGeo, stepMat, stepCount)
  const tmpM = new THREE.Matrix4()
  const tmpQ = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < stepCount; i++) {
    const tt = i / stepCount
    const a = tt * turns * Math.PI * 2
    const y = helixY0 + tt * (L.crownFloor - helixY0)
    tmpQ.setFromAxisAngle(up, -a)
    tmpM.compose(new THREE.Vector3(Math.cos(a) * 1.92, y, Math.sin(a) * 1.92), tmpQ, new THREE.Vector3(1, 1, 1))
    steps.setMatrixAt(i, tmpM)
  }
  steps.instanceMatrix.needsUpdate = true
  g.add(steps)
  // center column + outer containment
  const column = cyl(1.3, 1.3, L.crownFloor - L.statueBase, 0x55675c, 12)
  column.position.y = L.statueBase + (L.crownFloor - L.statueBase) / 2
  g.add(column)
  ctx.colliders.addCircle(FX, FZ, 1.32, L.statueBase, L.crownFloor + 2)
  // outer ring walls (12 segments, gap at entry angle 0 bottom + top)
  for (let i = 0; i < 12; i++) {
    const a1 = (i / 12) * Math.PI * 2
    const a2 = ((i + 1) / 12) * Math.PI * 2
    if (i === 0) continue // entry/exit gap
    ctx.colliders.addWall(
      FX + Math.cos(a1) * 2.62,
      FZ + Math.sin(a1) * 2.62,
      FX + Math.cos(a2) * 2.62,
      FZ + Math.sin(a2) * 2.62,
      L.statueBase,
      L.crownFloor + 2.2,
    )
  }
  // entry landing from deck → helix (small stair from deck 38 → 44 base)
  ctx.colliders.ramp(FX + 2.0, FZ + blockHalf - 0.5, FX + 3.4, FZ - 2.4, 2.2, L.pedestalDeck, helixY0, 7)
  const entryRamp = box(Math.hypot(1.4, blockHalf - 0.5 + 2.4), 0.3, 2.2, 0x6c8377)
  entryRamp.position.set(2.7, (L.pedestalDeck + helixY0) / 2, (blockHalf - 0.5 - 2.4) / 2)
  entryRamp.rotation.y = -Math.atan2(-2.4 - (blockHalf - 0.5), 1.4)
  entryRamp.rotation.z = Math.atan2(helixY0 - L.pedestalDeck, Math.hypot(1.4, blockHalf - 0.5 + 2.4))
  g.add(entryRamp)
  const climbSign = textPlane(['⬆ CROWN CLIMB', '162 steps — pace yourself!'], { w: 2.6, h: 0.9, bg: '#324a5e', fg: '#fff' })
  climbSign.position.set(2.2, L.pedestalDeck + 2, blockHalf + 0.1)
  g.add(climbSign)

  // crown room platform
  ctx.colliders.flatCircle(FX, FZ, 2.5, L.crownFloor, 9)
  const crownFloorMesh = cyl(2.55, 2.55, 0.25, 0x5d7268, 16)
  crownFloorMesh.position.y = L.crownFloor - 0.12
  g.add(crownFloorMesh)
  // window rail + mullions facing forward (look out through the one-way shell)
  const crownRail = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 6, 18, Math.PI * 1.2), mat(0x46544c, { rough: 0.5, metal: 0.5 }))
  crownRail.rotation.x = Math.PI / 2
  crownRail.rotation.z = Math.PI * 0.65
  crownRail.position.y = L.crownFloor + 1.0
  g.add(crownRail)
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 0.65 + (i / 7) * Math.PI * 1.2
    const mullion = box(0.1, 1.6, 0.1, 0x46544c)
    mullion.position.set(Math.cos(a) * 2.3, L.crownFloor + 1.4, Math.sin(a) * 2.3)
    g.add(mullion)
  }
  const crownPlaque = textPlane(['THE CROWN', '25 windows · 7 rays', 'You made it! 👑'], { w: 2.2, h: 1.0, bg: '#5d5246', fg: '#f3ecd8' })
  crownPlaque.position.set(-1.4, L.crownFloor + 1.7, -1.4)
  crownPlaque.rotation.y = Math.PI * 0.25
  g.add(crownPlaque)
  const crownLight = new THREE.PointLight(0xfff2d8, 55, 11)
  crownLight.position.set(0, L.crownFloor + 2.4, 0)
  g.add(crownLight)

  // ═════════════════════════════════════════════════ interactions ═══
  // elevator: lobby ↔ deck
  ctx.interactables.push({
    x: FX - 3.5,
    z: FZ - lobbyHalf + 1.4,
    y: L.lobby,
    radius: 2.2,
    label: 'Ride elevator to <b>Observation Deck</b>',
    onUse: async () => {
      ctx.audio.elevatorDing()
      await ctx.ui.fade(true, 500)
      const p = ctx.hooks.playerPos()
      p.set(FX, L.pedestalDeck + 0.1, FZ + deckHalf - 1.2)
      await ctx.ui.fade(false, 500)
      ctx.ui.toast('🛗 Pedestal Observation Deck — what a view!')
    },
  })
  ctx.interactables.push({
    x: FX,
    z: FZ + deckHalf - 1.2,
    y: L.pedestalDeck,
    radius: 2.0,
    label: 'Ride elevator down to <b>Lobby</b>',
    onUse: async () => {
      ctx.audio.elevatorDing()
      await ctx.ui.fade(true, 500)
      const p = ctx.hooks.playerPos()
      p.set(FX - 3.5, L.lobby + 0.1, FZ - lobbyHalf + 2.6)
      await ctx.ui.fade(false, 500)
    },
  })
  // torch plinth plaque
  ctx.interactables.push({
    x: FX + 2.5,
    z: FZ - 3,
    y: L.lobby,
    radius: 2.4,
    label: 'Read about the <b>Original Torch</b>',
    onUse: () => {
      ctx.ui.toast('🔥 The original torch stood here for years — since 2019 it lives in the island\'s new museum. Go see it!', 5200)
    },
  })

  // ═══════════════════════════════════════════════════════ update ═══
  let deckToastDone = false
  let crownDone = false
  const torchWorld = new THREE.Vector3()
  const headWorld = new THREE.Vector3()

  const compute = () => {
    flame.getWorldPosition(torchWorld)
    head.getWorldPosition(headWorld)
  }
  compute()

  return {
    group: g,
    torchWorld,
    headWorld,
    update(dt: number): void {
      compute()
      const p = ctx.hooks.playerPos()
      const dx = p.x - FX
      const dz = p.z - FZ
      const distSq = dx * dx + dz * dz
      // flags for audio/birds: inside pedestal/statue volumes
      const insidePedestal = Math.abs(dx) < bodyHalf && Math.abs(dz) < bodyHalf && p.y > L.lobby - 1 && p.y < L.pedestalDeck - 1
      const insideClimb = distSq < 3.2 * 3.2 && p.y >= L.statueBase - 1
      ctx.state.insideStatue = insidePedestal || insideClimb
      // crown goal
      if (!crownDone && distSq < 2.6 * 2.6 && Math.abs(p.y - L.crownFloor) < 1.5) {
        crownDone = true
        ctx.hooks.goalDone('crown', '👑 The Crown!', '162 steps, 25 windows, one unforgettable view.')
      }
      if (!deckToastDone && Math.abs(p.y - L.pedestalDeck) < 1 && distSq < deckHalf * deckHalf * 2) {
        deckToastDone = true
        ctx.ui.toast('🏛️ Observation deck — Manhattan to your northeast, Ellis Island to the north!', 5000)
      }
    },
  }
}
