// DOM overlay UI: HUD, title, shop, gallery, dialogue, viewfinder, recap.

import { GOALS, type GameState, type InventorySlot, type ItemDef, type PhotoEntry } from './state'

export interface ShopConfig {
  title: string
  emoji: string
  blurb: string
  items: ItemDef[]
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  parent?: HTMLElement,
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (html !== undefined) node.innerHTML = html
  if (parent) parent.appendChild(node)
  return node
}

export class UI {
  root: HTMLElement
  private hud: HTMLElement
  private objectiveCard: HTMLElement
  private walletEl: HTMLElement
  private hintEl: HTMLElement
  private promptEl: HTMLElement
  private toastWrap: HTMLElement
  private subtitleEl: HTMLElement
  private letterboxTop: HTMLElement
  private letterboxBottom: HTMLElement
  private modalWrap: HTMLElement
  private viewfinderEl: HTMLElement
  private vfModeEl: HTMLElement
  private flashEl: HTMLElement
  private hotbarEl: HTMLElement
  private eatEl: HTMLElement
  private eatFill: HTMLElement
  private celebrationEl: HTMLElement
  private warnEl: HTMLElement
  private fadeEl: HTMLElement
  modalOpen = false
  onModalChange: (open: boolean) => void = () => {}

  constructor(parent: HTMLElement) {
    this.root = el('div', 'ui-root', parent)

    this.letterboxTop = el('div', 'letterbox top', this.root)
    this.letterboxBottom = el('div', 'letterbox bottom', this.root)

    this.hud = el('div', 'hud', this.root)
    this.objectiveCard = el('div', 'objective-card', this.hud)
    this.walletEl = el('div', 'wallet', this.hud)
    this.hotbarEl = el('div', 'hotbar', this.hud)
    this.hintEl = el('div', 'hint', this.hud)
    this.promptEl = el('div', 'prompt hidden', this.hud)
    this.subtitleEl = el('div', 'subtitle hidden', this.hud)
    this.toastWrap = el('div', 'toast-wrap', this.hud)
    this.warnEl = el('div', 'bird-warning hidden', this.hud, '🪶 A gull is eyeing your food!')
    this.eatEl = el('div', 'eat-progress hidden', this.hud)
    this.eatFill = el('div', 'eat-fill', this.eatEl)

    this.viewfinderEl = el('div', 'viewfinder hidden', this.root)
    this.viewfinderEl.innerHTML = `
      <div class="vf-corner tl"></div><div class="vf-corner tr"></div>
      <div class="vf-corner bl"></div><div class="vf-corner br"></div>
      <div class="vf-reticle">+</div>
      <div class="vf-top"><span class="vf-rec">●</span> PHOTO MODE</div>
      <div class="vf-bottom">
        <span><b>Click</b> shoot</span><span><b>F</b> flip selfie</span>
        <span><b>Scroll</b> zoom</span><span><b>Q</b>/<b>Esc</b> put away</span>
      </div>`
    this.vfModeEl = el('div', 'vf-mode', this.viewfinderEl, '🤳 SELFIE')

    this.flashEl = el('div', 'flash', this.root)
    this.celebrationEl = el('div', 'celebration hidden', this.root)
    this.modalWrap = el('div', 'modal-wrap hidden', this.root)
    this.fadeEl = el('div', 'fade', this.root)
  }

  // ------------------------------------------------------------- HUD ---

  syncGoals(state: GameState): void {
    const rows = GOALS.map((g) => {
      const done = state.goalsDone.has(g.id)
      let extra = ''
      if (g.id === 'friends' && !done) extra = ` <i>(${state.npcsTalked.size}/5)</i>`
      if (g.id === 'promenade' && !done) extra = ` <i>(${state.promenadeCheckpoints.size}/4)</i>`
      return `<div class="goal ${done ? 'done' : ''} ${g.main ? 'main' : ''}">
        <span class="g-emoji">${done ? '✅' : g.emoji}</span><span>${g.label}${extra}</span></div>`
    })
    this.objectiveCard.innerHTML = `<div class="obj-title">🗽 Day Out Checklist</div>${rows.join('')}`
  }

  setWallet(amount: number): void {
    this.walletEl.innerHTML = `💵 <b>$${amount.toFixed(2)}</b>`
  }

  syncHotbar(state: GameState): void {
    const slots: string[] = []
    slots.push(
      `<div class="slot ${state.equippedIndex === -1 ? '' : ''} camera" title="Camera — press P">📷<span class="key">P</span></div>`,
    )
    state.inventory.forEach((slot, i) => {
      const active = state.equippedIndex === i
      slots.push(
        `<div class="slot ${active ? 'active' : ''}" data-i="${i}" title="${slot.item.name}">${slot.item.emoji}<span class="key">${i + 1}</span></div>`,
      )
    })
    this.hotbarEl.innerHTML = slots.join('')
  }

  setHint(text: string): void {
    this.hintEl.innerHTML = text
  }

  setPrompt(text: string | null): void {
    if (text) {
      this.promptEl.innerHTML = text
      this.promptEl.classList.remove('hidden')
    } else this.promptEl.classList.add('hidden')
  }

  setSubtitle(html: string | null): void {
    if (html) {
      this.subtitleEl.innerHTML = html
      this.subtitleEl.classList.remove('hidden')
    } else this.subtitleEl.classList.add('hidden')
  }

  toast(html: string, ms = 3500): void {
    const t = el('div', 'toast', this.toastWrap, html)
    requestAnimationFrame(() => t.classList.add('show'))
    setTimeout(() => {
      t.classList.remove('show')
      setTimeout(() => t.remove(), 400)
    }, ms)
  }

  birdWarning(show: boolean): void {
    this.warnEl.classList.toggle('hidden', !show)
  }

  eatProgress(frac: number | null): void {
    if (frac === null) this.eatEl.classList.add('hidden')
    else {
      this.eatEl.classList.remove('hidden')
      this.eatFill.style.width = `${Math.round(frac * 100)}%`
    }
  }

  celebrate(title: string, sub: string): void {
    this.celebrationEl.innerHTML = `<div class="celebrate-inner"><div class="c-title">${title}</div><div class="c-sub">${sub}</div></div>`
    this.celebrationEl.classList.remove('hidden')
    this.celebrationEl.classList.add('pop')
    setTimeout(() => {
      this.celebrationEl.classList.add('hidden')
      this.celebrationEl.classList.remove('pop')
    }, 3200)
  }

  letterbox(show: boolean): void {
    this.letterboxTop.classList.toggle('on', show)
    this.letterboxBottom.classList.toggle('on', show)
  }

  fade(toBlack: boolean, ms = 600): Promise<void> {
    this.fadeEl.style.transitionDuration = `${ms}ms`
    this.fadeEl.classList.toggle('on', toBlack)
    return new Promise((res) => setTimeout(res, ms))
  }

  viewfinder(show: boolean, selfie = false): void {
    this.viewfinderEl.classList.toggle('hidden', !show)
    this.vfModeEl.innerHTML = selfie ? '🤳 SELFIE' : '🌇 SCENE'
  }

  flash(): void {
    this.flashEl.classList.add('on')
    setTimeout(() => this.flashEl.classList.remove('on'), 220)
  }

  // ---------------------------------------------------------- modals ---

  private openModal(): HTMLElement {
    this.modalWrap.innerHTML = ''
    this.modalWrap.classList.remove('hidden')
    this.modalOpen = true
    this.onModalChange(true)
    return this.modalWrap
  }

  closeModal(): void {
    this.modalWrap.classList.add('hidden')
    this.modalWrap.innerHTML = ''
    this.modalOpen = false
    this.onModalChange(false)
  }

  showTitle(onStart: () => void): void {
    const wrap = this.openModal()
    const card = el('div', 'title-screen', wrap)
    card.innerHTML = `
      <div class="t-statue">🗽</div>
      <h1>LIBERTY ISLAND</h1>
      <div class="t-sub">A Wobbly Day Out in New York Harbor</div>
      <div class="t-desc">A cloudy spring noon. A ferry full of travelers from every corner of the world.<br/>
      One goal: <b>a selfie with Lady Liberty herself.</b></div>
      <button class="big-btn">⛴️ &nbsp;Board the Ferry</button>
      <div class="t-controls">
        <span><b>WASD</b> walk</span><span><b>Shift</b> run</span><span><b>Space</b> jump</span>
        <span><b>E</b> talk / use</span><span><b>P</b> camera</span><span><b>V</b> 1st/3rd person</span>
        <span><b>Tab</b> gallery</span><span><b>M</b> music</span>
      </div>`
    card.querySelector('button')!.addEventListener('click', () => {
      this.closeModal()
      onStart()
    })
  }

  openShop(cfg: ShopConfig, state: GameState, onBuy: (item: ItemDef) => void, onClose: () => void): void {
    const wrap = this.openModal()
    const card = el('div', 'modal shop', wrap)
    const renderItems = () =>
      cfg.items
        .map((it) => {
          const afford = state.wallet >= it.price
          return `<div class="shop-item ${afford ? '' : 'poor'}" data-id="${it.id}">
          <div class="si-emoji">${it.emoji}</div>
          <div class="si-name">${it.name}</div>
          <div class="si-desc">${it.desc}</div>
          <button class="buy-btn" ${afford ? '' : 'disabled'}>$${it.price.toFixed(2)}</button>
        </div>`
        })
        .join('')
    card.innerHTML = `
      <div class="modal-head"><span class="m-emoji">${cfg.emoji}</span>
        <div><h2>${cfg.title}</h2><div class="m-blurb">${cfg.blurb}</div></div>
        <div class="m-wallet">💵 $<span class="w-num">${state.wallet.toFixed(2)}</span></div>
        <button class="close-btn">✕</button></div>
      <div class="shop-grid">${renderItems()}</div>`
    const refresh = () => {
      card.querySelector('.w-num')!.textContent = state.wallet.toFixed(2)
      card.querySelector('.shop-grid')!.innerHTML = renderItems()
      bind()
    }
    const bind = () => {
      card.querySelectorAll<HTMLElement>('.shop-item .buy-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn.closest('.shop-item') as HTMLElement).dataset.id!
          const item = cfg.items.find((i) => i.id === id)!
          onBuy(item)
          refresh()
        })
      })
    }
    bind()
    card.querySelector('.close-btn')!.addEventListener('click', () => {
      this.closeModal()
      onClose()
    })
  }

  openGallery(photos: PhotoEntry[], onClose: () => void): void {
    const wrap = this.openModal()
    const card = el('div', 'modal gallery', wrap)
    const items = photos.length
      ? photos
          .map(
            (p, i) => `
        <div class="photo ${p.withStatue && p.selfie ? 'gold' : ''}">
          <img src="${p.dataUrl}" alt="photo"/>
          <div class="ph-cap">${p.withStatue && p.selfie ? '⭐ ' : ''}${p.caption}</div>
          <a class="dl-btn" download="liberty-island-${i + 1}.png" href="${p.dataUrl}">⬇ Save PNG</a>
        </div>`,
          )
          .join('')
      : `<div class="gallery-empty">No photos yet! Press <b>P</b> to raise your camera. 📷</div>`
    card.innerHTML = `
      <div class="modal-head"><span class="m-emoji">📸</span>
        <div><h2>Photo Gallery</h2><div class="m-blurb">${photos.length} photo${photos.length === 1 ? '' : 's'} — ⭐ marks your Lady Liberty selfies</div></div>
        <button class="close-btn">✕</button></div>
      <div class="gallery-grid">${items}</div>`
    card.querySelector('.close-btn')!.addEventListener('click', () => {
      this.closeModal()
      onClose()
    })
  }

  openDialogue(
    name: string,
    home: string,
    flag: string,
    text: string,
    onNext: () => string | null,
    onClose: () => void,
  ): void {
    const wrap = this.openModal()
    wrap.classList.add('dialogue-mode')
    const card = el('div', 'dialogue-card', wrap)
    const render = (t: string) => {
      card.innerHTML = `
        <div class="d-head"><span class="d-flag">${flag}</span><b>${name}</b><span class="d-home">${home}</span></div>
        <div class="d-text">${t}</div>
        <div class="d-actions"><button class="big-btn small next-btn">Next 💬</button>
        <button class="big-btn small ghost bye-btn">Wave goodbye 👋</button></div>`
      card.querySelector('.next-btn')!.addEventListener('click', () => {
        const next = onNext()
        if (next) render(next)
        else close()
      })
      card.querySelector('.bye-btn')!.addEventListener('click', close)
    }
    const close = () => {
      wrap.classList.remove('dialogue-mode')
      this.closeModal()
      onClose()
    }
    render(text)
  }

  openRecap(
    state: GameState,
    onDepart: () => void,
    onStay: () => void,
  ): void {
    const wrap = this.openModal()
    const card = el('div', 'modal recap', wrap)
    const star = state.photos.filter((p) => p.selfie && p.withStatue).length
    const goals = GOALS.filter((g) => state.goalsDone.has(g.id)).length
    const strip = state.photos
      .slice(-6)
      .map((p) => `<img src="${p.dataUrl}" class="recap-ph ${p.selfie && p.withStatue ? 'gold' : ''}"/>`)
      .join('')
    card.innerHTML = `
      <div class="modal-head"><span class="m-emoji">⛴️</span>
        <div><h2>Sail back to the city?</h2><div class="m-blurb">The crew is ready when you are.</div></div>
        <button class="close-btn">✕</button></div>
      <div class="recap-body">
        <div class="recap-stats">
          <div>📋 Checklist: <b>${goals}/${GOALS.length}</b></div>
          <div>📸 Photos: <b>${state.photos.length}</b> (⭐ ${star})</div>
          <div>🛍️ Souvenirs &amp; snacks: <b>${state.itemsBought}</b></div>
          <div>🪶 Food lost to gulls: <b>${state.foodStolenCount}</b></div>
          <div>🚶 Distance walked: <b>${(state.distanceWalked / 1000).toFixed(2)} km</b></div>
        </div>
        <div class="recap-strip">${strip || '<i>No photos… Lady Liberty is still waiting for that selfie!</i>'}</div>
      </div>
      <div class="d-actions center">
        <button class="big-btn depart-btn">⛴️ Sail home — end the day</button>
        <button class="big-btn ghost stay-btn">🗽 Stay a little longer</button>
      </div>`
    card.querySelector('.depart-btn')!.addEventListener('click', () => {
      this.closeModal()
      onDepart()
    })
    const stay = () => {
      this.closeModal()
      onStay()
    }
    card.querySelector('.stay-btn')!.addEventListener('click', stay)
    card.querySelector('.close-btn')!.addEventListener('click', stay)
  }

  showEndCard(state: GameState, onAgain: () => void): void {
    const wrap = this.openModal()
    const card = el('div', 'title-screen end', wrap)
    const star = state.photos.some((p) => p.selfie && p.withStatue)
    const goals = GOALS.filter((g) => state.goalsDone.has(g.id)).length
    card.innerHTML = `
      <div class="t-statue">🌆</div>
      <h1>${star ? 'WHAT A DAY!' : 'UNTIL NEXT TIME'}</h1>
      <div class="t-sub">${star ? 'You got the shot — Lady Liberty and you.' : 'The harbor will be here when you return.'}</div>
      <div class="t-desc">Checklist ${goals}/${GOALS.length} · ${state.photos.length} photos · ${(state.distanceWalked / 1000).toFixed(2)} km walked${state.foodStolenCount ? ` · ${state.foodStolenCount} snack(s) donated to seagulls` : ''}</div>
      <button class="big-btn">🗽 Visit Again</button>`
    card.querySelector('button')!.addEventListener('click', () => window.location.reload())
  }
}
