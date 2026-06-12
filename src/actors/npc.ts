// The ferry cohort brought to life: tourists ride the rails pointing and
// chattering, stream down the gangway, then wander the island — taking
// photos, sitting on benches, queuing for snacks — and chat when you press E.

import * as THREE from 'three'
import { buildCharacter, type CharacterRig } from './character'
import { NPC_DEFS, type NpcDef } from '../data/npcs'
import { Ferry, MAIN_DECK, UPPER_DECK } from '../world/ferry'
import { FLAG_PLAZA, BUILDINGS, FORT, SCULPTURE_GARDEN, MEMORIAL_GROVE, DOCK, insetOutline } from '../data/layout'
import type { GameContext } from '../core/context'

type NpcState = 'ferry' | 'disembark' | 'walk' | 'idle' | 'photo' | 'sit' | 'chatpair' | 'cheer'

interface Npc {
  def: NpcDef
  rig: CharacterRig
  state: NpcState
  target: THREE.Vector3
  speed: number
  timer: number
  walkPhase: number
  bubble: HTMLDivElement
  bubbleTimer: number
  lineIdx: number
  chatIdx: number
  deckSpot: THREE.Vector3
  flash: THREE.Mesh | null
}

const PHOTO_SPOTS: [number, number][] = [
  [55, 38], // mall view of the statue
  [28, -28],
  [80, 30],
  [160, -52], // Manhattan view
  [-10, -80],
  [-100, 70],
  [60, -8],
  [-40, 60],
]

export class NpcManager {
  npcs: Npc[] = []
  private wanderSpots: [number, number][]
  private bubbleLayer: HTMLElement
  private v = new THREE.Vector3()

  constructor(private ctx: GameContext, private ferry: Ferry) {
    this.bubbleLayer = document.createElement('div')
    this.bubbleLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;'
    document.body.appendChild(this.bubbleLayer)

    const prom = insetOutline(8)
    this.wanderSpots = [
      [FLAG_PLAZA.x, FLAG_PLAZA.z],
      [FLAG_PLAZA.x + 8, FLAG_PLAZA.z + 6],
      [BUILDINGS.cafePlaza.x, BUILDINGS.cafePlaza.z],
      [BUILDINGS.cafePlaza.x + 6, BUILDINGS.cafePlaza.z - 4],
      [BUILDINGS.giftPavilion.x - 12, BUILDINGS.giftPavilion.z + 4],
      [BUILDINGS.museum.x + 10, BUILDINGS.museum.z + 22],
      [SCULPTURE_GARDEN.x, SCULPTURE_GARDEN.z + 6],
      [MEMORIAL_GROVE.x, MEMORIAL_GROVE.z + 10],
      [BUILDINGS.securityCanopy.x - 10, BUILDINGS.securityCanopy.z + 6],
      [FORT.x - 60, FORT.z + 10],
      ...PHOTO_SPOTS,
      ...prom.filter((_, i) => i % 3 === 0),
    ]

    // build the cohort on the ferry decks
    NPC_DEFS.forEach((def, i) => {
      const rig = buildCharacter(def)
      const upper = i % 3 === 0
      const side = i % 2 === 0 ? -1 : 1
      const deckSpot = new THREE.Vector3(
        side * (upper ? 2.6 : 3.1),
        upper ? UPPER_DECK : MAIN_DECK,
        (upper ? -6 : -9.5) + (i % 8) * 2.3,
      )
      rig.group.position.copy(deckSpot)
      rig.group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2 // face the rails
      ferry.group.add(rig.group)

      const bubble = document.createElement('div')
      bubble.className = 'npc-bubble'
      bubble.style.opacity = '0'
      this.bubbleLayer.appendChild(bubble)

      this.npcs.push({
        def,
        rig,
        state: 'ferry',
        target: new THREE.Vector3(),
        speed: 1.4 + Math.random() * 0.9,
        timer: 2 + Math.random() * 6,
        walkPhase: Math.random() * 10,
        bubble,
        bubbleTimer: 3 + Math.random() * 14,
        lineIdx: Math.floor(Math.random() * 10),
        chatIdx: 0,
        deckSpot,
        flash: null,
      })

      // E-to-talk
      this.ctx.interactables.push({
        x: 0,
        z: 0,
        radius: 2.4,
        label: `Talk to <b>${def.name}</b> ${def.flag}`,
        order: 2,
        enabled: () => true,
        onUse: () => this.talkTo(this.npcs[i]),
      })
      const inter = this.ctx.interactables[this.ctx.interactables.length - 1]
      // keep the interactable following the npc
      Object.defineProperty(inter, 'x', { get: () => this.worldPosOf(this.npcs[i]).x })
      Object.defineProperty(inter, 'z', { get: () => this.worldPosOf(this.npcs[i]).z })
    })
  }

  private worldPosOf(npc: Npc): THREE.Vector3 {
    return npc.rig.group.getWorldPosition(this.v)
  }

  private talkTo(npc: Npc): void {
    const state = this.ctx.state
    const pool = state.phase === 'arrival' ? npc.def.lines.ferry : npc.def.lines.chat
    npc.chatIdx = npc.chatIdx % pool.length
    const firstLine = pool[npc.chatIdx]
    npc.chatIdx++
    // face the player
    const pp = this.ctx.hooks.playerPos()
    const wp = this.worldPosOf(npc)
    npc.rig.group.rotation.y = Math.atan2(pp.x - wp.x, pp.z - wp.z) - (npc.rig.group.parent === this.ferry.group ? this.ferry.group.rotation.y : 0)

    if (state.npcsTalked.add(npc.def.id) && state.npcsTalked.size === 5) {
      this.ctx.hooks.goalDone('friends', '💬 Five New Friends', 'The whole world came to see her today.')
    }
    state.emit()

    this.ctx.input.releaseLock()
    this.ctx.ui.openDialogue(
      npc.def.name,
      npc.def.home,
      npc.def.flag,
      firstLine,
      () => {
        const next = pool[npc.chatIdx % pool.length]
        npc.chatIdx++
        return npc.chatIdx > pool.length ? null : next
      },
      () => this.ctx.input.requestLock(),
    )
  }

  /** everyone streams off the boat */
  disembark(): void {
    this.npcs.forEach((npc, i) => {
      setTimeout(() => {
        npc.state = 'disembark'
        npc.timer = 0
      }, 700 * i + Math.random() * 600)
    })
  }

  /** everyone aboard cheers (selfie achievement!) */
  cheerAll(): void {
    for (const npc of this.npcs) {
      if (npc.state === 'walk' || npc.state === 'idle' || npc.state === 'photo') {
        const wp = this.worldPosOf(npc)
        const pp = this.ctx.hooks.playerPos()
        if (wp.distanceTo(pp) < 26) {
          npc.state = 'cheer'
          npc.timer = 2.5 + Math.random()
          this.say(npc, ['Woo-hoo! 🎉', 'Great shot!', 'Perfect!', '🗽❤️', 'Bravo!'][Math.floor(Math.random() * 5)], 2.5)
        }
      }
    }
  }

  private say(npc: Npc, text: string, secs = 3.4): void {
    npc.bubble.textContent = text
    npc.bubble.style.opacity = '1'
    window.setTimeout(() => {
      npc.bubble.style.opacity = '0'
    }, secs * 1000)
  }

  update(dt: number, t: number): void {
    const cam = this.ctx.camera
    const phase = this.ctx.state.phase
    for (const npc of this.npcs) {
      const g = npc.rig.group
      npc.timer -= dt
      npc.bubbleTimer -= dt

      switch (npc.state) {
        case 'ferry': {
          // lean on the rail, point at the statue, chatter
          if (npc.timer <= 0) {
            npc.timer = 3 + Math.random() * 7
            npc.rig.setPose(Math.random() < 0.45 ? 'point' : 'normal')
          }
          if (npc.bubbleTimer <= 0 && phase === 'arrival') {
            npc.bubbleTimer = 6 + Math.random() * 16
            const lines = npc.def.lines.ferry
            this.say(npc, lines[npc.lineIdx % lines.length])
            npc.lineIdx++
          }
          npc.rig.setWalk(t * 2, 0.06) // gentle sway
          break
        }
        case 'disembark': {
          // walk to the gangway (local), cross it, then enter the world
          const gx = -5.6
          const gz = 6
          const dx = gx - g.position.x
          const dz = gz - g.position.z
          const d = Math.hypot(dx, dz)
          // upper deck passengers head to the stairs first
          if (g.position.y > MAIN_DECK + 1) {
            const sx = 2.6
            const sz = 8.6
            const sd = Math.hypot(sx - g.position.x, sz - g.position.z)
            if (sd > 0.4) {
              this.stepLocal(npc, sx, sz, dt)
            } else {
              g.position.y = Math.max(MAIN_DECK, g.position.y - dt * 2.4)
              this.stepLocal(npc, 2.6, 5.4, dt)
            }
          } else if (d > 0.5) {
            this.stepLocal(npc, gx, gz, dt)
            const gy = this.ferry.localGroundAt(g.position.x, g.position.z, g.position.y)
            if (gy !== null) g.position.y = gy
          } else {
            // step off into the world
            const world = g.getWorldPosition(new THREE.Vector3())
            this.ferry.group.remove(g)
            this.ctx.scene.add(g)
            g.position.set(world.x, 0.55, world.z)
            npc.state = 'walk'
            const spot = this.pickSpot()
            npc.target.set(spot[0], 0, spot[1])
            this.say(npc, npc.def.lines.island[Math.floor(Math.random() * npc.def.lines.island.length)], 4)
          }
          npc.rig.tick(dt, t)
          continue
        }
        case 'walk': {
          const dx = npc.target.x - g.position.x
          const dz = npc.target.z - g.position.z
          const d = Math.hypot(dx, dz)
          if (d < 1.2) {
            const roll = Math.random()
            if (roll < 0.38) {
              npc.state = 'photo'
              npc.timer = 2.6 + Math.random() * 2
              // face the statue for photos
              g.rotation.y = Math.atan2(FORT.x - g.position.x, FORT.z - g.position.z)
              npc.rig.setPose('selfie')
            } else {
              npc.state = 'idle'
              npc.timer = 4 + Math.random() * 9
              npc.rig.setPose('normal')
            }
          } else {
            this.stepWorld(npc, dt)
          }
          break
        }
        case 'photo': {
          if (npc.timer < 1.2 && !npc.flash) {
            // camera flash sprite
            const flash = new THREE.Mesh(
              new THREE.PlaneGeometry(0.5, 0.5),
              new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }),
            )
            const wp = this.worldPosOf(npc)
            flash.position.set(wp.x + Math.sin(g.rotation.y) * 0.6, wp.y + 1.35, wp.z + Math.cos(g.rotation.y) * 0.6)
            flash.lookAt(cam.position)
            this.ctx.scene.add(flash)
            npc.flash = flash
          }
          if (npc.flash) {
            const m = npc.flash.material as THREE.MeshBasicMaterial
            m.opacity -= dt * 3
            if (m.opacity <= 0) {
              npc.flash.removeFromParent()
              npc.flash = null
            }
          }
          if (npc.timer <= 0) {
            npc.state = 'idle'
            npc.timer = 2 + Math.random() * 5
            npc.rig.setPose('normal')
          }
          break
        }
        case 'idle': {
          if (npc.bubbleTimer <= 0) {
            npc.bubbleTimer = 10 + Math.random() * 22
            const lines = npc.def.lines.island
            this.say(npc, lines[npc.lineIdx % lines.length])
            npc.lineIdx++
          }
          if (npc.timer <= 0) {
            npc.state = 'walk'
            const spot = this.pickSpot()
            npc.target.set(spot[0], 0, spot[1])
          }
          npc.rig.setWalk(t * 2 + npc.walkPhase, 0.05)
          break
        }
        case 'cheer': {
          npc.rig.setPose('cheer')
          if (npc.timer <= 0) {
            npc.state = 'idle'
            npc.timer = 3
            npc.rig.setPose('normal')
          }
          break
        }
        default:
          break
      }

      npc.rig.tick(dt, t + npc.walkPhase)

      // speech bubble projection (only when on screen & near)
      if (npc.bubble.style.opacity === '1') {
        const wp = this.worldPosOf(npc).clone()
        wp.y += 1.95
        wp.project(cam)
        if (wp.z < 1 && Math.abs(wp.x) < 1.1 && Math.abs(wp.y) < 1.1) {
          npc.bubble.style.transform = `translate(-50%,-100%) translate(${((wp.x + 1) / 2) * innerWidth}px, ${((1 - wp.y) / 2) * innerHeight}px)`
          npc.bubble.style.display = 'block'
        } else {
          npc.bubble.style.display = 'none'
        }
      }
    }
  }

  private stepLocal(npc: Npc, tx: number, tz: number, dt: number): void {
    const g = npc.rig.group
    const dx = tx - g.position.x
    const dz = tz - g.position.z
    const d = Math.hypot(dx, dz) || 1
    g.position.x += (dx / d) * npc.speed * dt
    g.position.z += (dz / d) * npc.speed * dt
    g.rotation.y = Math.atan2(dx, dz)
    npc.walkPhase += npc.speed * dt * 2.4
    npc.rig.setWalk(npc.walkPhase, 0.8)
  }

  private stepWorld(npc: Npc, dt: number): void {
    const g = npc.rig.group
    const dx = npc.target.x - g.position.x
    const dz = npc.target.z - g.position.z
    const d = Math.hypot(dx, dz) || 1
    let nx = g.position.x + (dx / d) * npc.speed * dt
    let nz = g.position.z + (dz / d) * npc.speed * dt
    const resolved = this.ctx.colliders.resolve(nx, nz, g.position.y, 0.3)
    nx = resolved.x
    nz = resolved.z
    const gy = this.ctx.colliders.groundAt(nx, nz, g.position.y + 0.4)
    if (gy === null) {
      // blocked / over water → pick a new target
      const spot = this.pickSpot()
      npc.target.set(spot[0], 0, spot[1])
      return
    }
    g.position.set(nx, gy, nz)
    g.rotation.y = Math.atan2(dx, dz)
    npc.walkPhase += npc.speed * dt * 2.4
    npc.rig.setWalk(npc.walkPhase, Math.min(1, npc.speed / 3))
  }

  private pickSpot(): [number, number] {
    return this.wanderSpots[Math.floor(Math.random() * this.wanderSpots.length)]
  }
}
