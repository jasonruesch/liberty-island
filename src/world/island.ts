// Liberty Island landmass: seawall-edged terrain, pavement network, the
// promenade ring with railings/benches/lamps, Flagpole Plaza, the September 11
// Memorial Grove, the sculpture garden, lawns, trees and spring flowers.

import * as THREE from 'three'
import { PALETTE, mat, textPlane } from './materials'
import {
  ISLAND_OUTLINE,
  PATHS,
  insetOutline,
  PROMENADE_INSET,
  PROMENADE_WIDTH,
  FLAG_PLAZA,
  SCULPTURE_GARDEN,
  MEMORIAL_GROVE,
  DOCK,
  SERVICE_PIER,
  FORT,
  BUILDINGS,
  WATER_Y,
} from '../data/layout'
import {
  londonPlane,
  bench,
  lampPost,
  railingRun,
  trashBin,
  binoculars,
  flagpole,
  flowerBed,
  bronzeFigure,
  plaqueStand,
  signBoard,
  type FlagPole,
} from './props'
import { mulberry } from './environment'
import type { GameContext } from '../core/context'

export interface Island {
  group: THREE.Group
  update(dt: number, t: number): void
}

/** ribbon strip along a polyline (used for paths & promenade) */
function ribbon(pts: [number, number][], width: number, y: number, color: number, closed = false): THREE.Mesh {
  const p = closed ? [...pts, pts[0]] : pts
  const n = p.length
  const positions: number[] = []
  const indices: number[] = []
  const half = width / 2
  const normals: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const prev = p[Math.max(0, i - 1)]
    const next = p[Math.min(n - 1, i + 1)]
    const dx = next[0] - prev[0]
    const dz = next[1] - prev[1]
    const len = Math.hypot(dx, dz) || 1
    normals.push([-dz / len, dx / len])
  }
  for (let i = 0; i < n; i++) {
    const [x, z] = p[i]
    const [nx, nz] = normals[i]
    positions.push(x + nx * half, y, z + nz * half, x - nx * half, y, z - nz * half)
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, mat(color, { flat: false, rough: 0.95 }))
  mesh.receiveShadow = true
  return mesh
}

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax
  const abz = bz - az
  const len2 = abx * abx + abz * abz || 1
  let t = ((px - ax) * abx + (pz - az) * abz) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t))
}

function nearAnyPath(x: number, z: number, margin: number): boolean {
  for (const path of PATHS) {
    for (let i = 0; i < path.pts.length - 1; i++) {
      if (distToSegment(x, z, path.pts[i][0], path.pts[i][1], path.pts[i + 1][0], path.pts[i + 1][1]) < path.width / 2 + margin)
        return true
    }
  }
  return false
}

export function buildIsland(ctx: GameContext): Island {
  const g = new THREE.Group()
  ctx.scene.add(g)
  const rng = mulberry(2026)

  // ------------------------------------------------------- landmass ---
  const shape = new THREE.Shape()
  ISLAND_OUTLINE.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, z)
    else shape.lineTo(x, z)
  })
  shape.closePath()
  const landGeo = new THREE.ExtrudeGeometry(shape, { depth: 3.4, bevelEnabled: false })
  landGeo.rotateX(Math.PI / 2) // shape Y → world Z, extrusion goes down
  const land = new THREE.Mesh(landGeo, [
    mat(PALETTE.grass, { flat: false, rough: 1 }),
    mat(PALETTE.seawall, { rough: 0.95 }),
  ])
  land.receiveShadow = true
  land.castShadow = false
  g.add(land)

  // granite seawall cap ring + white foam at the waterline
  g.add(ribbon(insetOutline(0.5), 1.6, 0.04, PALETTE.graniteDark, true))
  const foam = ribbon(insetOutline(-1.2), 2.6, WATER_Y + 0.25, PALETTE.foam, true)
  ;(foam.material as THREE.MeshStandardMaterial).transparent = true
  ;(foam.material as THREE.MeshStandardMaterial).opacity = 0.55
  g.add(foam)

  // light grass patches for variety
  for (let i = 0; i < 40; i++) {
    const x = (rng() - 0.5) * 380
    const z = (rng() - 0.5) * 170
    if (nearAnyPath(x, z, 1)) continue
    const patch = new THREE.Mesh(new THREE.CircleGeometry(2 + rng() * 5, 8), mat(PALETTE.grassLight, { flat: false, rough: 1 }))
    patch.rotation.x = -Math.PI / 2
    patch.position.set(x, 0.012, z)
    patch.receiveShadow = true
    g.add(patch)
  }

  // ---------------------------------------------------- ground zones ---
  ctx.colliders.flatPolygon(ISLAND_OUTLINE, 0, 0)

  // boundary railings + walls (skip gaps at dock root and service pier)
  const rail = insetOutline(0.9)
  for (let i = 0; i < rail.length; i++) {
    const a = rail[i]
    const b = rail[(i + 1) % rail.length]
    const midX = (a[0] + b[0]) / 2
    const midZ = (a[1] + b[1]) / 2
    const nearDock = Math.hypot(midX - DOCK.rootX, midZ - DOCK.rootZ) < 18
    const nearPier = Math.hypot(midX - SERVICE_PIER.rootX, midZ - SERVICE_PIER.rootZ) < 14
    if (nearDock || nearPier) continue
    g.add(railingRun(a[0], a[1], b[0], b[1], 0))
    ctx.colliders.addWall(a[0], a[1], b[0], b[1], -0.5, 1.05)
  }

  // ------------------------------------------------------ pavements ---
  for (const path of PATHS) g.add(ribbon(path.pts, path.width, 0.02, PALETTE.path))
  g.add(ribbon(insetOutline(PROMENADE_INSET), PROMENADE_WIDTH, 0.02, PALETTE.path, true))

  // Flagpole Plaza disc + ring
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(FLAG_PLAZA.r, 28), mat(PALETTE.path, { flat: false, rough: 0.95 }))
  plaza.rotation.x = -Math.PI / 2
  plaza.position.set(FLAG_PLAZA.x, 0.025, FLAG_PLAZA.z)
  plaza.receiveShadow = true
  g.add(plaza)
  const plazaRing = new THREE.Mesh(
    new THREE.RingGeometry(FLAG_PLAZA.r - 1.2, FLAG_PLAZA.r, 28),
    mat(PALETTE.pathEdge, { flat: false, rough: 0.95 }),
  )
  plazaRing.rotation.x = -Math.PI / 2
  plazaRing.position.set(FLAG_PLAZA.x, 0.03, FLAG_PLAZA.z)
  g.add(plazaRing)

  // -------------------------------------------------------- flagpole ---
  const pole: FlagPole = flagpole(24)
  pole.group.position.set(FLAG_PLAZA.x, 0, FLAG_PLAZA.z)
  g.add(pole.group)
  ctx.colliders.addCircle(FLAG_PLAZA.x, FLAG_PLAZA.z, 0.5)
  const polePlaque = plaqueStand(['FLAGPOLE PLAZA', 'Old Glory has flown here', 'since 1886'])
  polePlaque.position.set(FLAG_PLAZA.x + 2.5, 0, FLAG_PLAZA.z + 2.5)
  polePlaque.rotation.y = -2.3
  g.add(polePlaque)

  // flower arcs around the plaza
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.45
    const bedG = flowerBed(6, 1.6)
    bedG.position.set(FLAG_PLAZA.x + Math.cos(a) * (FLAG_PLAZA.r + 2.4), 0, FLAG_PLAZA.z + Math.sin(a) * (FLAG_PLAZA.r + 2.4))
    bedG.rotation.y = -a + Math.PI / 2
    g.add(bedG)
  }

  // -------------------------------------------------- promenade kit ---
  const prom = insetOutline(PROMENADE_INSET)
  let benchCount = 0
  for (let i = 0; i < prom.length; i++) {
    const a = prom[i]
    const b = prom[(i + 1) % prom.length]
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1])
    const steps = Math.max(1, Math.floor(segLen / 21))
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps
      const x = a[0] + (b[0] - a[0]) * t
      const z = a[1] + (b[1] - a[1]) * t
      if (Math.hypot(x - DOCK.rootX, z - DOCK.rootZ) < 22) continue
      if (Math.hypot(x - SERVICE_PIER.rootX, z - SERVICE_PIER.rootZ) < 16) continue
      if (Math.hypot(x - FORT.x, z - FORT.z) < FORT.starOuterR + 6) continue
      // face the water: outward normal
      const outA = Math.atan2(z - -5, x - 0)
      benchCount++
      if (benchCount % 2 === 0) {
        const bn = bench()
        bn.position.set(x, 0, z)
        bn.rotation.y = -outA + Math.PI / 2
        g.add(bn)
        ctx.colliders.addBox(x - 1, z - 0.5, x + 1, z + 0.5, 0, 1.1)
        if (benchCount % 6 === 0) {
          const bin = trashBin()
          bin.position.set(x + Math.cos(outA + 1.2) * 1.8, 0, z + Math.sin(outA + 1.2) * 1.8)
          g.add(bin)
          ctx.colliders.addCircle(bin.position.x, bin.position.z, 0.4)
        }
      } else {
        const lamp = lampPost()
        lamp.position.set(x, 0, z)
        g.add(lamp)
        ctx.colliders.addCircle(x, z, 0.18)
      }
    }
  }

  // coin binoculars at the postcard viewpoints
  const binSpots: [number, number, number][] = [
    [150, -70, Math.atan2(-1150 - -70, 1050 - 150)], // facing Manhattan
    [205, -4, 0.2],
    [-30, 86, Math.PI * 0.5],
    [-196, 18, Math.PI * 1.05],
  ]
  for (const [x, z, _a] of binSpots) {
    const bino = binoculars()
    bino.position.set(x, 0, z)
    bino.rotation.y = Math.atan2(x - 0, z - -5)
    g.add(bino)
    ctx.colliders.addCircle(x, z, 0.3)
  }

  // ------------------------------------------------------- the Mall ---
  // tree-lined main walk: flanking trees along the first PATHS polyline
  const mall = PATHS[0].pts
  for (let i = 0; i < mall.length - 1; i++) {
    const [ax, az] = mall[i]
    const [bx, bz] = mall[i + 1]
    const segLen = Math.hypot(bx - ax, bz - az)
    const steps = Math.floor(segLen / 13)
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps
      const x = ax + (bx - ax) * t
      const z = az + (bz - az) * t
      const dx = (bx - ax) / segLen
      const dz = (bz - az) / segLen
      for (const side of [-1, 1]) {
        const tx = x + -dz * side * (PATHS[0].width / 2 + 2.4)
        const tz = z + dx * side * (PATHS[0].width / 2 + 2.4)
        if (Math.hypot(tx - FORT.x, tz - FORT.z) < FORT.starOuterR + 4) continue
        if (Math.hypot(tx - BUILDINGS.cafePlaza.x, tz - BUILDINGS.cafePlaza.z) < BUILDINGS.cafePlaza.r) continue
        const tree = londonPlane(1 + rng() * 0.3)
        tree.position.set(tx, 0, tz)
        g.add(tree)
        ctx.colliders.addCircle(tx, tz, 0.32)
      }
    }
  }

  // scattered lawn trees
  for (let i = 0; i < 26; i++) {
    const x = (rng() - 0.5) * 360
    const z = (rng() - 0.5) * 160
    if (nearAnyPath(x, z, 3)) continue
    if (Math.hypot(x - FORT.x, z - FORT.z) < FORT.starOuterR + 7) continue
    if (Math.hypot(x - FLAG_PLAZA.x, z - FLAG_PLAZA.z) < FLAG_PLAZA.r + 4) continue
    if (Math.hypot(x - BUILDINGS.museum.x, z - BUILDINGS.museum.z) < 38) continue
    if (Math.hypot(x - BUILDINGS.cafe.x, z - BUILDINGS.cafe.z) < 26) continue
    if (Math.hypot(x - BUILDINGS.giftPavilion.x, z - BUILDINGS.giftPavilion.z) < 20) continue
    if (Math.hypot(x - MEMORIAL_GROVE.x, z - MEMORIAL_GROVE.z) < 26) continue
    const tree = londonPlane(0.9 + rng() * 0.5)
    tree.position.set(x, 0, z)
    g.add(tree)
    ctx.colliders.addCircle(x, z, 0.32)
  }

  // --------------------------------------- September 11 Memorial Grove ---
  for (let r = 0; r < MEMORIAL_GROVE.rows; r++) {
    for (let c = 0; c < MEMORIAL_GROVE.cols; c++) {
      const x = MEMORIAL_GROVE.x + (c - (MEMORIAL_GROVE.cols - 1) / 2) * 9
      const z = MEMORIAL_GROVE.z + (r - (MEMORIAL_GROVE.rows - 1) / 2) * 8
      const tree = londonPlane(0.85)
      tree.position.set(x, 0, z)
      g.add(tree)
      ctx.colliders.addCircle(x, z, 0.3)
    }
  }
  const grovePlaque = plaqueStand(['SEPTEMBER 11', 'MEMORIAL GROVE', 'In remembrance'])
  grovePlaque.position.set(MEMORIAL_GROVE.x, 0, MEMORIAL_GROVE.z + 14)
  grovePlaque.rotation.y = Math.PI
  g.add(grovePlaque)

  // ------------------------------------------------- sculpture garden ---
  const honorees = ['F.A. BARTHOLDI', 'G. EIFFEL', 'E. LAZARUS', 'J. PULITZER', 'É. LABOULAYE']
  honorees.forEach((name, i) => {
    const a = Math.PI * 0.75 + (i / (honorees.length - 1)) * Math.PI * 0.5
    const x = SCULPTURE_GARDEN.x + Math.cos(a) * 10
    const z = SCULPTURE_GARDEN.z + Math.sin(a) * 10
    const fig = bronzeFigure(name)
    fig.position.set(x, 0, z)
    fig.lookAt(SCULPTURE_GARDEN.x, 0, SCULPTURE_GARDEN.z)
    g.add(fig)
    ctx.colliders.addCircle(x, z, 0.7)
  })
  const sgPlaque = plaqueStand(['SCULPTURE GARDEN', 'Honoring those who', 'created the Statue'])
  sgPlaque.position.set(SCULPTURE_GARDEN.x, 0, SCULPTURE_GARDEN.z + 3)
  g.add(sgPlaque)

  // welcome sign by the dock
  const welcome = signBoard(['LIBERTY ISLAND', 'Statue of Liberty National Monument', 'National Park Service'], 4.4, 1.3)
  welcome.position.set(DOCK.rootX + 8, 0, DOCK.rootZ - 10)
  welcome.rotation.y = 0.5
  g.add(welcome)

  // a few flower beds along the museum approach + café plaza
  const beds: [number, number, number][] = [
    [-158, -16, 0.4],
    [-100, 44, -0.3],
    [-64, 60, 0.2],
    [-12, 30, -0.5],
  ]
  for (const [x, z, r] of beds) {
    const bed = flowerBed(4.5, 1.4)
    bed.position.set(x, 0, z)
    bed.rotation.y = r
    g.add(bed)
  }

  return {
    group: g,
    update(dt: number, t: number): void {
      pole.update(t)
    },
  }
}
