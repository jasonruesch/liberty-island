import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
const p = await b.newPage()
await p.goto('http://localhost:5173', { waitUntil: 'load' })
await p.waitForSelector('canvas.game')
await new Promise(r => setTimeout(r, 2500))
const res = await p.evaluate(() => {
  const c = window.__liberty.ctx.colliders
  const probe = (label, x, z, y) => `${label}: ${(c.groundAt(x, z, y) ?? 'null')}`
  return [
    probe('helix r1.8 climbing y58.4', 116.5, -7.0, 58.4),
    probe('helix r1.8 start y44.5', 120.4, -6, 44.8),
    probe('helix r1.8 near top y71', 116.5, -7.0, 71.5),
  ].join('\n')
})
console.log(res)
await b.close()
