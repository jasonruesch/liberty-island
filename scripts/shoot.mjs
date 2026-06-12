// Headless visual verification: drives the game with the __liberty debug
// handle and captures screenshots of the key moments.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const OUT = '/tmp/liberty-shots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--enable-webgl', '--window-size=1380,820', '--mute-audio'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1380, height: 820 })

const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`)
})

// teleport helper: place the player and aim the camera at a world target
const AIM = `(function(px, pz, tx, tz, pitch, py){
  const L = window.__liberty
  const p = L.player
  if (p.ferry) p.leaveFerry()
  const gy = py !== undefined ? py : L.ctx.colliders.groundAt(px, pz, 2)
  p.group.position.set(px, (gy ?? 0) + 0.1, pz)
  p.vel.set(0,0,0)
  const dx = tx - px, dz = tz - pz
  p.camYaw = Math.atan2(-dx, -dz)
  p.camPitch = pitch
})`

await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('canvas.game', { timeout: 20000 })
await sleep(3500)
await shot('01-title')

// start the game
await page.evaluate(() => {
  document.querySelector('.title-screen button')?.click()
})
await sleep(4500)
await shot('02-ferry-deck-start')

// jump the ferry to the statue flyby & look at her
await page.evaluate(() => {
  const L = window.__liberty
  L.ferry.progress = 0.7
})
await sleep(2200)
await page.evaluate(() => {
  const L = window.__liberty
  const p = L.player
  const fw = L.ferry.group.position
  const dx = 118 - fw.x, dz = -6 - fw.z
  p.camYaw = Math.atan2(-dx, -dz)
  p.camPitch = -0.3
})
await sleep(1000)
await shot('03-ferry-statue-flyby')

// dock
await page.evaluate(() => {
  window.__liberty.ferry.progress = 0.999
})
await sleep(3500)
await shot('04-docked')

// island phase + full statue view from the mall
await page.evaluate(() => {
  const L = window.__liberty
  L.state.phase = 'island'
  L.state.emit()
})
await page.evaluate(`${AIM}(48, 26, 118, -6, -0.55)`)
await page.evaluate(() => { window.__liberty.player.firstPerson = true })
await sleep(1600)
await shot('05-mall-statue-full')

// closer hero shot from the southeast (her face!)
await page.evaluate(`${AIM}(178, 44, 118, -6, -0.42)`)
await sleep(1500)
await shot('06-statue-face-se')

// flag plaza & buildings
await page.evaluate(() => { window.__liberty.player.firstPerson = false })
await page.evaluate(`${AIM}(-30, -22, -82, 28, 0.16)`)
await sleep(1400)
await shot('07-flag-plaza-toward-cafe')

// museum interior — inspiration gallery (force ground level, not the roof)
await page.evaluate(`${AIM}(-128, -47, -146, -58, 0.06, 0.05)`)
await sleep(1400)
await shot('08-museum-inspiration')

// café interior — counter & menus
await page.evaluate(`${AIM}(-82, 34, -89, 18, 0.12)`)
await sleep(1400)
await shot('09-cafe-counter')

// gift pavilion interior
await page.evaluate(`${AIM}(-44, 52, -34, 48, 0.1)`)
await sleep(1400)
await shot('10-gift-interior')

// pedestal observation deck looking up at her
await page.evaluate(() => {
  const L = window.__liberty
  const p = L.player
  p.group.position.set(118, 38.1, 0.8)
  p.vel.set(0, 0, 0)
  p.firstPerson = true
  p.camYaw = Math.PI // look north along the deck, statue above
  p.camPitch = -0.9
})
await sleep(1400)
await shot('11-pedestal-deck-lookup')
await page.evaluate(() => { window.__liberty.player.firstPerson = false })

// crown room
await page.evaluate(() => {
  const L = window.__liberty
  const p = L.player
  p.group.position.set(118.6, 72.1, -6)
  p.camYaw = Math.PI * 0.75
  p.camPitch = 0.05
})
await sleep(1400)
await shot('12-crown-room')

// selfie with the statue framed behind
await page.evaluate(() => {
  const L = window.__liberty
  const p = L.player
  if (p.ferry) p.leaveFerry()
  p.group.position.set(52, 0.1, 42)
  // selfie cam looks back through the player TOWARD the statue
  const dx = 118 - 52, dz = -6 - 42
  p.camYaw = Math.atan2(-dx, -dz)
  p.camPitch = -0.55
  L.photo.enter()
  L.photo.flip()
})
await sleep(1500)
await shot('13-selfie-statue')

// capture → goal + confetti + collage
await page.evaluate(() => {
  window.__liberty.photo.capture()
})
await sleep(1500)
await shot('14-selfie-goal')

await page.evaluate(() => {
  const L = window.__liberty
  L.photo.exit()
  L.ctx.ui.openGallery(L.state.photos, () => {})
})
await sleep(900)
await shot('15-gallery')

// museum collage with the player photo on it
await page.evaluate(() => {
  window.__liberty.ctx.ui.closeModal()
})
await page.evaluate(`${AIM}(-150, -62, -160, -70, 0.12)`)
await sleep(1400)
await shot('16-collage-wall')

console.log('ERRORS:', errors.length ? errors.slice(0, 12).join('\n') : 'none')
await browser.close()

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
