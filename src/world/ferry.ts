// The Statue City Cruises-style double-deck ferry "MISS LIBERTY": white hull,
// blue trim, open bow & stern, upper sun deck with pilothouse. Sails the
// arrival route in from the harbor (sweeping past the statue's face), docks at
// the SW pier, lowers its gangway, and later sails you home.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl, textPlane } from './materials'
import { FERRY_ARRIVAL, FERRY_DEPART, DOCK, WATER_Y } from '../data/layout'
import { PIER_DECK_Y } from './dock'
import { railingRun, flagpole } from './props'
import type { GameContext } from '../core/context'

export type FerryState = 'inbound' | 'docked' | 'outbound' | 'away'

export const MAIN_DECK = 1.7 // local deck heights
export const UPPER_DECK = 4.6

export class Ferry {
  group = new THREE.Group()
  state: FerryState = 'inbound'
  progress = 0
  private curve: THREE.CatmullRomCurve3
  private departCurve: THREE.CatmullRomCurve3
  private duration = 52 // seconds for the arrival cruise
  private gangway: THREE.Group
  private flag: ReturnType<typeof flagpole>
  private wake: { mesh: THREE.Mesh; life: number }[] = []
  private wakePool: THREE.Mesh[] = []
  private hornDone = new Set<string>()
  onDocked: (() => void) | null = null
  onAway: (() => void) | null = null

  constructor(private ctx: GameContext) {
    const toV3 = (pts: [number, number][]) => pts.map(([x, z]) => new THREE.Vector3(x, WATER_Y + 1.1, z))
    this.curve = new THREE.CatmullRomCurve3(toV3(FERRY_ARRIVAL), false, 'catmullrom', 0.12)
    this.departCurve = new THREE.CatmullRomCurve3(toV3(FERRY_DEPART), false, 'catmullrom', 0.12)

    const g = this.group
    ctx.scene.add(g)

    // ------------------------------------------------------------ hull ---
    const hull = box(8, 2.6, 21, PALETTE.white)
    hull.position.y = 0.3
    g.add(hull)
    const bow = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.4, 2.6, 10, 1, false, 0, Math.PI), mat(PALETTE.white))
    bow.position.set(0, 0.3, -10.5)
    bow.rotation.y = Math.PI / 2
    g.add(bow)
    const stripe = box(8.1, 0.5, 21.5, PALETTE.navy)
    stripe.position.y = 1.2
    g.add(stripe)
    const rub = box(8.2, 0.3, 21.2, 0x9aa3a8)
    rub.position.y = -0.6
    g.add(rub)
    const name1 = textPlane(['MISS LIBERTY'], { w: 4.6, h: 0.55, bg: '#f2f3ee', fg: '#2e4a66' })
    name1.position.set(-4.06, 0.5, -6)
    name1.rotation.y = -Math.PI / 2
    g.add(name1)
    const name2 = textPlane(['MISS LIBERTY'], { w: 4.6, h: 0.55, bg: '#f2f3ee', fg: '#2e4a66' })
    name2.position.set(4.06, 0.5, -6)
    name2.rotation.y = Math.PI / 2
    g.add(name2)

    // ------------------------------------------------------ main deck ---
    const deck = box(7.6, 0.18, 20.4, 0x8aa0ad)
    deck.position.y = MAIN_DECK - 0.09
    g.add(deck)
    // mid cabin
    const cabin = box(6.2, 2.6, 9.5, PALETTE.white)
    cabin.position.set(0, MAIN_DECK + 1.3, -1)
    g.add(cabin)
    const cabinWin = box(6.3, 1.0, 8.8, PALETTE.glass, { rough: 0.2, transparent: true, opacity: 0.55 })
    cabinWin.position.set(0, MAIN_DECK + 1.7, -1)
    g.add(cabinWin)
    // deck benches (bow + stern)
    for (const bz of [-8.4, -6.8, 5.2, 6.8, 8.4]) {
      const b = box(5.6, 0.4, 0.55, PALETTE.navy)
      b.position.set(0, MAIN_DECK + 0.2, bz)
      g.add(b)
    }
    // main-deck railing ring
    const railY = MAIN_DECK
    g.add(this.localRail(-3.8, -10.2, 3.8, -10.2, railY))
    g.add(this.localRail(-3.8, 10.2, 3.8, 10.2, railY))
    g.add(this.localRail(-3.8, -10.2, -3.8, 10.2, railY))
    g.add(this.localRail(3.8, -10.2, 3.8, 10.2, railY))

    // ----------------------------------------------------- upper deck ---
    const upper = box(6.6, 0.2, 13, 0x8aa0ad)
    upper.position.set(0, UPPER_DECK - 0.1, -1.5)
    g.add(upper)
    g.add(this.localRail(-3.2, -7.9, 3.2, -7.9, UPPER_DECK))
    g.add(this.localRail(-3.2, 4.9, 3.2, 4.9, UPPER_DECK))
    g.add(this.localRail(-3.2, -7.9, -3.2, 4.9, UPPER_DECK))
    g.add(this.localRail(3.2, -7.9, 3.2, 4.9, UPPER_DECK))
    // pilothouse
    const pilot = box(4.2, 1.9, 2.6, PALETTE.white)
    pilot.position.set(0, UPPER_DECK + 0.95, -6.2)
    g.add(pilot)
    const pilotWin = box(4.3, 0.8, 2.7, PALETTE.glass, { rough: 0.2, transparent: true, opacity: 0.6 })
    pilotWin.position.set(0, UPPER_DECK + 1.25, -6.2)
    g.add(pilotWin)
    const mast = cyl(0.06, 0.09, 3.4, PALETTE.white, 7)
    mast.position.set(0, UPPER_DECK + 3.4, -6.2)
    g.add(mast)
    const radar = box(1.1, 0.12, 0.18, 0x8e969c)
    radar.position.set(0, UPPER_DECK + 4.6, -6.2)
    g.add(radar)
    this.radarBar = radar
    const stack = cyl(0.5, 0.62, 1.8, PALETTE.navy, 9)
    stack.position.set(0, UPPER_DECK + 0.9, -3.4)
    g.add(stack)
    // upper benches
    for (const bz of [-1.5, 0.2, 1.9, 3.6]) {
      const b = box(5.2, 0.4, 0.5, PALETTE.navy)
      b.position.set(0, UPPER_DECK + 0.2, bz)
      g.add(b)
    }
    // stairs main → upper (starboard stern)
    const stair = box(1.5, 0.16, 5.3, 0x8e969c)
    stair.position.set(2.6, (MAIN_DECK + UPPER_DECK) / 2, 7.2)
    stair.rotation.x = -Math.atan2(UPPER_DECK - MAIN_DECK, 5)
    g.add(stair)
    for (const side of [1.9, 3.3]) {
      const sr = box(0.06, 0.9, 5.6, 0x33403a)
      sr.position.set(side, (MAIN_DECK + UPPER_DECK) / 2 + 0.55, 7.2)
      sr.rotation.x = -Math.atan2(UPPER_DECK - MAIN_DECK, 5)
      g.add(sr)
    }

    // life rings
    for (const [lx, lz] of [
      [-3.85, -3],
      [3.85, -3],
      [-3.85, 4],
      [3.85, 4],
    ]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 6, 12), mat(0xe8762c))
      ring.position.set(lx, MAIN_DECK + 1.3, lz)
      ring.rotation.y = Math.PI / 2
      g.add(ring)
    }

    // stern flag
    this.flag = flagpole(3.4, 1.3, 0.85)
    this.flag.group.position.set(0, MAIN_DECK, 10.1)
    g.add(this.flag.group)

    // gangway (port side, folds down when docked)
    this.gangway = new THREE.Group()
    const plank = box(2.6, 0.12, 1.6, PALETTE.wood)
    plank.position.x = -1.3
    this.gangway.add(plank)
    for (const gz of [-0.7, 0.7]) {
      const grail = box(2.6, 0.08, 0.06, 0x33403a)
      grail.position.set(-1.3, 0.55, gz)
      this.gangway.add(grail)
    }
    this.gangway.position.set(-3.8, MAIN_DECK, 6)
    this.gangway.rotation.z = Math.PI * 0.45 // folded up
    g.add(this.gangway)

    // start far away on the arrival curve
    const p0 = this.curve.getPointAt(0)
    g.position.copy(p0)
  }

  private radarBar!: THREE.Mesh

  private localRail(x1: number, z1: number, x2: number, z2: number, y: number): THREE.Group {
    return railingRun(x1, z1, x2, z2, y)
  }

  /** local-space walkable height, or null if off the decks */
  localGroundAt(lx: number, lz: number, ly: number): number | null {
    // stairs
    if (lx > 1.9 && lx < 3.3 && lz > 4.6 && lz < 9.8) {
      const t = THREE.MathUtils.clamp((9.8 - lz) / 5.2, 0, 1)
      return MAIN_DECK + (UPPER_DECK - MAIN_DECK) * t
    }
    // upper deck (only reachable if already high)
    if (ly > UPPER_DECK - 1.4 && Math.abs(lx) < 3.1 && lz > -7.8 && lz < 4.8) return UPPER_DECK
    // main deck
    if (Math.abs(lx) < 3.7 && lz > -12.6 && lz < 10.1) return MAIN_DECK
    // gangway, when docked
    if (this.state === 'docked' && lz > 5.0 && lz < 7.0 && lx <= -3.5 && lx > -6.6) return MAIN_DECK - ((-lx - 3.5) / 3.1) * (MAIN_DECK - PIER_DECK_Y + (this.group.position.y - 0))
    return null
  }

  /** clamp local position to the deck (the railings) */
  clampLocal(p: THREE.Vector3): void {
    const onUpper = p.y > UPPER_DECK - 1.2
    const onStairs = p.x > 1.9 && p.x < 3.3 && p.z > 4.6 && p.z < 9.9
    if (onStairs) {
      p.x = THREE.MathUtils.clamp(p.x, 2.0, 3.2)
      return
    }
    if (onUpper) {
      p.x = THREE.MathUtils.clamp(p.x, -3.0, 3.0)
      p.z = THREE.MathUtils.clamp(p.z, -7.6, 4.7)
      return
    }
    const gangOpen = this.state === 'docked'
    if (gangOpen && p.z > 5.0 && p.z < 7.0 && p.x < -3.4) {
      // walking the gangway — allow, clamp its width
      p.z = THREE.MathUtils.clamp(p.z, 5.1, 6.9)
      return
    }
    p.x = THREE.MathUtils.clamp(p.x, -3.6, 3.6)
    p.z = THREE.MathUtils.clamp(p.z, -12.4, 9.9)
  }

  /** world position of the bottom of the gangway (on the pier) */
  gangwayPierEnd(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(-6.4, MAIN_DECK - 1, 6))
  }

  beginDeparture(): void {
    this.state = 'outbound'
    this.progress = 0
    this.gangway.rotation.z = Math.PI * 0.45
    this.ctx.audio.hornBlast(true)
    this.hornDone.clear()
  }

  engineLevel(): number {
    return this.state === 'inbound' || this.state === 'outbound' ? 1 : this.state === 'docked' ? 0.25 : 0
  }

  update(dt: number, t: number): void {
    const g = this.group
    this.flag.update(t)
    this.radarBar.rotation.y += dt * 2.2

    if (this.state === 'inbound' || this.state === 'outbound') {
      const curve = this.state === 'inbound' ? this.curve : this.departCurve
      const dur = this.state === 'inbound' ? this.duration : 40
      this.progress = Math.min(1, this.progress + dt / dur)
      // ease in/out near the ends
      const e = easeInOut(this.progress)
      const pos = curve.getPointAt(e)
      const tan = curve.getTangentAt(Math.min(0.999, e))
      g.position.copy(pos)
      g.position.y = WATER_Y + 1.1 + Math.sin(t * 0.9) * 0.07
      const target = Math.atan2(tan.x, tan.z)
      g.rotation.y = dampAngle(g.rotation.y, target + Math.PI, 3, dt)
      g.rotation.z = Math.sin(t * 0.7) * 0.012
      g.rotation.x = Math.sin(t * 1.1) * 0.008

      // wake
      this.spawnWake()
      // horns
      if (this.state === 'inbound') {
        if (this.progress > 0.04 && !this.hornDone.has('start')) {
          this.hornDone.add('start')
          this.ctx.audio.hornBlast(true)
        }
        if (this.progress > 0.62 && !this.hornDone.has('statue')) {
          this.hornDone.add('statue')
          this.ctx.audio.hornBlast(false)
        }
        if (this.progress > 0.93 && !this.hornDone.has('dock')) {
          this.hornDone.add('dock')
          this.ctx.audio.hornBlast(false)
        }
        if (this.progress >= 1) {
          this.state = 'docked'
          g.position.set(DOCK.berth.x, WATER_Y + 1.1, DOCK.berth.z)
          g.rotation.set(0, DOCK.berth.heading, 0)
          this.onDocked?.()
        }
      } else if (this.progress >= 1) {
        this.state = 'away'
        this.onAway?.()
      }
    } else if (this.state === 'docked') {
      // settle at berth, bob gently, lower the gangway
      g.position.y = WATER_Y + 1.1 + Math.sin(t * 0.8) * 0.045
      g.rotation.z = Math.sin(t * 0.6) * 0.006
      this.gangway.rotation.z = THREE.MathUtils.damp(this.gangway.rotation.z, 0.13, 2.2, dt)
    }

    // fade wake
    for (let i = this.wake.length - 1; i >= 0; i--) {
      const w = this.wake[i]
      w.life -= dt
      const m = w.mesh.material as THREE.MeshBasicMaterial
      m.opacity = Math.max(0, w.life / 2.4) * 0.5
      w.mesh.scale.addScalar(dt * 1.6)
      if (w.life <= 0) {
        w.mesh.visible = false
        this.wakePool.push(w.mesh)
        this.wake.splice(i, 1)
      }
    }
  }

  private wakeTimer = 0
  private spawnWake(): void {
    this.wakeTimer -= 1
    if (this.wakeTimer > 0) return
    this.wakeTimer = 5
    let mesh = this.wakePool.pop()
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.CircleGeometry(1.6, 8),
        new THREE.MeshBasicMaterial({ color: 0xeef4f4, transparent: true, opacity: 0.5, depthWrite: false }),
      )
      mesh.rotation.x = -Math.PI / 2
      this.ctx.scene.add(mesh)
    }
    mesh.visible = true
    const stern = this.group.localToWorld(new THREE.Vector3(0, 0, 11))
    mesh.position.set(stern.x, WATER_Y + 0.18, stern.z)
    mesh.scale.setScalar(1)
    this.wake.push({ mesh, life: 2.4 })
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * (1 - Math.exp(-lambda * dt))
}
