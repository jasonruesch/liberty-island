// Helpers for rotated buildings: transform local wall segments / floor zones
// into world space and register them with the collider world.

import type { ColliderWorld } from '../core/collision'

export interface Placement {
  cx: number
  cz: number
  rotY: number
}

export function l2w(p: Placement, lx: number, lz: number): [number, number] {
  const c = Math.cos(p.rotY)
  const s = Math.sin(p.rotY)
  return [p.cx + lx * c + lz * s, p.cz - lx * s + lz * c]
}

export function addWallsLocal(
  col: ColliderWorld,
  p: Placement,
  segs: [number, number, number, number][],
  minY: number,
  maxY: number,
): void {
  for (const [x1, z1, x2, z2] of segs) {
    const a = l2w(p, x1, z1)
    const b = l2w(p, x2, z2)
    col.addWall(a[0], a[1], b[0], b[1], minY, maxY)
  }
}

/** rotated rectangular ground zone */
export function addRotRectZone(
  col: ColliderWorld,
  p: Placement,
  hx: number,
  hz: number,
  h: number,
  priority = 2,
): void {
  const c = Math.cos(p.rotY)
  const s = Math.sin(p.rotY)
  col.addZone({
    priority,
    contains(x: number, z: number): boolean {
      const dx = x - p.cx
      const dz = z - p.cz
      const lx = dx * c - dz * s
      const lz = dx * s + dz * c
      return Math.abs(lx) <= hx && Math.abs(lz) <= hz
    },
    heightAt: () => h,
  })
}

/** rotated box blocker approximated by its four wall segments */
export function addBoxLocal(
  col: ColliderWorld,
  p: Placement,
  lx: number,
  lz: number,
  hx: number,
  hz: number,
  minY: number,
  maxY: number,
): void {
  const corners: [number, number][] = [
    [lx - hx, lz - hz],
    [lx + hx, lz - hz],
    [lx + hx, lz + hz],
    [lx - hx, lz + hz],
  ]
  for (let i = 0; i < 4; i++) {
    const a = l2w(p, corners[i][0], corners[i][1])
    const b = l2w(p, corners[(i + 1) % 4][0], corners[(i + 1) % 4][1])
    col.addWall(a[0], a[1], b[0], b[1], minY, maxY)
  }
}
