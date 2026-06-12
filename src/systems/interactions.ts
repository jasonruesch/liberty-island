// Nearest-interactable prompt + E to use.

import type { GameContext } from '../core/context'

export class Interactions {
  private current: number = -1

  constructor(private ctx: GameContext) {}

  update(): void {
    const ctx = this.ctx
    if (ctx.ui.modalOpen) {
      ctx.ui.setPrompt(null)
      this.current = -1
      return
    }
    const p = ctx.hooks.playerPos()
    let bestIdx = -1
    let bestScore = Infinity
    for (let i = 0; i < ctx.interactables.length; i++) {
      const it = ctx.interactables[i]
      if (it.enabled && !it.enabled()) continue
      const dx = it.x - p.x
      const dz = it.z - p.z
      const d2 = dx * dx + dz * dz
      if (d2 > it.radius * it.radius) continue
      if (it.y !== undefined && Math.abs(it.y - p.y) > 3.2) continue
      const score = d2 + (it.order ?? 0) * 1.5
      if (score < bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    this.current = bestIdx
    if (bestIdx >= 0) {
      ctx.ui.setPrompt(`<b>E</b> &nbsp;${ctx.interactables[bestIdx].label}`)
      if (ctx.input.pressed('KeyE')) {
        ctx.audio.uiClick()
        ctx.interactables[bestIdx].onUse()
      }
    } else {
      ctx.ui.setPrompt(null)
    }
  }
}
