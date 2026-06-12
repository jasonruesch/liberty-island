// Liberty Island — A Wobbly Day Out
// Boot, game loop, and the day's arc: title → ferry arrival → island →
// return ferry → end card.

import './style.css'
import * as THREE from 'three'
import { GameState, GOALS } from './core/state'
import { Input } from './core/input'
import { AudioSys } from './core/audio'
import { UI } from './core/ui'
import { ColliderWorld } from './core/collision'
import type { GameContext } from './core/context'
import { buildEnvironment } from './world/environment'
import { buildIsland } from './world/island'
import { buildStatue } from './world/statue'
import { buildMuseum } from './world/museum'
import { buildBuildings } from './world/buildings'
import { buildDock } from './world/dock'
import { Ferry } from './world/ferry'
import { Player } from './actors/player'
import { NpcManager } from './actors/npc'
import { Birds } from './actors/birds'
import { PhotoSystem } from './systems/photo'
import { Interactions } from './systems/interactions'
import { Confetti } from './systems/confetti'
import { FORT, PROMENADE_CHECKPOINTS, FLAG_PLAZA, BUILDINGS, DOCK } from './data/layout'

// ----------------------------------------------------------- bootstrap ---
const app = document.getElementById('app')!
const canvas = document.createElement('canvas')
canvas.className = 'game'
app.appendChild(canvas)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 5200)
camera.position.set(60, 40, 220)

const state = new GameState()
const input = new Input(canvas)
const audio = new AudioSys()
const ui = new UI(app)
const colliders = new ColliderWorld()

const ctx: GameContext = {
  scene,
  camera,
  renderer,
  canvas,
  state,
  input,
  audio,
  ui,
  colliders,
  interactables: [],
  time: 0,
  hooks: {
    playerPos: () => new THREE.Vector3(),
    playerVel: () => new THREE.Vector3(),
    addPhotoToCollage: () => {},
    confettiAt: () => {},
    npcCheer: () => {},
    goalDone: () => {},
    requestReturnFerry: () => {},
    onBite: () => {},
  },
}

// ----------------------------------------------------------- build world ---
const environment = buildEnvironment(ctx)
const island = buildIsland(ctx)
const statue = buildStatue(ctx)
const museum = buildMuseum(ctx)
const buildings = buildBuildings(ctx)
buildDock(ctx)
const ferry = new Ferry(ctx)
const player = new Player(ctx)
player.group.visible = false
const confetti = new Confetti(scene)

// hooks that everything else needs
const playerWorld = new THREE.Vector3()
ctx.hooks.playerPos = () => player.getWorldPos(playerWorld)
ctx.hooks.playerVel = () => player.vel
ctx.hooks.confettiAt = (x, y, z) => confetti.burst(x, y, z)
ctx.hooks.goalDone = (id, title, sub) => {
  if (state.completeGoal(id)) {
    audio.achievement()
    ui.celebrate(title, sub)
    const p = ctx.hooks.playerPos()
    confetti.burst(p.x, p.y + 1.6, p.z, 60)
    if (state.allGoalsDone) {
      setTimeout(() => {
        audio.fanfare()
        ui.celebrate('🏆 A PERFECT DAY', 'Every single thing on the checklist. Lady Liberty is impressed.')
        const q = ctx.hooks.playerPos()
        confetti.burst(q.x, q.y + 3, q.z, 200)
      }, 3600)
    }
  }
}

const npcs = new NpcManager(ctx, ferry)
ctx.hooks.npcCheer = () => npcs.cheerAll()

const birds = new Birds(ctx, {
  holdingFood: () => player.holdingFood(),
  heldItemId: () => state.equipped?.item.id ?? 'fries',
  playerPos: () => ctx.hooks.playerPos(),
  playerSpeed: () => Math.hypot(player.vel.x, player.vel.z),
  loseFood: () => player.loseHeldFood(),
  isSheltered: (x, z) => buildings.isSheltered(x, z),
})
ctx.hooks.onBite = (pos) => birds.notifyBite(pos)

const photo = new PhotoSystem(ctx, player, { head: statue.headWorld, torch: statue.torchWorld })
const interactions = new Interactions(ctx)

// ------------------------------------------------------- state → UI sync ---
state.onChange(() => {
  ui.syncGoals(state)
  ui.setWallet(state.wallet)
  ui.syncHotbar(state)
  player.syncHeld()
})
ui.syncGoals(state)
ui.setWallet(state.wallet)
ui.syncHotbar(state)
ui.onModalChange = (open) => {
  input.uiCapture = open
  if (open) input.releaseLock()
}

// --------------------------------------------------------- return ferry ---
ctx.interactables.push({
  x: -146.8,
  z: 130.4,
  radius: 3.4,
  label: 'Board the <b>ferry to Manhattan</b>',
  enabled: () => state.phase === 'island' && ferry.state === 'docked',
  onUse: () => {
    input.releaseLock()
    ui.openRecap(
      state,
      () => beginReturn(),
      () => input.requestLock(),
    )
  },
})

function beginReturn(): void {
  state.phase = 'return'
  state.emit()
  player.boardFerry(ferry, 0, -2)
  ui.letterbox(true)
  ui.setSubtitle('She watches every departure too — torch up, lighting the way home.')
  setTimeout(() => ui.setSubtitle(null), 7000)
  ferry.beginDeparture()
  ui.setHint('Wave goodbye! 🗽 Walk the deck as Manhattan grows closer.')
}

ferry.onAway = async () => {
  state.phase = 'ended'
  await ui.fade(true, 1200)
  ui.letterbox(false)
  ui.showEndCard(state, () => window.location.reload())
  await ui.fade(false, 600)
}

// ------------------------------------------------------------ arrival ---
ferry.onDocked = () => {
  ctx.hooks.goalDone('arrive', '⛴️ Liberty Island!', 'Watch your step on the gangway.')
  npcs.disembark()
  ui.setSubtitle(null)
  ui.letterbox(false)
  ui.setHint('Follow the gangway off the boat — the island is yours. <b>E</b> to talk & use, <b>P</b> for camera.')
}

let arrivalT = 0
const ARRIVAL_SUBS: [number, string][] = [
  [1.5, '🗽 New York Harbor — a cloudy spring noon.'],
  [9, 'Your ferry hums with travelers from every corner of the world.'],
  [20, 'Walk the deck! Find a spot at the rail. (WASD · Space · V for first-person)'],
  [31, 'There she is — <b>Liberty Enlightening the World</b>. 93 meters of welcome.'],
  [40, 'Cameras out! 📷 Press <b>P</b> — the approach is the postcard.'],
]
let nextSub = 0

function startGame(): void {
  audio.init()
  state.phase = 'arrival'
  state.emit()
  player.group.visible = true
  player.boardFerry(ferry, 0, -4)
  ui.letterbox(true)
  input.requestLock()
  ui.setHint('<b>WASD</b> walk · <b>Space</b> jump · <b>Shift</b> run · <b>V</b> view · <b>P</b> camera · <b>E</b> talk')
}

ui.showTitle(startGame)

// --------------------------------------------------------------- hints ---
const ISLAND_HINTS = [
  'Press <b>P</b> for your camera — <b>F</b> flips to selfie mode. 🤳',
  'The Crown Café is by the Café Plaza — burgers, chowder, the works. 🍔',
  'Foam crowns at the Gift Pavilion. You know you want one. 👑',
  'Eating outside? Keep moving — the gulls are watching. 🪶',
  'The museum’s Inspiration Gallery holds the original 1886 torch. 🔥',
  'Crown tickets! Enter the pedestal on its west side, then climb. 162 steps. 👑',
  'Walk the full promenade — four corners of harbor views. 🚶',
  'Press <b>Tab</b> for your photo gallery — save any shot as a PNG. 🖼️',
  '<b>M</b> toggles the music. <b>V</b> toggles first-person.',
  'Talk to travelers with <b>E</b> — everyone has a story today. 💬',
]
let hintIdx = 0
let hintTimer = 18

// --------------------------------------------------------- promenade ---
function checkPromenade(): void {
  if (state.goalsDone.has('promenade')) return
  const p = ctx.hooks.playerPos()
  for (const cp of PROMENADE_CHECKPOINTS) {
    if (!state.promenadeCheckpoints.has(cp.id) && Math.hypot(p.x - cp.x, p.z - cp.z) < 16) {
      state.promenadeCheckpoints.add(cp.id)
      state.emit()
      if (state.promenadeCheckpoints.size === 4) {
        ctx.hooks.goalDone('promenade', '🚶 Full Loop!', 'Manhattan, Ellis, Jersey, the Narrows — you saw it all.')
      } else {
        ui.toast(`🧭 Promenade checkpoint ${state.promenadeCheckpoints.size}/4`)
      }
    }
  }
}

// ---------------------------------------------------------- audio mix ---
function audioLevels(): { crowd: number; engine: number; shore: number } {
  const p = ctx.hooks.playerPos()
  const crowdSpots: [number, number][] = [
    [FLAG_PLAZA.x, FLAG_PLAZA.z],
    [BUILDINGS.cafePlaza.x, BUILDINGS.cafePlaza.z],
    [DOCK.rootX, DOCK.rootZ],
  ]
  let crowd = 0
  for (const [cx, cz] of crowdSpots) {
    crowd = Math.max(crowd, 1 - Math.min(1, Math.hypot(p.x - cx, p.z - cz) / 55))
  }
  if (state.indoors || state.insideStatue) crowd *= 0.4
  const ferryDist = ferry.group.position.distanceTo(p)
  const engine = ferry.engineLevel() * (state.onFerry ? 1 : Math.max(0, 1 - ferryDist / 90))
  const centerDist = Math.hypot(p.x, p.z + 5)
  let shore = Math.min(1, Math.max(0, (centerDist - 110) / 90))
  if (state.onFerry) shore = 1
  if (state.indoors || state.insideStatue) shore *= 0.2
  return { crowd, engine, shore }
}

// ------------------------------------------------------------ key input ---
function handleKeys(): void {
  if (input.pressedRaw('Escape') && photo.active) photo.exit()
  if (input.uiCapture) return
  if (input.pressed('KeyP')) photo.toggle()
  if (input.pressed('KeyQ') && photo.active) photo.exit()
  if (input.pressed('KeyF') && photo.active) photo.flip()
  if (input.clicked() && photo.active) photo.capture()
  if (input.pressed('KeyV') && !photo.active) player.toggleView()
  if (input.pressed('Tab')) {
    input.releaseLock()
    ui.openGallery(state.photos, () => input.requestLock())
  }
  if (input.pressed('KeyM')) {
    const on = audio.toggleMusic()
    ui.toast(on ? '🎵 Music on' : '🔇 Music off', 1400)
  }
  for (let i = 0; i < 8; i++) {
    if (input.pressed(`Digit${i + 1}`)) {
      player.equip(state.equippedIndex === i ? -1 : i)
    }
  }
  // click to re-lock pointer
  if (input.mouseDownLeft && !input.pointerLocked && !ui.modalOpen && state.phase !== 'title' && !photo.active) {
    input.requestLock()
  }
}

// ------------------------------------------------------------ main loop ---
const clock = new THREE.Clock()
let phaseSettled = false

function frame(): void {
  requestAnimationFrame(frame)
  const dt = Math.min(clock.getDelta(), 0.05)
  ctx.time += dt
  const t = ctx.time

  // reset per-frame flags the world modules re-assert
  state.indoors = false

  if (state.phase === 'title') {
    // slow orbit of the statue behind the title card
    const a = t * 0.045
    camera.position.set(FORT.x + Math.cos(a) * 170, 55 + Math.sin(t * 0.2) * 8, FORT.z + Math.sin(a) * 170)
    camera.lookAt(FORT.x, 48, FORT.z)
    environment.update(dt, t)
    island.update(dt, t)
    ferry.update(dt, t)
    renderer.render(scene, camera)
    input.endFrame()
    return
  }

  // arrival cinematic beats
  if (state.phase === 'arrival') {
    arrivalT += dt
    if (nextSub < ARRIVAL_SUBS.length && arrivalT >= ARRIVAL_SUBS[nextSub][0]) {
      ui.setSubtitle(ARRIVAL_SUBS[nextSub][1])
      const shown = nextSub
      nextSub++
      setTimeout(() => {
        if (nextSub === shown + 1) ui.setSubtitle(null)
      }, 6200)
    }
    if (arrivalT > 14) ui.letterbox(false)
    if (ferry.state === 'docked' && !state.onFerry && !phaseSettled) {
      phaseSettled = true
      state.phase = 'island'
      state.emit()
      ui.toast('🗽 Welcome to Liberty Island! Your checklist is top-left.', 5200)
    }
  }

  handleKeys()
  player.update(dt, t)
  ferry.update(dt, t)
  npcs.update(dt, t)
  birds.update(dt, t)
  statue.update(dt)
  museum.update(dt, t)
  buildings.update(dt)
  island.update(dt, t)
  environment.update(dt, t)
  interactions.update()
  confetti.update(dt)
  checkPromenade()
  audio.update(dt, audioLevels())

  // rotating hints while on the island
  if (state.phase === 'island') {
    hintTimer -= dt
    if (hintTimer <= 0) {
      hintTimer = 16
      ui.setHint(ISLAND_HINTS[hintIdx % ISLAND_HINTS.length])
      hintIdx++
    }
  }

  renderer.render(scene, camera)
  input.endFrame()
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// dev/test handle (harmless in production)
declare global {
  interface Window {
    __liberty?: unknown
  }
}
window.__liberty = { ctx, player, ferry, state, photo, npcs, startGame }

frame()
