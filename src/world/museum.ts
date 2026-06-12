// The Statue of Liberty Museum (2019, FXCollaborative): angular granite +
// glass pavilion with a walkable sloping green roof. Inside, the real visitor
// flow: Immersive Theater ("Liberty Rising"), Engagement Gallery (Bartholdi's
// workshop — full-scale copper face & foot replicas, armature), and the
// Inspiration Gallery — the ORIGINAL 1886 torch before a glass wall facing
// the statue, plus the "Becoming Liberty" collage where YOUR selfie appears.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl, sph, cone, textPlane } from './materials'
import { BUILDINGS } from '../data/layout'
import { addWallsLocal, addRotRectZone, addBoxLocal, l2w, type Placement } from './worldutil'
import { mulberry } from './environment'
import type { GameContext } from '../core/context'

export interface Museum {
  group: THREE.Group
  update(dt: number, t: number): void
}

export function buildMuseum(ctx: GameContext): Museum {
  const B = BUILDINGS.museum
  const place: Placement = { cx: B.x, cz: B.z, rotY: B.rotY }
  const g = new THREE.Group()
  g.position.set(B.x, 0, B.z)
  g.rotation.y = B.rotY
  ctx.scene.add(g)
  const rng = mulberry(2019)

  const hw = B.w / 2 // 28
  const hd = B.d / 2 // 16
  const wallH = 6

  // ------------------------------------------------------- exterior ---
  // granite end walls + back wall, glass front (faces the statue, local +z)
  const graniteMat = mat(0x8f8d86, { rough: 0.95 })
  const backWall = box(B.w, wallH, 0.7, 0x8f8d86)
  backWall.position.set(0, wallH / 2, -hd)
  g.add(backWall)
  for (const side of [-1, 1]) {
    const end = box(0.7, wallH, B.d, 0x8f8d86)
    end.position.set(side * hw, wallH / 2, 0)
    g.add(end)
  }
  // glass curtain wall with mullions (front)
  const glassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.glass,
    transparent: true,
    opacity: 0.32,
    roughness: 0.15,
    metalness: 0.1,
    side: THREE.DoubleSide,
  })
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(B.w - 1.4, wallH - 0.4), glassMat)
  glass.position.set(0, wallH / 2, hd)
  g.add(glass)
  for (let i = 0; i <= 12; i++) {
    const mull = box(0.12, wallH, 0.12, 0x4a5258)
    mull.position.set(-hw + 1 + (i * (B.w - 2)) / 12, wallH / 2, hd)
    g.add(mull)
  }
  // sloping green roof, walkable from the back (overlaps walls — no seams)
  const roofLen = Math.hypot(B.d + 13, wallH + 1)
  const roof = box(B.w + 2, 0.5, roofLen, PALETTE.roofGreen)
  roof.position.set(0, wallH / 2 + 1.05, -0.4)
  roof.rotation.x = -Math.atan2(wallH + 1, B.d + 13)
  roof.castShadow = true
  g.add(roof)
  // roof meadow grass tufts
  for (let i = 0; i < 26; i++) {
    const tuft = cone(0.22, 0.5, 0x86a86a, 5)
    const lx = (rng() - 0.5) * (B.w - 4)
    const t = rng()
    const lz = -hd - 4 + t * (B.d + 6)
    const ly = ((lz + hd + 5) / (B.d + 10)) * (wallH + 1) + 0.35
    tuft.position.set(lx, ly, lz)
    tuft.rotation.x = -Math.atan2(wallH + 1, B.d + 10)
    g.add(tuft)
  }
  // roof terrace parapet at the top edge
  const parapet = box(B.w + 2, 0.9, 0.25, 0x8f8d86)
  parapet.position.set(0, wallH + 1.6, hd + 0.4)
  g.add(parapet)
  // big entry sign
  const sign = textPlane(['STATUE OF LIBERTY MUSEUM'], { w: 12, h: 1.1, bg: '#41525e', fg: '#f2efe4' })
  sign.position.set(-hw + 8.4, wallH + 0.8, hd + 0.1)
  g.add(sign)

  // walkable roof: ramp up the green slope (from behind) + terrace strip
  const rampStartW = l2w(place, 0, -hd - 9)
  const rampEndW = l2w(place, 0, hd - 1)
  ctx.colliders.ramp(rampStartW[0], rampStartW[1], rampEndW[0], rampEndW[1], B.w - 4, 0, wallH + 1.35, 4)
  // terrace edge containment
  addWallsLocal(ctx.colliders, place, [[-hw, hd + 0.5, hw, hd + 0.5]], wallH - 1, wallH + 2.6)
  addWallsLocal(
    ctx.colliders,
    place,
    [
      [-hw - 1, -hd - 9, -hw - 1, hd],
      [hw + 1, -hd - 9, hw + 1, hd],
    ],
    1.2,
    wallH + 2.6,
  )

  // ------------------------------------------------- exterior walls ---
  // door gap on the glass front (local x ≈ +18)
  const doorX = hw - 9
  addWallsLocal(
    ctx.colliders,
    place,
    [
      [-hw, -hd, hw, -hd], // back
      [-hw, -hd, -hw, hd], // west end
      [hw, -hd, hw, hd], // east end
      [-hw, hd, doorX - 1.6, hd], // front, left of door
      [doorX + 1.6, hd, hw, hd], // front, right of door
    ],
    0,
    wallH,
  )
  // entry mat + door frame
  const frame = box(3.6, 4.4, 0.3, 0x3a4248)
  frame.position.set(doorX, 2.2, hd)
  g.add(frame)
  const doorMat = box(3.2, 0.06, 2.2, 0x5a6168)
  doorMat.position.set(doorX, 0.04, hd - 0.4)
  g.add(doorMat)

  // interior light
  for (const lx of [-hw + 8, 0, hw - 8]) {
    const li = new THREE.PointLight(0xfff2dc, 90, 30)
    li.position.set(lx, 4.6, 0)
    g.add(li)
  }
  const floor = box(B.w - 0.8, 0.08, B.d - 0.8, 0x9c948a)
  floor.position.y = 0.04
  floor.receiveShadow = true
  g.add(floor)

  // ════════════════════════════════════════ 1 · IMMERSIVE THEATER ═══
  // west third, dark room with three curved screens playing "Liberty Rising"
  const theaterDivX = -hw + 19
  addWallsLocal(
    ctx.colliders,
    place,
    [
      [theaterDivX, -hd, theaterDivX, -2.2], // partition with gap
      [theaterDivX, 2.2, theaterDivX, hd],
    ],
    0,
    wallH,
  )
  const partition1 = box(0.4, wallH, B.d, 0x2c3138)
  partition1.position.set(theaterDivX, wallH / 2, 0)
  g.add(partition1)
  const theaterLabel = textPlane(['IMMERSIVE THEATER', '“Liberty Rising”'], { w: 4.2, h: 1.2, bg: '#1e242b', fg: '#e9c46a' })
  theaterLabel.position.set(theaterDivX + 0.25, 4.2, 0)
  theaterLabel.rotation.y = Math.PI / 2
  g.add(theaterLabel)

  // animated film canvas
  const filmCanvas = document.createElement('canvas')
  filmCanvas.width = 512
  filmCanvas.height = 192
  const filmTex = new THREE.CanvasTexture(filmCanvas)
  filmTex.colorSpace = THREE.SRGBColorSpace
  const screenMat = new THREE.MeshBasicMaterial({ map: filmTex })
  for (let s = 0; s < 3; s++) {
    const screen = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 4.4, 12, 1, true, -0.5, 1.0), screenMat)
    screen.position.set(-hw + 7.5, 2.9, -6.5 + s * 6.5)
    screen.rotation.y = Math.PI / 2 - 0.5
    g.add(screen)
  }
  // theater benches
  for (let r = 0; r < 3; r++) {
    const benchT = box(1.0, 0.55, 9, 0x3a4046)
    benchT.position.set(-hw + 12 + r * 2.1, 0.28, 0)
    g.add(benchT)
    addBoxLocal(ctx.colliders, place, -hw + 12 + r * 2.1, 0, 0.5, 4.5, 0, 1)
  }

  // ═══════════════════════════════════ 2 · ENGAGEMENT GALLERY ═══════
  // middle: Bartholdi's warehouse — scaffolds, full-scale face & foot
  const engDivX = hw - 17
  addWallsLocal(
    ctx.colliders,
    place,
    [
      [engDivX, -hd, engDivX, -2.2],
      [engDivX, 2.2, engDivX, hd],
    ],
    0,
    wallH,
  )
  const partition2 = box(0.4, wallH, B.d, 0xa39884)
  partition2.position.set(engDivX, wallH / 2, 0)
  g.add(partition2)
  const engLabel = textPlane(['ENGAGEMENT GALLERY', "Bartholdi's Workshop"], { w: 4.6, h: 1.2, bg: '#6d5b44', fg: '#f3ecd8' })
  engLabel.position.set(engDivX - 0.25, 4.2, 0)
  engLabel.rotation.y = -Math.PI / 2
  g.add(engLabel)

  const midX = (theaterDivX + engDivX) / 2
  // wooden scaffold tower
  const scaffold = new THREE.Group()
  for (const [sx, sz] of [
    [-1.6, -1.6],
    [1.6, -1.6],
    [-1.6, 1.6],
    [1.6, 1.6],
  ]) {
    const postS = cyl(0.09, 0.09, 5, PALETTE.wood, 6)
    postS.position.set(sx, 2.5, sz)
    scaffold.add(postS)
  }
  for (let lvl = 1; lvl <= 2; lvl++) {
    const plank = box(3.6, 0.12, 3.6, PALETTE.woodLight)
    plank.position.y = lvl * 1.8
    scaffold.add(plank)
  }
  scaffold.position.set(midX - 4.5, 0, -4)
  g.add(scaffold)
  addBoxLocal(ctx.colliders, place, midX - 4.5, -4, 1.9, 1.9, 0, 5)

  // full-scale UNPATINATED copper face replica (like the workshop displays)
  const face = new THREE.Group()
  const faceShell = sph(1.7, PALETTE.copperRaw, 12)
  faceShell.scale.set(0.95, 1.15, 0.7)
  face.add(faceShell)
  const noseR = box(0.34, 0.8, 0.5, PALETTE.copperRaw)
  noseR.position.set(0, -0.1, 1.1)
  face.add(noseR)
  face.position.set(midX - 4.5, 3.1, -4)
  face.rotation.x = -0.3
  g.add(face)
  const facePlaque = textPlane(['FULL-SCALE FACE', 'hammered copper, 2.4mm thin'], { w: 2.6, h: 0.7, bg: '#5d5246', fg: '#f3ecd8' })
  facePlaque.position.set(midX - 4.5, 1.3, -1.8)
  g.add(facePlaque)

  // full-scale foot replica
  const foot = box(2.2, 1.2, 4.2, PALETTE.copperRaw)
  foot.position.set(midX + 3.6, 0.8, -4.5)
  g.add(foot)
  for (let i = 0; i < 4; i++) {
    const toe = sph(0.42 - i * 0.06, PALETTE.copperRaw, 7)
    toe.position.set(midX + 2.8 + i * 0.55, 0.5, -2.5)
    g.add(toe)
  }
  addBoxLocal(ctx.colliders, place, midX + 3.6, -4.5, 1.3, 2.3, 0, 1.6)
  const footPlaque = textPlane(['HER SANDALED FOOT', 'size ≈ US 879'], { w: 2.4, h: 0.7, bg: '#5d5246', fg: '#f3ecd8' })
  footPlaque.position.set(midX + 3.6, 1.9, -2.1)
  g.add(footPlaque)

  // armature exhibit: mini Eiffel pylon
  const pylon = new THREE.Group()
  for (const [sx, sz] of [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
  ]) {
    const postP = box(0.12, 3.4, 0.12, 0x6d4a35)
    postP.position.set(sx, 1.7, sz)
    pylon.add(postP)
  }
  for (let i = 0; i < 4; i++) {
    const brace = box(1.5, 0.08, 0.08, 0x6d4a35)
    brace.position.set(0, 0.6 + i * 0.85, -0.5)
    brace.rotation.z = i % 2 ? 0.5 : -0.5
    pylon.add(brace)
  }
  pylon.position.set(midX, 0, 4.5)
  g.add(pylon)
  const pylonPlaque = textPlane(["EIFFEL'S ARMATURE", 'the skeleton within'], { w: 2.4, h: 0.7, bg: '#5d5246', fg: '#f3ecd8' })
  pylonPlaque.position.set(midX, 1.4, 6.4)
  pylonPlaque.rotation.y = Math.PI
  g.add(pylonPlaque)
  // workbench with tools
  const benchW = box(3, 0.95, 1.2, PALETTE.wood)
  benchW.position.set(midX - 1, 0.48, 6.2)
  g.add(benchW)
  for (let i = 0; i < 5; i++) {
    const hammer = box(0.12, 0.1, 0.45, 0x4a4438)
    hammer.position.set(midX - 2.2 + i * 0.6, 1.0, 6.2)
    hammer.rotation.y = rng()
    g.add(hammer)
  }
  addBoxLocal(ctx.colliders, place, midX - 1, 6.2, 1.6, 0.7, 0, 1.1)

  // ═══════════════════════════════ 3 · INSPIRATION GALLERY ══════════
  // east end: the ORIGINAL 1886 TORCH + Becoming Liberty collage
  const torchX = hw - 8.5
  // display dais
  const dais = cyl(2.6, 3.0, 0.5, 0x8f8d86, 14)
  dais.position.set(torchX, 0.25, -2)
  g.add(dais)
  ctx.colliders.addCircle(...l2w(place, torchX, -2), 2.2)
  // original torch: copper body, AMBER GLASS flame (as modified over its century)
  const oTorch = new THREE.Group()
  const oHandle = cyl(0.4, 0.55, 3.4, PALETTE.copperRaw, 10)
  oHandle.position.y = 2.2
  oTorch.add(oHandle)
  const oGallery = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 6, 18), mat(PALETTE.copperRaw))
  oGallery.rotation.x = Math.PI / 2
  oGallery.position.y = 4.2
  oTorch.add(oGallery)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const rod = cyl(0.05, 0.05, 0.8, PALETTE.copperRaw, 5)
    rod.position.set(Math.cos(a) * 1.25, 3.8, Math.sin(a) * 1.25)
    oTorch.add(rod)
  }
  const oFlame = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0, 1),
    mat(0xd99a3d, { rough: 0.1, emissive: 0xe9a93d, emissiveIntensity: 0.75, transparent: true, opacity: 0.92 }),
  )
  oFlame.scale.set(0.85, 1.7, 0.85)
  oFlame.position.y = 5.6
  oTorch.add(oFlame)
  oTorch.position.set(torchX, 0.5, -2)
  g.add(oTorch)
  const torchSpot = new THREE.PointLight(0xffd9a0, 110, 20)
  torchSpot.position.set(torchX, 6.5, -2)
  g.add(torchSpot)
  const oPlaque = textPlane(
    ['THE ORIGINAL TORCH · 1886–1984', 'Carried by Liberty for 98 years,', 'its copper flame remade in amber glass.', 'Retired with honor, 1984.'],
    { w: 4.4, h: 1.7, bg: '#41525e', fg: '#f2efe4' },
  )
  oPlaque.position.set(torchX, 1.9, 2.2)
  oPlaque.rotation.y = Math.PI
  g.add(oPlaque)

  // “Becoming Liberty” collage wall — your selfies join it!
  const collageCanvas = document.createElement('canvas')
  collageCanvas.width = 640
  collageCanvas.height = 320
  const cg = collageCanvas.getContext('2d')!
  cg.fillStyle = '#2e4a66'
  cg.fillRect(0, 0, 640, 320)
  const tones = ['#e9c46a', '#f4a261', '#e76f51', '#2a9d8f', '#8ab17d', '#babb74']
  for (let ty = 0; ty < 4; ty++)
    for (let tx = 0; tx < 8; tx++) {
      cg.fillStyle = tones[Math.floor(rng() * tones.length)]
      cg.fillRect(8 + tx * 79, 8 + ty * 78, 71, 70)
      cg.fillStyle = '#27313a'
      // tiny abstract portrait: head + shoulders
      cg.beginPath()
      cg.arc(8 + tx * 79 + 35, 8 + ty * 78 + 26, 13, 0, Math.PI * 2)
      cg.fill()
      cg.fillRect(8 + tx * 79 + 16, 8 + ty * 78 + 42, 39, 24)
    }
  cg.fillStyle = '#fff'
  cg.font = '800 22px Trebuchet MS'
  cg.textAlign = 'center'
  cg.fillText('BECOMING LIBERTY', 320, 304)
  const collageTex = new THREE.CanvasTexture(collageCanvas)
  collageTex.colorSpace = THREE.SRGBColorSpace
  const collage = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.5), new THREE.MeshStandardMaterial({ map: collageTex, roughness: 0.85 }))
  collage.position.set(hw - 0.6, 3, 0)
  collage.rotation.y = -Math.PI / 2
  g.add(collage)

  // hook: photo system pushes player selfies into the collage
  const slots: [number, number][] = []
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 8; tx++) slots.push([8 + tx * 79, 8 + ty * 78])
  let slotIdx = 0
  ctx.hooks.addPhotoToCollage = (dataUrl: string) => {
    const img = new Image()
    img.onload = () => {
      const [sx, sy] = slots[(slotIdx * 13) % slots.length]
      slotIdx++
      const size = Math.min(img.width, img.height)
      cg.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, sx, sy, 71, 70)
      cg.strokeStyle = '#e9b64f'
      cg.lineWidth = 4
      cg.strokeRect(sx + 2, sy + 2, 67, 66)
      collageTex.needsUpdate = true
    }
    img.src = dataUrl
  }

  // interactables
  ctx.interactables.push({
    x: l2w(place, torchX, 1.6)[0],
    z: l2w(place, torchX, 1.6)[1],
    radius: 3.2,
    label: 'Admire the <b>Original Torch</b>',
    onUse: () => {
      if (ctx.hooks) {
        ctx.hooks.goalDone('museum', '🔥 The Original Torch', 'Liberty\'s first flame, 1886–1984. Goosebumps.')
      }
    },
  })
  ctx.interactables.push({
    x: l2w(place, hw - 1.6, 0)[0],
    z: l2w(place, hw - 1.6, 0)[1],
    radius: 3.4,
    label: 'View <b>“Becoming Liberty”</b> collage',
    onUse: () => {
      ctx.ui.toast(
        ctx.state.photos.length
          ? '🖼️ Your photos join thousands of faces who became part of her story.'
          : '🖼️ Take a selfie with the statue and it will appear on this wall!',
        4500,
      )
    },
  })

  // indoor zone bounds (for state.indoors)
  const inside = (x: number, z: number): boolean => {
    const c = Math.cos(place.rotY)
    const s = Math.sin(place.rotY)
    const dx = x - place.cx
    const dz = z - place.cz
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    return Math.abs(lx) < hw && Math.abs(lz) < hd
  }

  let filmT = 0
  return {
    group: g,
    update(dt: number, t: number): void {
      // animated “Liberty Rising” film: harbor flyover gradient + silhouette
      filmT += dt
      if (filmT > 0.45) {
        filmT = 0
        const w = 512
        const h = 192
        const grad = cg2(filmCanvas)
        const sky = grad.createLinearGradient(0, 0, 0, h)
        const phase = (Math.sin(t * 0.25) + 1) / 2
        sky.addColorStop(0, `rgb(${90 + phase * 60},${120 + phase * 50},${150 + phase * 40})`)
        sky.addColorStop(1, '#dfe6e8')
        grad.fillStyle = sky
        grad.fillRect(0, 0, w, h)
        grad.fillStyle = '#46606b'
        grad.fillRect(0, h - 36, w, 36)
        // statue silhouette sweeping across
        const sx = ((t * 22) % (w + 160)) - 80
        grad.fillStyle = '#2c3a42'
        grad.fillRect(sx - 5, 60, 10, 96) // body
        grad.beginPath()
        grad.arc(sx, 56, 9, 0, Math.PI * 2)
        grad.fill()
        grad.fillRect(sx + 6, 28, 3, 34) // raised arm
        grad.beginPath()
        grad.moveTo(sx + 7.5, 20)
        grad.lineTo(sx + 2, 30)
        grad.lineTo(sx + 13, 30)
        grad.fill()
        for (let i = 0; i < 5; i++) {
          grad.fillRect(sx - 14 + i * 2, 50 - i * 2, 1.6, 8)
        }
        grad.fillStyle = 'rgba(255,255,255,0.92)'
        grad.font = '800 26px Trebuchet MS'
        grad.textAlign = 'center'
        grad.fillText('LIBERTY RISING', w / 2, 30)
        filmTex.needsUpdate = true
      }
      const p = ctx.hooks.playerPos()
      if (inside(p.x, p.z)) ctx.state.indoors = true
      // gentle bob for the original torch flame
      oFlame.rotation.y += dt * 0.4
    },
  }
}

function cg2(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext('2d')!
}
