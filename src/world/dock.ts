// The ferry dock on the island's southwest shore: timber pier with two slips,
// green canopy walkway, bollards, pilings, and the welcome arch.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl, textPlane } from './materials'
import { DOCK, WATER_Y } from '../data/layout'
import { railingRun, bench, signBoard } from './props'
import type { GameContext } from '../core/context'

export const PIER_DECK_Y = 0.55

export function buildDock(ctx: GameContext): THREE.Group {
  const g = new THREE.Group()
  ctx.scene.add(g)

  const rx = DOCK.rootX
  const rz = DOCK.rootZ
  const ex = DOCK.endX
  const ez = DOCK.endZ
  const hw = DOCK.width / 2
  const len = Math.hypot(ex - rx, ez - rz)
  const dirX = (ex - rx) / len
  const dirZ = (ez - rz) / len
  const nx = -dirZ
  const nz = dirX

  // deck slab (planked look: alternating strips)
  for (let i = 0; i < Math.floor(len / 2); i++) {
    const t0 = (i * 2) / len
    const cx = rx + (ex - rx) * t0 + dirX
    const cz = rz + (ez - rz) * t0 + dirZ
    const plank = box(DOCK.width, 0.22, 1.9, i % 2 ? PALETTE.wood : PALETTE.woodLight)
    plank.position.set(cx, PIER_DECK_Y - 0.11, cz)
    plank.rotation.y = -Math.atan2(dirZ, dirX) + Math.PI / 2
    plank.receiveShadow = true
    g.add(plank)
  }

  // walkable zone: flat rotated rect via equal-height ramp + entry ramp from island
  ctx.colliders.ramp(rx - dirX * 2, rz - dirZ * 2, ex, ez, DOCK.width, PIER_DECK_Y, PIER_DECK_Y, 4)
  ctx.colliders.ramp(rx - dirX * 6, rz - dirZ * 6, rx - dirX * 1.5, rz - dirZ * 1.5, 10, 0, PIER_DECK_Y, 4)
  const entryRamp = box(10, 0.18, 5, PALETTE.wood)
  entryRamp.position.set(rx - dirX * 3.8, PIER_DECK_Y / 2 + 0.05, rz - dirZ * 3.8)
  entryRamp.rotation.y = -Math.atan2(dirZ, dirX) + Math.PI / 2
  entryRamp.rotation.x = Math.atan2(PIER_DECK_Y, 5)
  g.add(entryRamp)

  // pilings
  for (let i = 0; i <= Math.floor(len / 6); i++) {
    const t = i / Math.floor(len / 6)
    for (const side of [-1, 1]) {
      const px = rx + (ex - rx) * t + nx * side * (hw - 0.4)
      const pz = rz + (ez - rz) * t + nz * side * (hw - 0.4)
      const pile = cyl(0.28, 0.32, 4.4, 0x6d5a42, 8)
      pile.position.set(px, WATER_Y + 1.4, pz)
      g.add(pile)
    }
  }
  // bollards + cleats along the berth edge (east side)
  for (let i = 1; i < 6; i++) {
    const t = 0.35 + i * 0.1
    const bx = rx + (ex - rx) * t + nx * (hw - 0.7)
    const bz = rz + (ez - rz) * t + nz * (hw - 0.7)
    const bollard = cyl(0.18, 0.24, 0.7, 0x33383d, 8, { rough: 0.5, metal: 0.4 })
    bollard.position.set(bx, PIER_DECK_Y + 0.35, bz)
    g.add(bollard)
  }

  // railings: full west side, east side only outside the berth gap
  g.add(railingRun(rx + nx * -hw, rz + nz * -hw, ex + nx * -hw, ez + nz * -hw, PIER_DECK_Y))
  ctx.colliders.addWall(rx + nx * -hw, rz + nz * -hw, ex + nx * -hw, ez + nz * -hw, PIER_DECK_Y, PIER_DECK_Y + 1.1)
  // pier end railing
  g.add(railingRun(ex + nx * -hw, ez + nz * -hw, ex + nx * hw, ez + nz * hw, PIER_DECK_Y))
  ctx.colliders.addWall(ex + nx * -hw, ez + nz * -hw, ex + nx * hw, ez + nz * hw, PIER_DECK_Y, PIER_DECK_Y + 1.1)
  // east side: berth gap between t 0.3 and 0.85
  const eA: [number, number] = [rx + nx * hw, rz + nz * hw]
  const eGapStart: [number, number] = [rx + (ex - rx) * 0.3 + nx * hw, rz + (ez - rz) * 0.3 + nz * hw]
  const eGapEnd: [number, number] = [rx + (ex - rx) * 0.85 + nx * hw, rz + (ez - rz) * 0.85 + nz * hw]
  const eB: [number, number] = [ex + nx * hw, ez + nz * hw]
  g.add(railingRun(eA[0], eA[1], eGapStart[0], eGapStart[1], PIER_DECK_Y))
  ctx.colliders.addWall(eA[0], eA[1], eGapStart[0], eGapStart[1], PIER_DECK_Y, PIER_DECK_Y + 1.1)
  g.add(railingRun(eGapEnd[0], eGapEnd[1], eB[0], eB[1], PIER_DECK_Y))
  ctx.colliders.addWall(eGapEnd[0], eGapEnd[1], eB[0], eB[1], PIER_DECK_Y, PIER_DECK_Y + 1.1)

  // canopy walkway over the island half of the pier
  for (let i = 0; i <= 4; i++) {
    const t = i * 0.08
    for (const side of [-1, 1]) {
      const px = rx + (ex - rx) * t + nx * side * (hw - 2.2)
      const pz = rz + (ez - rz) * t + nz * side * (hw - 2.2)
      const post = cyl(0.09, 0.11, 3, PALETTE.canopy, 7)
      post.position.set(px, PIER_DECK_Y + 1.5, pz)
      g.add(post)
    }
  }
  const canopyLen = len * 0.36
  const canopy = box(DOCK.width - 3.4, 0.18, canopyLen, PALETTE.canopy)
  canopy.position.set(rx + (ex - rx) * 0.17, PIER_DECK_Y + 3.1, rz + (ez - rz) * 0.17)
  canopy.rotation.y = -Math.atan2(dirZ, dirX) + Math.PI / 2
  canopy.castShadow = true
  g.add(canopy)

  // welcome arch at the island end
  const arch = textPlane(['⛴ STATUE CITY CRUISES — LIBERTY ISLAND ⛴'], { w: 9.5, h: 0.9, bg: '#2e4a66', fg: '#f6f0e2' })
  arch.position.set(rx - dirX * 1.5, PIER_DECK_Y + 3.9, rz - dirZ * 1.5)
  arch.rotation.y = -Math.atan2(dirZ, dirX) - Math.PI / 2
  g.add(arch)

  // benches on the pier
  for (const t of [0.45, 0.6, 0.75]) {
    const b = bench()
    b.position.set(rx + (ex - rx) * t + nx * -(hw - 1.4), PIER_DECK_Y, rz + (ez - rz) * t + nz * -(hw - 1.4))
    b.rotation.y = -Math.atan2(dirZ, dirX)
    g.add(b)
  }

  // departure board
  const board = signBoard(['NEXT FERRY → BATTERY, MANHATTAN', 'Boarding at the east slip'], 4.6, 1.1)
  board.position.set(rx + (ex - rx) * 0.28 + nx * -(hw - 1.8), PIER_DECK_Y, rz + (ez - rz) * 0.28 + nz * -(hw - 1.8))
  board.rotation.y = -Math.atan2(dirZ, dirX) - Math.PI / 2
  g.add(board)

  return g
}
