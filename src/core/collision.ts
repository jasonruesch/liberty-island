// Walkable-ground sampling + simple horizontal collision.
// The world registers ground zones (flat regions, ramps, helix stairs) and
// blockers (boxes, circles, wall segments). The player/NPCs query them.

export interface GroundZone {
  /** higher priority wins ties */
  priority: number
  contains(x: number, z: number): boolean
  /** ground height at x,z — currentY lets stacked zones (helix turns) disambiguate */
  heightAt(x: number, z: number, currentY: number): number
}

export interface BoxBlocker {
  kind: 'box'
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** vertical extent so overpasses don't block walkways below */
  minY: number
  maxY: number
}

export interface CircleBlocker {
  kind: 'circle'
  x: number
  z: number
  r: number
  minY: number
  maxY: number
}

export interface WallBlocker {
  kind: 'wall'
  x1: number
  z1: number
  x2: number
  z2: number
  minY: number
  maxY: number
}

export type Blocker = BoxBlocker | CircleBlocker | WallBlocker

const STEP_UP = 0.6

export class ColliderWorld {
  zones: GroundZone[] = []
  blockers: Blocker[] = []

  addZone(zone: GroundZone): void {
    this.zones.push(zone)
  }

  flatRect(x1: number, z1: number, x2: number, z2: number, h: number, priority = 1): void {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minZ = Math.min(z1, z2)
    const maxZ = Math.max(z1, z2)
    this.addZone({
      priority,
      contains: (x, z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ,
      heightAt: () => h,
    })
  }

  flatCircle(cx: number, cz: number, r: number, h: number, priority = 1): void {
    const r2 = r * r
    this.addZone({
      priority,
      contains: (x, z) => (x - cx) * (x - cx) + (z - cz) * (z - cz) <= r2,
      heightAt: () => h,
    })
  }

  flatPolygon(points: [number, number][], h: number, priority = 0): void {
    this.addZone({
      priority,
      contains: (x, z) => pointInPolygon(x, z, points),
      heightAt: () => h,
    })
  }

  /** straight ramp inside a rect, height interpolated from (x1,z1)-side h1 to (x2,z2)-side h2 */
  ramp(x1: number, z1: number, x2: number, z2: number, width: number, h1: number, h2: number, priority = 3): void {
    const dx = x2 - x1
    const dz = z2 - z1
    const len2 = dx * dx + dz * dz
    const len = Math.sqrt(len2)
    const nx = -dz / len
    const nz = dx / len
    this.addZone({
      priority,
      contains: (x, z) => {
        const t = ((x - x1) * dx + (z - z1) * dz) / len2
        if (t < -0.02 || t > 1.02) return false
        const side = (x - x1) * nx + (z - z1) * nz
        return Math.abs(side) <= width / 2
      },
      heightAt: (x, z) => {
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / len2))
        return h1 + (h2 - h1) * t
      },
    })
  }

  /**
   * Spiral stair as a smooth helix ramp around a vertical axis.
   * From angle a0 at height y0, climbing `pitch` per full turn for `turns` turns.
   * Walkable annulus between rInner and rOuter.
   */
  helix(
    cx: number,
    cz: number,
    rInner: number,
    rOuter: number,
    y0: number,
    a0: number,
    pitch: number,
    turns: number,
    dir: 1 | -1 = 1,
    priority = 4,
  ): void {
    const yTop = y0 + pitch * turns
    this.addZone({
      priority,
      contains: (x, z) => {
        const d2 = (x - cx) * (x - cx) + (z - cz) * (z - cz)
        return d2 >= rInner * rInner && d2 <= rOuter * rOuter
      },
      heightAt: (x, z, currentY) => {
        let a = Math.atan2(z - cz, x - cx) * dir - a0
        a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const frac = a / (Math.PI * 2)
        // prefer the highest walkable turn (≤ step reach); fall back to the
        // closest turn so drops from above still land on a step
        let bestWalkable = -Infinity
        let closest = y0 + frac * pitch
        let closestD = Math.abs(closest - currentY)
        for (let n = 0; n <= turns; n++) {
          const h = y0 + (frac + n) * pitch
          if (h > yTop + 0.01) break
          if (h <= currentY + 0.55 && h > bestWalkable) bestWalkable = h
          const d = Math.abs(h - currentY)
          if (d < closestD) {
            closestD = d
            closest = h
          }
        }
        const pick = bestWalkable > -Infinity ? bestWalkable : closest
        return Math.min(pick, yTop)
      },
    })
  }

  addBox(minX: number, minZ: number, maxX: number, maxZ: number, minY = -100, maxY = 100): void {
    this.blockers.push({ kind: 'box', minX, maxX, minZ, maxZ, minY, maxY })
  }

  addCircle(x: number, z: number, r: number, minY = -100, maxY = 100): void {
    this.blockers.push({ kind: 'circle', x, z, r, minY, maxY })
  }

  addWall(x1: number, z1: number, x2: number, z2: number, minY = -100, maxY = 100): void {
    this.blockers.push({ kind: 'wall', x1, z1, x2, z2, minY, maxY })
  }

  /** wall ring around a polygon (keeps walkers inside / outside) */
  addPolygonWalls(points: [number, number][], minY = -100, maxY = 100): void {
    for (let i = 0; i < points.length; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      this.addWall(a[0], a[1], b[0], b[1], minY, maxY)
    }
  }

  /**
   * Ground height at x,z reachable from currentY (steps up to STEP_UP, any drop).
   * Returns null when nothing supports that point (i.e. over water / out of bounds).
   */
  groundAt(x: number, z: number, currentY: number): number | null {
    let best: number | null = null
    let bestPriority = -Infinity
    for (const zone of this.zones) {
      if (!zone.contains(x, z)) continue
      const h = zone.heightAt(x, z, currentY)
      if (h > currentY + STEP_UP) continue
      if (best === null || h > best + 0.001 || (Math.abs(h - best) <= 0.001 && zone.priority > bestPriority)) {
        if (best === null || h > best - 0.001) {
          best = Math.max(best ?? -Infinity, h)
          bestPriority = zone.priority
        }
      }
    }
    return best
  }

  /** resolve horizontal movement with radius r; returns corrected position */
  resolve(x: number, z: number, y: number, r: number): { x: number; z: number } {
    let px = x
    let pz = z
    for (let iter = 0; iter < 3; iter++) {
      let moved = false
      for (const b of this.blockers) {
        if (y + 0.9 < b.minY || y + 0.3 > b.maxY) continue
        if (b.kind === 'box') {
          const cx = Math.max(b.minX, Math.min(px, b.maxX))
          const cz = Math.max(b.minZ, Math.min(pz, b.maxZ))
          const dx = px - cx
          const dz = pz - cz
          const d2 = dx * dx + dz * dz
          if (d2 < r * r) {
            if (d2 < 1e-9) {
              // inside the box: push out the nearest face
              const dl = px - b.minX
              const dr = b.maxX - px
              const dt = pz - b.minZ
              const db = b.maxZ - pz
              const m = Math.min(dl, dr, dt, db)
              if (m === dl) px = b.minX - r
              else if (m === dr) px = b.maxX + r
              else if (m === dt) pz = b.minZ - r
              else pz = b.maxZ + r
            } else {
              const d = Math.sqrt(d2)
              px = cx + (dx / d) * r
              pz = cz + (dz / d) * r
            }
            moved = true
          }
        } else if (b.kind === 'circle') {
          const dx = px - b.x
          const dz = pz - b.z
          const rr = r + b.r
          const d2 = dx * dx + dz * dz
          if (d2 < rr * rr && d2 > 1e-9) {
            const d = Math.sqrt(d2)
            px = b.x + (dx / d) * rr
            pz = b.z + (dz / d) * rr
            moved = true
          }
        } else {
          // segment wall
          const ax = b.x1
          const az = b.z1
          const bx = b.x2
          const bz = b.z2
          const abx = bx - ax
          const abz = bz - az
          const len2 = abx * abx + abz * abz
          if (len2 < 1e-9) continue
          let t = ((px - ax) * abx + (pz - az) * abz) / len2
          t = Math.max(0, Math.min(1, t))
          const cx = ax + abx * t
          const cz = az + abz * t
          const dx = px - cx
          const dz = pz - cz
          const d2 = dx * dx + dz * dz
          if (d2 < r * r && d2 > 1e-9) {
            const d = Math.sqrt(d2)
            px = cx + (dx / d) * r
            pz = cz + (dz / d) * r
            moved = true
          }
        }
      }
      if (!moved) break
    }
    return { x: px, z: pz }
  }
}

export function pointInPolygon(x: number, z: number, pts: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0]
    const zi = pts[i][1]
    const xj = pts[j][0]
    const zj = pts[j][1]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
