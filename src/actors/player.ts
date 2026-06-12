// The player: a wobbly tourist with WASD + mouse-look, third/first person
// toggle (V), jumping, ferry-deck physics, food in hand, a foam crown on the
// head, and a camera in the pocket.

import * as THREE from 'three'
import { buildCharacter, buildItemMesh, type CharacterRig, CHAR_HEIGHT } from './character'
import { Ferry } from '../world/ferry'
import { WATER_Y, DOCK } from '../data/layout'
import type { GameContext } from '../core/context'

const WALK_SPEED = 3.7
const RUN_SPEED = 7.2
const GRAVITY = -23
const JUMP_V = 7.6

export class Player {
  rig: CharacterRig
  group: THREE.Group
  vel = new THREE.Vector3()
  yaw = 0 // facing
  camYaw = Math.PI
  camPitch = 0.18
  camDist = 5.2
  firstPerson = false
  /** photo system drives these */
  photoActive = false
  selfieMode = false
  photoFov = 55
  /** ferry the player is standing on, when state.onFerry */
  ferry: Ferry | null = null
  grounded = true
  private heldMesh: THREE.Object3D | null = null
  private heldId = ''
  private wornMesh: THREE.Object3D | null = null
  private wornId = ''
  private stepTimer = 0
  private walkPhase = 0
  private prevSpeed = new THREE.Vector2()
  private eating = 0
  private worldPos = new THREE.Vector3()
  private baseFov = 62

  constructor(private ctx: GameContext) {
    this.rig = buildCharacter({
      skin: 0xe8b88a,
      hair: 0x4a3326,
      outfit: 'casual',
      c1: 0x3e8f7c, // teal tee
      c2: 0xc4484a,
      hat: 'cap',
    })
    this.group = this.rig.group
    ctx.scene.add(this.group)
    ctx.camera.fov = this.baseFov
    ctx.camera.updateProjectionMatrix()
  }

  /** world position regardless of ferry parenting */
  getWorldPos(out?: THREE.Vector3): THREE.Vector3 {
    const v = out ?? this.worldPos
    return this.group.getWorldPosition(v)
  }

  boardFerry(ferry: Ferry, localX = 0, localZ = 2): void {
    this.ferry = ferry
    this.ctx.state.onFerry = true
    ferry.group.add(this.group)
    this.group.position.set(localX, ferry.localGroundAt(localX, localZ, 10) ?? 1.7, localZ)
    this.yaw -= ferry.group.rotation.y
    this.vel.set(0, 0, 0)
  }

  leaveFerry(): void {
    if (!this.ferry) return
    const world = this.group.getWorldPosition(new THREE.Vector3())
    const yaw = this.yaw + this.ferry.group.rotation.y
    this.ferry.group.remove(this.group)
    this.ctx.scene.add(this.group)
    this.group.position.copy(world)
    this.yaw = yaw
    this.ferry = null
    this.ctx.state.onFerry = false
  }

  toggleView(): void {
    this.firstPerson = !this.firstPerson
    this.ctx.ui.toast(this.firstPerson ? '👁️ First-person view' : '🎥 Third-person view', 1600)
  }

  /** equip inventory slot index, -1 to unequip */
  equip(index: number): void {
    const state = this.ctx.state
    if (index >= state.inventory.length) index = -1
    state.equippedIndex = index
    state.emit()
    this.syncHeld()
  }

  syncHeld(): void {
    const slot = this.ctx.state.equipped
    // held (hand) item
    const wantHeld = slot && !slot.item.wearable ? slot.item.id : ''
    if (wantHeld !== this.heldId) {
      if (this.heldMesh) this.heldMesh.removeFromParent()
      this.heldMesh = null
      this.heldId = wantHeld
      if (wantHeld) {
        this.heldMesh = buildItemMesh(wantHeld)
        this.rig.handR.add(this.heldMesh)
      }
    }
    // worn item
    const wantWorn = slot && slot.item.wearable ? slot.item.id : ''
    if (wantWorn !== this.wornId) {
      if (this.wornMesh) this.wornMesh.removeFromParent()
      this.wornMesh = null
      this.wornId = wantWorn
      if (wantWorn) {
        this.wornMesh = buildItemMesh(wantWorn)
        this.wornMesh.position.y = wantWorn === 'foamcrown' ? 0.14 : 0.02
        this.rig.hatAnchor.add(this.wornMesh)
      }
    }
    // scale held food by bites left
    if (this.heldMesh && slot && slot.item.bites) {
      const k = 0.45 + 0.55 * (slot.bitesLeft / slot.item.bites)
      this.heldMesh.scale.setScalar(k)
    }
  }

  /** true if the player currently holds food/drink in hand (gull bait) */
  holdingFood(): boolean {
    const slot = this.ctx.state.equipped
    return !!slot && (slot.item.kind === 'food' || slot.item.kind === 'drink') && !slot.item.wearable
  }

  /** a bird snatched the held food */
  loseHeldFood(): void {
    const state = this.ctx.state
    if (state.equippedIndex >= 0) {
      state.foodStolenCount++
      state.removeItem(state.equippedIndex)
      this.syncHeld()
    }
  }

  update(dt: number, t: number): void {
    const { input, state, ctx } = { input: this.ctx.input, state: this.ctx.state, ctx: this.ctx }
    const ui = this.ctx.ui

    // ---- look ----
    if (input.pointerLocked && !input.uiCapture) {
      const sens = 0.0023
      this.camYaw -= input.mouseDX * sens
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + input.mouseDY * sens * (this.firstPerson ? -1 : 1), -1.25, 1.35)
      if (this.photoActive) {
        this.photoFov = THREE.MathUtils.clamp(this.photoFov + input.wheelDelta * 0.02, 22, 80)
      } else {
        this.camDist = THREE.MathUtils.clamp(this.camDist + input.wheelDelta * 0.004, 2.6, 9)
      }
    }

    // ---- movement input ----
    let ix = 0
    let iz = 0
    if (!input.uiCapture) {
      if (input.down('KeyW') || input.down('ArrowUp')) iz += 1
      if (input.down('KeyS') || input.down('ArrowDown')) iz -= 1
      if (input.down('KeyA') || input.down('ArrowLeft')) ix -= 1
      if (input.down('KeyD') || input.down('ArrowRight')) ix += 1
    }
    const running = input.down('ShiftLeft') || input.down('ShiftRight')
    const speed = running ? RUN_SPEED : WALK_SPEED
    const moveLen = Math.hypot(ix, iz)
    if (moveLen > 0) {
      ix /= moveLen
      iz /= moveLen
    }

    // camera-relative desired velocity (world space)
    const sinY = Math.sin(this.camYaw)
    const cosY = Math.cos(this.camYaw)
    let dvx = (ix * cosY - iz * sinY) * speed
    let dvz = (-ix * sinY - iz * cosY) * speed

    // ferry-local: rotate desired velocity into ferry space
    const onFerry = this.ferry !== null
    if (onFerry) {
      const fy = this.ferry!.group.rotation.y
      const c = Math.cos(-fy)
      const s = Math.sin(-fy)
      const lx = dvx * c - dvz * s
      const lz = dvx * s + dvz * c
      dvx = lx
      dvz = lz
    }

    // accelerate (wobble comes from acceleration)
    const accel = this.grounded ? 26 : 8
    const oldVx = this.vel.x
    const oldVz = this.vel.z
    this.vel.x = THREE.MathUtils.damp(this.vel.x, dvx, accel / speed, dt * speed * 0.5 + dt * 4)
    this.vel.z = THREE.MathUtils.damp(this.vel.z, dvz, accel / speed, dt * speed * 0.5 + dt * 4)
    const ax = (this.vel.x - oldVx) / Math.max(dt, 1e-4)
    const az = (this.vel.z - oldVz) / Math.max(dt, 1e-4)

    // ---- jump & gravity ----
    if (input.pressed('Space') && this.grounded) {
      this.vel.y = JUMP_V
      this.grounded = false
    }
    this.vel.y += GRAVITY * dt

    const p = this.group.position
    const prevX = p.x
    const prevZ = p.z
    p.x += this.vel.x * dt
    p.z += this.vel.z * dt
    p.y += this.vel.y * dt

    // ---- ground & collision ----
    if (onFerry) {
      this.ferry!.clampLocal(p)
      const gy = this.ferry!.localGroundAt(p.x, p.z, p.y)
      if (gy !== null && p.y <= gy + 0.02 && this.vel.y <= 0) {
        if (!this.grounded && this.vel.y < -6) this.landSquash()
        p.y = gy
        this.vel.y = 0
        this.grounded = true
      } else {
        this.grounded = false
        if (gy === null) {
          // walked past the gangway end → step onto the pier (world space)
          const world = this.group.getWorldPosition(new THREE.Vector3())
          this.leaveFerry()
          this.group.position.copy(world)
        }
      }
    } else {
      const resolved = ctx.colliders.resolve(p.x, p.z, p.y, 0.34)
      p.x = resolved.x
      p.z = resolved.z
      const gy = ctx.colliders.groundAt(p.x, p.z, p.y + 0.4)
      if (gy !== null && p.y <= gy + 0.02 && this.vel.y <= 0) {
        if (!this.grounded && this.vel.y < -7) this.landSquash()
        p.y = gy
        this.vel.y = 0
        this.grounded = true
      } else if (gy === null && p.y < 0.5 && this.vel.y <= 0) {
        // off the island edge → the spring swim
        if (p.y < WATER_Y + 0.6) {
          this.splashRespawn()
          return
        }
        this.grounded = false
      } else {
        this.grounded = false
      }
    }

    // ---- facing & rig animation ----
    const hSpeed = Math.hypot(this.vel.x, this.vel.z)
    if (this.photoActive && this.selfieMode) {
      // face the camera
      this.yaw = this.camYaw + Math.PI
    } else if (hSpeed > 0.4) {
      const targetYaw = Math.atan2(this.vel.x, this.vel.z)
      this.yaw = dampAngle(this.yaw, targetYaw, 11, dt)
    }
    this.group.rotation.y = this.yaw
    this.walkPhase += hSpeed * dt * 2.4
    this.rig.setWalk(this.walkPhase, THREE.MathUtils.clamp(hSpeed / WALK_SPEED, 0, 1.15))
    // wobble: lean into acceleration, rotated into body space
    const bodyAx = ax * Math.cos(-this.yaw) - az * Math.sin(-this.yaw)
    const bodyAz = ax * Math.sin(-this.yaw) + az * Math.cos(-this.yaw)
    this.rig.setLean(THREE.MathUtils.clamp(bodyAx * 0.006, -0.22, 0.22), THREE.MathUtils.clamp(bodyAz * 0.006, -0.22, 0.22))
    if (this.photoActive) this.rig.setPose(this.selfieMode ? 'selfie' : 'point')
    else if (this.eating > 0) this.rig.setPose('eat')
    else this.rig.setPose('normal')
    this.eating = Math.max(0, this.eating - dt)
    this.rig.tick(dt, t)

    // footsteps
    if (this.grounded && hSpeed > 0.6) {
      this.stepTimer -= dt * hSpeed
      if (this.stepTimer <= 0) {
        this.stepTimer = 2.1
        const wp = this.getWorldPos()
        const surface = onFerry ? 'metal' : this.onPier(wp) ? 'wood' : state.insideStatue ? 'metal' : 'pavement'
        this.ctx.audio.footstep(surface)
        state.distanceWalked += 2.1
      }
    }

    // ---- eat / drink (F) ---- (in photo mode, F flips the selfie instead)
    if (input.pressed('KeyF') && !this.photoActive && this.holdingFood()) {
      const slot = state.equipped!
      slot.bitesLeft--
      this.eating = 0.6
      this.ctx.audio.bite()
      this.syncHeld()
      this.ctx.hooks.onBite(this.getWorldPos(new THREE.Vector3()))
      if (slot.bitesLeft <= 0) {
        const wasFood = slot.item.kind === 'food'
        const name = slot.item.name
        state.removeItem(state.equippedIndex)
        this.syncHeld()
        ui.toast(`${wasFood ? '😋' : '🥤'} Finished the ${name}!`)
        this.ctx.hooks.goalDone('snack', '🌭 Snack Secured', 'Eaten in full view of the seagulls. Bold.')
      } else {
        state.emit()
      }
    }

    // ---- camera ----
    this.updateCamera(dt)
  }

  private onPier(wp: THREE.Vector3): boolean {
    return wp.x > DOCK.endX - 12 && wp.x < DOCK.rootX + 12 && wp.z > DOCK.rootZ - 4 && wp.z < DOCK.endZ + 4
  }

  private landSquash(): void {
    this.rig.body.scale.set(1.12, 0.8, 1.12)
    setTimeout(() => this.rig.body.scale.set(1, 1, 1), 130)
  }

  private async splashRespawn(): Promise<void> {
    const ctx = this.ctx
    ctx.audio.flutter()
    ctx.ui.toast('🥶 You went for a spring swim in New York Harbor! A ranger fished you out.', 4500)
    await ctx.ui.fade(true, 350)
    this.group.position.set(DOCK.rootX + 6, 0.1, DOCK.rootZ - 8)
    this.vel.set(0, 0, 0)
    await ctx.ui.fade(false, 350)
  }

  private camTarget = new THREE.Vector3()
  private camPos = new THREE.Vector3()

  private updateCamera(dt: number): void {
    const cam = this.ctx.camera
    const wp = this.getWorldPos()
    const headY = wp.y + CHAR_HEIGHT * 0.92

    const wantFov = this.photoActive ? this.photoFov : this.baseFov
    cam.fov = THREE.MathUtils.damp(cam.fov, wantFov, 8, dt)
    cam.updateProjectionMatrix()

    if (this.photoActive && this.selfieMode) {
      // selfie: camera floats in front looking back; pitching up drops the
      // camera low and raises the gaze so YOU stay framed under the statue
      const dist = 2.7
      const dirX = Math.sin(this.camYaw)
      const dirZ = Math.cos(this.camYaw)
      this.camPos.set(wp.x + dirX * dist, headY + 0.15 + this.camPitch * 1.5, wp.z + dirZ * dist)
      cam.position.lerp(this.camPos, 1 - Math.exp(-14 * dt))
      this.camTarget.set(wp.x - dirX * 4, headY + 0.25 - this.camPitch * 5.5, wp.z - dirZ * 4)
      cam.lookAt(this.camTarget)
      this.rig.group.visible = true
      return
    }

    if (this.firstPerson || (this.photoActive && !this.selfieMode)) {
      // first person / camera-up-to-eye
      this.camPos.set(wp.x, headY + 0.08, wp.z)
      cam.position.copy(this.camPos)
      const lookX = Math.sin(this.camYaw + Math.PI)
      const lookZ = Math.cos(this.camYaw + Math.PI)
      this.camTarget.set(wp.x + lookX * 8, headY + 0.08 - Math.tan(this.camPitch) * 8 * (this.photoActive ? 1 : 1), wp.z + lookZ * 8)
      cam.lookAt(this.camTarget)
      this.rig.group.visible = false
      if (this.photoActive) this.rig.group.visible = false
      return
    }

    // third person orbit (camera tucks in close indoors so walls don't swallow it)
    this.rig.group.visible = true
    const pitch = this.camPitch
    const indoors = this.ctx.state.indoors || this.ctx.state.insideStatue
    const dist = indoors ? Math.min(this.camDist, 2.3) : this.camDist
    const ox = Math.sin(this.camYaw) * Math.cos(pitch) * dist
    const oz = Math.cos(this.camYaw) * Math.cos(pitch) * dist
    const oy = Math.sin(pitch) * dist + 0.6
    this.camPos.set(wp.x + ox, headY + oy, wp.z + oz)
    // keep camera above ground
    const camGround = this.ctx.colliders.groundAt(this.camPos.x, this.camPos.z, this.camPos.y + 2)
    if (camGround !== null && this.camPos.y < camGround + 0.45) this.camPos.y = camGround + 0.45
    cam.position.lerp(this.camPos, 1 - Math.exp(-12 * dt))
    // pitching low raises the gaze — you can admire a 93m statue
    this.camTarget.set(wp.x, headY + 0.15 - Math.min(0, pitch) * 9, wp.z)
    cam.lookAt(this.camTarget)
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * (1 - Math.exp(-lambda * dt))
}
