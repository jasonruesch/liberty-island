// New York Harbor's finest food-acquisition specialists.
// Seagulls soar, perch, STALK anyone holding food outdoors, and dive to
// snatch it. Pigeons strut the plazas, scatter from runners, and mob crumbs.

import * as THREE from 'three'
import { PALETTE, mat, sph, cone, box } from '../world/materials'
import { buildItemMesh } from './character'
import { insetOutline, FLAG_PLAZA, BUILDINGS, DOCK, FORT } from '../data/layout'
import { mulberry } from '../world/environment'
import type { GameContext } from '../core/context'

export interface BirdDeps {
  holdingFood(): boolean
  heldItemId(): string
  playerPos(): THREE.Vector3
  playerSpeed(): number
  loseFood(): void
  isSheltered(x: number, z: number): boolean
}

type GullState = 'soar' | 'perch' | 'stalk' | 'dive' | 'flee'
type PigeonState = 'walk' | 'peck' | 'scatter' | 'crumbs'

interface Gull {
  g: THREE.Group
  wingL: THREE.Mesh
  wingR: THREE.Mesh
  state: GullState
  timer: number
  orbitR: number
  orbitH: number
  orbitA: number
  orbitCx: number
  orbitCz: number
  perchIdx: number
  diveFrom: THREE.Vector3
  diveT: number
  carried: THREE.Object3D | null
  flapPhase: number
}

interface Pigeon {
  g: THREE.Group
  state: PigeonState
  timer: number
  target: THREE.Vector3
  home: [number, number]
  bobPhase: number
}

export class Birds {
  private gulls: Gull[] = []
  private pigeons: Pigeon[] = []
  private feathers: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = []
  private perches: THREE.Vector3[] = []
  private stalker: Gull | null = null
  private stalkTime = 0
  private cooldown = 5
  private crumbsAt: THREE.Vector3 | null = null
  private crumbsTimer = 0
  private rng = mulberry(404)

  constructor(private ctx: GameContext, private deps: BirdDeps) {
    // perch spots: seawall railing line, pier pilings, fort parapet, roofs
    const rail = insetOutline(1.2)
    for (let i = 0; i < rail.length; i += 2) this.perches.push(new THREE.Vector3(rail[i][0], 1.15, rail[i][1]))
    for (let i = 0; i < 4; i++) this.perches.push(new THREE.Vector3(DOCK.endX + 6 - i * 4, 1.4, DOCK.endZ - 6 - i * 8))
    this.perches.push(new THREE.Vector3(BUILDINGS.cafe.x - 6, 6.2, BUILDINGS.cafe.z))
    this.perches.push(new THREE.Vector3(BUILDINGS.giftPavilion.x, 6.0, BUILDINGS.giftPavilion.z - 4))
    this.perches.push(new THREE.Vector3(FORT.x - 20, 9.8, FORT.z + 30))
    this.perches.push(new THREE.Vector3(FORT.x + 30, 9.8, FORT.z - 25))

    for (let i = 0; i < 8; i++) this.gulls.push(this.makeGull(i))
    for (let i = 0; i < 13; i++) this.pigeons.push(this.makePigeon(i))
  }

  private makeGull(i: number): Gull {
    const g = new THREE.Group()
    const body = sph(0.16, PALETTE.white, 8)
    body.scale.set(1, 0.85, 1.7)
    g.add(body)
    const head = sph(0.095, PALETTE.white, 8)
    head.position.set(0, 0.1, 0.24)
    g.add(head)
    const beak = cone(0.028, 0.12, 0xe8a13c, 5)
    beak.rotation.x = Math.PI / 2
    beak.position.set(0, 0.09, 0.36)
    g.add(beak)
    const tail = box(0.12, 0.02, 0.16, 0xd5dadc)
    tail.position.set(0, 0.02, -0.3)
    g.add(tail)
    const wingGeo = new THREE.BoxGeometry(0.55, 0.02, 0.2)
    wingGeo.translate(0.27, 0, 0)
    const wingL = new THREE.Mesh(wingGeo, mat(0xdde2e4))
    wingL.position.set(0.08, 0.06, 0)
    g.add(wingL)
    const wingR = new THREE.Mesh(wingGeo.clone(), mat(0xdde2e4))
    wingR.scale.x = -1
    wingR.position.set(-0.08, 0.06, 0)
    g.add(wingR)
    for (const tip of [wingL, wingR]) {
      const tipM = box(0.1, 0.022, 0.18, 0x6b7280)
      tipM.position.set(0.5, 0, 0)
      tip.add(tipM)
    }
    g.traverse((m) => (m.castShadow = true))
    this.ctx.scene.add(g)
    const gull: Gull = {
      g,
      wingL,
      wingR,
      state: i % 3 === 0 ? 'perch' : 'soar',
      timer: 3 + this.rng() * 8,
      orbitR: 30 + this.rng() * 70,
      orbitH: 9 + this.rng() * 22,
      orbitA: this.rng() * Math.PI * 2,
      orbitCx: (this.rng() - 0.5) * 250,
      orbitCz: (this.rng() - 0.5) * 120,
      perchIdx: Math.floor(this.rng() * this.perches.length),
      diveFrom: new THREE.Vector3(),
      diveT: 0,
      carried: null,
      flapPhase: this.rng() * 9,
    }
    if (gull.state === 'perch') {
      const p = this.perches[gull.perchIdx]
      g.position.copy(p)
    } else {
      g.position.set(gull.orbitCx + gull.orbitR, gull.orbitH, gull.orbitCz)
    }
    return gull
  }

  private makePigeon(i: number): Pigeon {
    const g = new THREE.Group()
    const body = sph(0.09, 0x8a8f96, 8)
    body.scale.set(1, 0.9, 1.4)
    body.position.y = 0.09
    g.add(body)
    const neck = sph(0.055, 0x5d7a6b, 7, { rough: 0.5, metal: 0.3 })
    neck.position.set(0, 0.14, 0.07)
    g.add(neck)
    const head = sph(0.045, 0x6b7077, 7)
    head.position.set(0, 0.18, 0.1)
    g.add(head)
    const beakP = cone(0.013, 0.05, 0x44484e, 4)
    beakP.rotation.x = Math.PI / 2
    beakP.position.set(0, 0.175, 0.15)
    g.add(beakP)
    const tailP = box(0.07, 0.015, 0.12, 0x6b7077)
    tailP.position.set(0, 0.08, -0.13)
    tailP.rotation.x = 0.25
    g.add(tailP)
    g.traverse((m) => (m.castShadow = true))
    this.ctx.scene.add(g)
    const homes: [number, number][] = [
      [FLAG_PLAZA.x, FLAG_PLAZA.z],
      [BUILDINGS.cafePlaza.x, BUILDINGS.cafePlaza.z],
      [DOCK.rootX + 10, DOCK.rootZ - 14],
      [BUILDINGS.securityCanopy.x, BUILDINGS.securityCanopy.z + 8],
    ]
    const home = homes[i % homes.length]
    g.position.set(home[0] + (this.rng() - 0.5) * 14, 0, home[1] + (this.rng() - 0.5) * 10)
    return {
      g,
      state: 'walk',
      timer: this.rng() * 3,
      target: new THREE.Vector3(g.position.x, 0, g.position.z),
      home,
      bobPhase: this.rng() * 9,
    }
  }

  /** the player took a bite — crumbs! */
  notifyBite(pos: THREE.Vector3): void {
    this.crumbsAt = pos.clone()
    this.crumbsTimer = 9
  }

  private burstFeathers(pos: THREE.Vector3): void {
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, 0.14),
        new THREE.MeshBasicMaterial({ color: 0xf4f6f6, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
      )
      f.position.copy(pos)
      f.rotation.set(this.rng() * 3, this.rng() * 3, this.rng() * 3)
      this.ctx.scene.add(f)
      this.feathers.push({
        m: f,
        v: new THREE.Vector3((this.rng() - 0.5) * 2.4, 1 + this.rng() * 2, (this.rng() - 0.5) * 2.4),
        life: 1.8 + this.rng(),
      })
    }
  }

  update(dt: number, t: number): void {
    const pp = this.deps.playerPos()
    const playerOutside =
      !this.ctx.state.indoors && !this.ctx.state.insideStatue && !this.ctx.state.onFerry && !this.deps.isSheltered(pp.x, pp.z) && pp.y < 2
    const baitOut = this.deps.holdingFood() && playerOutside
    this.cooldown -= dt

    // ------------------------------------------------ stalking logic ---
    if (baitOut && !this.stalker && this.cooldown <= 0) {
      // nearest free gull takes the job
      let best: Gull | null = null
      let bestD = Infinity
      for (const gull of this.gulls) {
        if (gull.state === 'flee' || gull.state === 'dive') continue
        const d = gull.g.position.distanceTo(pp)
        if (d < bestD) {
          bestD = d
          best = gull
        }
      }
      if (best) {
        this.stalker = best
        best.state = 'stalk'
        this.stalkTime = 0
        this.ctx.audio.gullCry(0.12, 0, true)
      }
    }
    if (this.stalker && (!baitOut || this.stalker.state === 'flee')) {
      if (this.stalker.state === 'stalk') this.stalker.state = 'soar'
      if (this.stalker.state !== 'flee') this.stalker = null
      this.ctx.ui.birdWarning(false)
      this.stalkTime = 0
    }

    // ------------------------------------------------------- gulls ---
    for (const gull of this.gulls) {
      gull.timer -= dt
      gull.flapPhase += dt * (gull.state === 'dive' ? 26 : gull.state === 'perch' ? 0 : 10)
      const flap = Math.sin(gull.flapPhase) * (gull.state === 'perch' ? 0.06 : 0.75)
      gull.wingL.rotation.z = flap
      gull.wingR.rotation.z = -flap

      switch (gull.state) {
        case 'soar': {
          gull.orbitA += dt * (8 / gull.orbitR) * 2.2
          const tx = gull.orbitCx + Math.cos(gull.orbitA) * gull.orbitR
          const tz = gull.orbitCz + Math.sin(gull.orbitA) * gull.orbitR
          const ty = gull.orbitH + Math.sin(t * 0.6 + gull.flapPhase) * 1.5
          gull.g.position.lerp(new THREE.Vector3(tx, ty, tz), 1 - Math.exp(-2 * dt))
          gull.g.rotation.y = gull.orbitA + Math.PI / 2 + (this.rng() - 0.5) * 0.02
          gull.g.rotation.z = 0.18
          if (gull.timer <= 0) {
            if (this.rng() < 0.4) {
              gull.state = 'perch'
              gull.perchIdx = Math.floor(this.rng() * this.perches.length)
              gull.timer = 6 + this.rng() * 14
            } else {
              gull.timer = 8 + this.rng() * 10
              gull.orbitCx = (this.rng() - 0.5) * 280
              gull.orbitCz = (this.rng() - 0.5) * 140
              gull.orbitH = 9 + this.rng() * 22
            }
            if (this.rng() < 0.3) this.ctx.audio.gullCry(0.07)
          }
          break
        }
        case 'perch': {
          const p = this.perches[gull.perchIdx]
          gull.g.position.lerp(p, 1 - Math.exp(-3 * dt))
          gull.g.rotation.z = 0
          gull.g.rotation.y += Math.sin(t * 0.7 + gull.flapPhase) * 0.002
          // scatter if the player runs close
          if (this.deps.playerSpeed() > 5 && gull.g.position.distanceTo(pp) < 3.2) {
            gull.state = 'soar'
            gull.timer = 8
            this.ctx.audio.flutter()
            this.ctx.audio.gullCry(0.1, 0, true)
          }
          if (gull.timer <= 0) {
            gull.state = 'soar'
            gull.timer = 8 + this.rng() * 10
          }
          break
        }
        case 'stalk': {
          // tighten a menacing circle overhead
          this.stalkTime += dt
          const h = Math.max(4.2, 9 - this.stalkTime * 1.1)
          const r = Math.max(3.4, 9 - this.stalkTime * 1.2)
          gull.orbitA += dt * 1.9
          const tx = pp.x + Math.cos(gull.orbitA) * r
          const tz = pp.z + Math.sin(gull.orbitA) * r
          gull.g.position.lerp(new THREE.Vector3(tx, pp.y + h, tz), 1 - Math.exp(-3.5 * dt))
          gull.g.lookAt(pp.x, pp.y + 1, pp.z)
          this.ctx.ui.birdWarning(this.stalkTime > 1.2)
          // player sprinting away resets the hunt
          if (this.deps.playerSpeed() > 6.4) this.stalkTime = Math.max(0, this.stalkTime - dt * 3)
          if (this.stalkTime > 4.2) {
            gull.state = 'dive'
            gull.diveFrom.copy(gull.g.position)
            gull.diveT = 0
            this.ctx.audio.gullCry(0.16, 0, true)
          }
          break
        }
        case 'dive': {
          gull.diveT += dt * 1.45
          const k = Math.min(1, gull.diveT)
          const hand = new THREE.Vector3(pp.x, pp.y + 1.0, pp.z)
          gull.g.position.lerpVectors(gull.diveFrom, hand, easeIn(k))
          gull.g.lookAt(hand)
          if (k >= 1) {
            if (this.deps.holdingFood() && playerOutside) {
              // GOTCHA
              const itemId = this.deps.heldItemId()
              this.deps.loseFood()
              this.ctx.audio.squawk()
              this.burstFeathers(hand)
              const stolen = buildItemMesh(itemId)
              stolen.scale.setScalar(0.8)
              stolen.position.set(0, -0.08, 0.4)
              gull.g.add(stolen)
              gull.carried = stolen
              this.ctx.ui.toast('🪶 A seagull made off with your snack! New York rules.', 4200)
              this.ctx.ui.birdWarning(false)
            } else {
              this.ctx.audio.gullCry(0.08)
            }
            gull.state = 'flee'
            gull.timer = 7
            this.stalker = null
            this.stalkTime = 0
            this.cooldown = 9
          }
          break
        }
        case 'flee': {
          gull.g.position.y += dt * 5
          gull.g.translateZ(dt * 9)
          if (gull.timer <= 0) {
            if (gull.carried) {
              gull.carried.removeFromParent()
              gull.carried = null
            }
            gull.state = 'soar'
            gull.timer = 10
            gull.orbitCx = gull.g.position.x
            gull.orbitCz = gull.g.position.z
            gull.orbitH = Math.min(30, gull.g.position.y)
          }
          break
        }
      }
    }

    // ------------------------------------------------------ pigeons ---
    this.crumbsTimer -= dt
    if (this.crumbsTimer <= 0) this.crumbsAt = null
    for (const pg of this.pigeons) {
      pg.timer -= dt
      pg.bobPhase += dt * 9
      switch (pg.state) {
        case 'walk': {
          const d = pg.g.position.distanceTo(pg.target)
          if (d < 0.2 || pg.timer <= 0) {
            pg.state = 'peck'
            pg.timer = 1.2 + this.rng() * 2.4
          } else {
            const dir = pg.target.clone().sub(pg.g.position).normalize()
            pg.g.position.addScaledVector(dir, dt * 0.85)
            pg.g.rotation.y = Math.atan2(dir.x, dir.z)
            pg.g.position.y = Math.abs(Math.sin(pg.bobPhase)) * 0.02
          }
          break
        }
        case 'peck': {
          pg.g.children[2].position.y = 0.18 - Math.abs(Math.sin(pg.bobPhase * 0.7)) * 0.07
          if (pg.timer <= 0) {
            pg.state = 'walk'
            pg.timer = 3 + this.rng() * 4
            const cx = this.crumbsAt ?? null
            if (cx && pg.g.position.distanceTo(cx) < 26) {
              pg.target.set(cx.x + (this.rng() - 0.5) * 2.4, 0, cx.z + (this.rng() - 0.5) * 2.4)
            } else {
              pg.target.set(pg.home[0] + (this.rng() - 0.5) * 16, 0, pg.home[1] + (this.rng() - 0.5) * 12)
            }
          }
          break
        }
        case 'scatter': {
          pg.g.position.y = Math.max(0, pg.g.position.y + (pg.timer > 0.5 ? dt * 3.2 : -dt * 3.4))
          pg.g.translateZ(dt * 3.4)
          if (pg.timer <= 0) {
            pg.g.position.y = 0
            pg.state = 'walk'
            pg.timer = 2 + this.rng() * 3
            pg.target.set(pg.g.position.x + (this.rng() - 0.5) * 6, 0, pg.g.position.z + (this.rng() - 0.5) * 6)
          }
          break
        }
        default:
          break
      }
      // crumbs pull
      if (this.crumbsAt && pg.state !== 'scatter' && pg.g.position.distanceTo(this.crumbsAt) < 26 && this.rng() < 0.02) {
        pg.target.set(this.crumbsAt.x + (this.rng() - 0.5) * 2, 0, this.crumbsAt.z + (this.rng() - 0.5) * 2)
        pg.state = 'walk'
        pg.timer = 4
      }
      // runners scare them
      if (pg.state !== 'scatter' && this.deps.playerSpeed() > 5 && pg.g.position.distanceTo(pp) < 2.6) {
        pg.state = 'scatter'
        pg.timer = 1.1
        pg.g.rotation.y = Math.atan2(pg.g.position.x - pp.x, pg.g.position.z - pp.z)
        this.ctx.audio.flutter()
      }
    }

    // ------------------------------------------------------ feathers ---
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const f = this.feathers[i]
      f.life -= dt
      f.v.y -= dt * 2.2
      f.m.position.addScaledVector(f.v, dt)
      f.m.rotation.x += dt * 3
      f.m.rotation.z += dt * 2
      ;(f.m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, f.life)
      if (f.life <= 0) {
        f.m.removeFromParent()
        this.feathers.splice(i, 1)
      }
    }
  }
}

function easeIn(t: number): number {
  return t * t
}
