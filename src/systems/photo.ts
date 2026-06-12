// The camera: photo mode (P), selfie flip (F), zoom (scroll), click to shoot.
// Captures real PNGs with a polaroid frame, detects Lady Liberty in frame,
// completes THE goal, and pushes your selfie onto the museum collage wall.

import * as THREE from 'three'
import type { GameContext } from '../core/context'
import type { Player } from '../actors/player'

export class PhotoSystem {
  active = false
  private statueHead: THREE.Vector3
  private statueTorch: THREE.Vector3
  private ndc = new THREE.Vector3()

  constructor(
    private ctx: GameContext,
    private player: Player,
    statuePoints: { head: THREE.Vector3; torch: THREE.Vector3 },
  ) {
    this.statueHead = statuePoints.head
    this.statueTorch = statuePoints.torch
  }

  toggle(): void {
    if (this.active) this.exit()
    else this.enter()
  }

  enter(): void {
    this.active = true
    this.player.photoActive = true
    this.player.selfieMode = false
    this.player.photoFov = 55
    this.ctx.ui.viewfinder(true, false)
    this.ctx.audio.uiClick()
    this.ctx.ui.setHint('<b>Click</b> shoot · <b>F</b> flip selfie · <b>Scroll</b> zoom · <b>Q</b> put away')
  }

  exit(): void {
    this.active = false
    this.player.photoActive = false
    this.player.selfieMode = false
    this.ctx.ui.viewfinder(false)
  }

  flip(): void {
    if (!this.active) return
    this.player.selfieMode = !this.player.selfieMode
    this.ctx.ui.viewfinder(true, this.player.selfieMode)
    this.ctx.audio.uiClick()
  }

  private statueInFrame(): boolean {
    const cam = this.ctx.camera
    // head, torch, and a mid-body point — framing her torso counts too
    const mid = this.ndcMid.set(this.statueHead.x, this.statueHead.y * 0.72, this.statueHead.z)
    for (const point of [this.statueHead, this.statueTorch, mid]) {
      this.ndc.copy(point).project(cam)
      if (this.ndc.z < 1 && Math.abs(this.ndc.x) < 0.92 && Math.abs(this.ndc.y) < 0.95) return true
    }
    return false
  }

  private ndcMid = new THREE.Vector3()

  capture(): void {
    if (!this.active) return
    const { renderer, camera, ctx } = { renderer: this.ctx.renderer, camera: this.ctx.camera, ctx: this.ctx }
    const scene = this.ctx.scene
    const selfie = this.player.selfieMode

    // statue check BEFORE the flash (same camera state as the shot)
    const withStatue = this.statueInFrame()
    const playerPos = this.player.getWorldPos(new THREE.Vector3())
    const nearStatue = playerPos.distanceTo(new THREE.Vector3(this.statueHead.x, playerPos.y, this.statueHead.z)) < 190

    // fresh render then grab pixels
    renderer.render(scene, camera)
    const src = renderer.domElement

    // compose the polaroid
    const maxW = 880
    const scale = Math.min(1, maxW / src.width)
    const pw = Math.round(src.width * scale)
    const ph = Math.round(src.height * scale)
    const border = Math.round(pw * 0.035)
    const bottom = Math.round(pw * 0.115)
    const out = document.createElement('canvas')
    out.width = pw + border * 2
    out.height = ph + border + bottom
    const g = out.getContext('2d')!
    g.fillStyle = '#f7f3ea'
    g.fillRect(0, 0, out.width, out.height)
    g.drawImage(src, border, border, pw, ph)
    g.fillStyle = '#4a4438'
    g.font = `700 ${Math.round(pw * 0.034)}px 'Trebuchet MS', sans-serif`
    g.textAlign = 'left'
    const star = withStatue && selfie ? '⭐ ' : ''
    g.fillText(`${star}LIBERTY ISLAND — Spring, cloudy noon`, border, ph + border + bottom * 0.62)
    g.textAlign = 'right'
    g.fillText(selfie ? '🤳' : '📷', out.width - border, ph + border + bottom * 0.62)
    const dataUrl = out.toDataURL('image/png')

    const caption = selfie ? (withStatue ? 'Selfie with Lady Liberty!' : 'Selfie on Liberty Island') : withStatue ? 'Lady Liberty' : 'Liberty Island'
    ctx.state.photos.push({ dataUrl, caption, selfie, withStatue, time: Date.now() })
    ctx.state.emit()

    ctx.audio.shutter()
    ctx.ui.flash()

    if (selfie && withStatue && nearStatue) {
      const first = !ctx.state.goalsDone.has('selfie')
      ctx.hooks.goalDone('selfie', '🤳 THE Selfie!', 'You and Lady Liberty — the photo you came for.')
      if (first) {
        ctx.hooks.npcCheer()
        const p = this.player.getWorldPos(new THREE.Vector3())
        ctx.hooks.confettiAt(p.x, p.y + 2, p.z)
        ctx.hooks.addPhotoToCollage(dataUrl)
        ctx.ui.toast('🖼️ Your selfie just joined the “Becoming Liberty” collage in the museum!', 6000)
      } else {
        ctx.hooks.addPhotoToCollage(dataUrl)
      }
    } else {
      const lines = [
        '📸 Nice shot!',
        '📸 Got it!',
        '📸 One for the album.',
        selfie ? '🤳 Cute! Try framing the statue behind you for the big one.' : '📸 Lovely. The selfie goal needs the camera flipped (F)!',
      ]
      ctx.ui.toast(lines[Math.floor(Math.random() * lines.length)], 2600)
    }
  }
}
