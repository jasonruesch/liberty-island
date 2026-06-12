// Purchasing: wallet checks, inventory, auto-equip, and the souvenir goal.

import type { GameContext } from '../core/context'
import type { ShopConfig } from '../core/ui'
import type { ItemDef } from '../core/state'

export function openShopUI(ctx: GameContext, cfg: ShopConfig): void {
  ctx.input.releaseLock()
  ctx.audio.uiClick()
  ctx.ui.openShop(
    cfg,
    ctx.state,
    (item: ItemDef) => {
      if (!ctx.state.spend(item.price)) {
        ctx.ui.toast(`💸 Not enough cash for the ${item.name}…`)
        return
      }
      ctx.state.addItem(item)
      // auto-equip the new purchase
      ctx.state.equippedIndex = ctx.state.inventory.length - 1
      ctx.state.emit()
      ctx.audio.ding()
      if (item.kind === 'souvenir') {
        ctx.ui.toast(`${item.emoji} ${item.name} — yours! ${item.wearable ? 'It goes straight on.' : 'Tucked into your bag.'}`)
        ctx.hooks.goalDone('souvenir', '🗽 Souvenir Secured', item.wearable ? 'Wearing it immediately. Correct choice.' : `The ${item.name} rides home with you.`)
      } else {
        ctx.ui.toast(`${item.emoji} ${item.name} in hand — press <b>F</b> to take a bite. Watch the sky. 🪶`, 4500)
      }
    },
    () => ctx.input.requestLock(),
  )
}
