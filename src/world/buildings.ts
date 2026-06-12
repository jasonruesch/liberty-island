// The visitor buildings, placed per the NPS map: Crown Café + Eastern National
// bookstore (one building, with Café Plaza outside), the big Gift Pavilion
// next door, the Information Center, the Audio Tour Pavilion by the dock, the
// security-screening canopy at the Pedestal Entrance, and the spring
// ice-cream kiosk.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl, cone, textPlane } from './materials'
import { BUILDINGS } from '../data/layout'
import { CAFE_MENU, GIFT_CATALOG, BOOKSTORE_CATALOG, KIOSK_MENU } from '../data/shop'
import { addWallsLocal, addBoxLocal, l2w, type Placement } from './worldutil'
import { cafeTable, stanchionRow, iceCreamKiosk, signBoard } from './props'
import { openShopUI } from '../systems/shops'
import type { GameContext } from '../core/context'

export interface Buildings {
  group: THREE.Group
  /** true when x,z is under a roof (birds won't strike here) */
  isSheltered(x: number, z: number): boolean
  update(dt: number): void
}

function hipRoof(w: number, d: number, h: number, color: number): THREE.Mesh {
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 1, h, 4, 1), mat(color, { rough: 0.9 }))
  roof.scale.set(w / Math.SQRT2, 1, d / Math.SQRT2)
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  return roof
}

export function buildBuildings(ctx: GameContext): Buildings {
  const g = new THREE.Group()
  ctx.scene.add(g)
  const shelters: { x: number; z: number; r: number }[] = []
  // rotated interior rects → drives state.indoors (lighting, birds, audio)
  const interiors: { cx: number; cz: number; rot: number; hx: number; hz: number }[] = []

  // ════════════════════════════════════ CROWN CAFÉ + BOOKSTORE ═══
  {
    const B = BUILDINGS.cafe
    const place: Placement = { cx: B.x, cz: B.z, rotY: B.rotY }
    const hw = B.w / 2
    const hd = B.d / 2
    const wallH = 4.4
    const bg = new THREE.Group()
    bg.position.set(B.x, 0, B.z)
    bg.rotation.y = B.rotY
    g.add(bg)
    shelters.push({ x: B.x, z: B.z, r: Math.max(hw, hd) + 1 })
    interiors.push({ cx: B.x, cz: B.z, rot: B.rotY, hx: hw, hz: hd })

    // shell: white walls, big south windows, green hip roof
    const back = box(B.w, wallH, 0.5, PALETTE.white)
    back.position.set(0, wallH / 2, -hd)
    bg.add(back)
    for (const side of [-1, 1]) {
      const end = box(0.5, wallH, B.d, PALETTE.white)
      end.position.set(side * hw, wallH / 2, 0)
      bg.add(end)
    }
    const frontL = box(hw - 2.2, wallH, 0.5, PALETTE.white)
    frontL.position.set(-(hw / 2 + 1.1), wallH / 2, hd)
    bg.add(frontL)
    const frontR = box(hw - 2.2, wallH, 0.5, PALETTE.white)
    frontR.position.set(hw / 2 + 1.1, wallH / 2, hd)
    bg.add(frontR)
    const lintel = box(4.4, 1.2, 0.5, PALETTE.white)
    lintel.position.set(0, wallH - 0.6, hd)
    bg.add(lintel)
    // windows strip on front halves
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(hw - 5, 2.2),
        new THREE.MeshStandardMaterial({ color: PALETTE.glass, transparent: true, opacity: 0.4, roughness: 0.2 }),
      )
      win.position.set(side * (hw / 2 + 1.1), 2.1, hd + 0.05)
      bg.add(win)
    }
    const roof = hipRoof(B.w + 3, B.d + 3, 3, PALETTE.canopy)
    roof.position.y = wallH + 1.5
    bg.add(roof)
    const cafeSign = textPlane(['CROWN CAFÉ'], { w: 7, h: 1.1, bg: '#3e6b50', fg: '#f6f0e2' })
    cafeSign.position.set(-6, wallH + 0.4, hd + 0.4)
    bg.add(cafeSign)
    const bookSign = textPlane(['PARK STORE · BOOKS'], { w: 6, h: 0.85, bg: '#41525e', fg: '#f6f0e2' })
    bookSign.position.set(7.5, wallH + 0.3, hd + 0.4)
    bg.add(bookSign)
    const wcSign = textPlane(['RESTROOMS →'], { w: 2.8, h: 0.5, bg: '#41525e', fg: '#fff' })
    wcSign.position.set(-hw - 0.05, 2.6, 2)
    wcSign.rotation.y = -Math.PI / 2
    bg.add(wcSign)

    addWallsLocal(
      ctx.colliders,
      place,
      [
        [-hw, -hd, hw, -hd],
        [-hw, -hd, -hw, hd],
        [hw, -hd, hw, hd],
        [-hw, hd, -2.2, hd],
        [2.2, hd, hw, hd],
      ],
      0,
      wallH,
    )

    // interior
    const floor = box(B.w - 0.6, 0.06, B.d - 0.6, 0xb9a98c)
    floor.position.y = 0.03
    bg.add(floor)
    for (const lx of [-8, 6]) {
      const li = new THREE.PointLight(0xffefd2, 70, 22)
      li.position.set(lx, 3.6, 0)
      bg.add(li)
    }
    // café counter along the back (west half)
    const counter = box(13, 1.05, 1.3, PALETTE.wood)
    counter.position.set(-7, 0.53, -hd + 2.6)
    bg.add(counter)
    addBoxLocal(ctx.colliders, place, -7, -hd + 2.6, 6.5, 0.75, 0, 1.2)
    const counterTop = box(13.2, 0.08, 1.4, 0xe8e2d4)
    counterTop.position.set(-7, 1.08, -hd + 2.6)
    bg.add(counterTop)
    // menu boards above the counter
    const menuLines1 = ['CROWN CAFÉ — GRILL', 'Beast Burger ……… $16.30', 'Cheeseburger ……… $11.48', 'Hot Dog ………………… $6.43', 'Tenders n’ Fries … $12.86']
    const menuLines2 = ['HARBOR FAVORITES', 'Pepperoni Pizza … $14.24', 'Clam Chowder ……… $8.95', 'Fish n’ Chips …… $13.78', 'Empanadas (2) …… $14.00']
    const menuBoard1 = textPlane(menuLines1, { w: 5.4, h: 2.4, bg: '#27313a', fg: '#f3e9cf', align: 'left', pad: 14 })
    menuBoard1.position.set(-10, 3.1, -hd + 0.4)
    bg.add(menuBoard1)
    const menuBoard2 = textPlane(menuLines2, { w: 5.4, h: 2.4, bg: '#27313a', fg: '#f3e9cf', align: 'left', pad: 14 })
    menuBoard2.position.set(-4, 3.1, -hd + 0.4)
    bg.add(menuBoard2)
    // register + espresso machine + display fridge
    const register = box(0.6, 0.5, 0.5, 0x33383d)
    register.position.set(-3, 1.35, -hd + 2.6)
    bg.add(register)
    const espresso = box(1.4, 0.8, 0.8, 0x8e969c)
    espresso.position.set(-11, 1.5, -hd + 2.4)
    bg.add(espresso)
    const fridge = box(2.2, 2.6, 0.9, 0x9fc4cf)
    fridge.position.set(-hw + 1.6, 1.3, -hd + 3)
    bg.add(fridge)
    // food display: burgers/pizza props on the counter
    const burgerProp = new THREE.Group()
    const bunBot = cyl(0.22, 0.24, 0.1, 0xd9a35c, 10)
    const patty = cyl(0.24, 0.24, 0.08, 0x6d4a35, 10)
    patty.position.y = 0.09
    const bunTop = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9a35c))
    bunTop.position.y = 0.14
    burgerProp.add(bunBot, patty, bunTop)
    burgerProp.position.set(-8.5, 1.2, -hd + 2.5)
    bg.add(burgerProp)

    // indoor seating
    for (const [tx, tz] of [
      [-9, 2.5],
      [-5, 4.5],
      [-11.5, 5.5],
    ]) {
      const tbl = cafeTable(false)
      tbl.position.set(tx, 0, tz)
      bg.add(tbl)
      addBoxLocal(ctx.colliders, place, tx, tz, 0.7, 0.7, 0, 1.1)
    }

    // bookstore corner (east half)
    for (let r = 0; r < 3; r++) {
      const shelf = box(0.5, 2.2, 6, PALETTE.wood)
      shelf.position.set(5 + r * 3, 1.1, -hd + 4.5)
      bg.add(shelf)
      addBoxLocal(ctx.colliders, place, 5 + r * 3, -hd + 4.5, 0.4, 3.1, 0, 2.4)
      for (let b = 0; b < 12; b++) {
        const bookM = box(0.34, 0.42, 0.32, [0xc4484a, 0x2e4a66, 0x3e8f7c, 0xe9b64f][b % 4])
        bookM.position.set(5 + r * 3, 0.6 + Math.floor(b / 6) * 0.8, -hd + 2 + (b % 6) * 0.92)
        bg.add(bookM)
      }
    }
    const bookCounter = box(3, 1.0, 1, PALETTE.woodLight)
    bookCounter.position.set(hw - 3.4, 0.5, 0)
    bg.add(bookCounter)
    addBoxLocal(ctx.colliders, place, hw - 3.4, 0, 1.6, 0.6, 0, 1.1)

    // interactables: order counter + bookstore
    const cafeSpot = l2w(place, -7, -hd + 4.2)
    ctx.interactables.push({
      x: cafeSpot[0],
      z: cafeSpot[1],
      radius: 3,
      label: 'Order at the <b>Crown Café</b>',
      onUse: () => openShopUI(ctx, { title: 'Crown Café', emoji: '🍔', blurb: 'American favorites with a harbor view — Evelyn Hill Inc., serving Liberty Island since 1931.', items: CAFE_MENU }),
    })
    const bookSpot = l2w(place, hw - 3.4, 1.6)
    ctx.interactables.push({
      x: bookSpot[0],
      z: bookSpot[1],
      radius: 2.6,
      label: 'Browse the <b>Park Store</b>',
      onUse: () => openShopUI(ctx, { title: 'Eastern National Park Store', emoji: '📚', blurb: 'Books, guides & interpretive souvenirs.', items: BOOKSTORE_CATALOG }),
    })

    // café plaza outside: umbrella tables (outdoors — gulls welcome…)
    const P = BUILDINGS.cafePlaza
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3
      const tx = P.x + Math.cos(a) * (6 + (i % 2) * 4)
      const tz = P.z + Math.sin(a) * (5 + (i % 3) * 2.5)
      const tbl = cafeTable(true)
      tbl.position.set(tx, 0, tz)
      tbl.rotation.y = a
      g.add(tbl)
      ctx.colliders.addCircle(tx, tz, 0.65)
    }
  }

  // ════════════════════════════════════════════ GIFT PAVILION ═══
  {
    const B = BUILDINGS.giftPavilion
    const place: Placement = { cx: B.x, cz: B.z, rotY: B.rotY }
    const hw = B.w / 2
    const hd = B.d / 2
    const wallH = 4.2
    const bg = new THREE.Group()
    bg.position.set(B.x, 0, B.z)
    bg.rotation.y = B.rotY
    g.add(bg)
    shelters.push({ x: B.x, z: B.z, r: Math.max(hw, hd) + 1 })
    interiors.push({ cx: B.x, cz: B.z, rot: B.rotY, hx: hw, hz: hd })

    // warm wood walls + glass gable front (door faces west, toward café plaza)
    const wallMat = PALETTE.woodLight
    const back = box(0.5, wallH, B.d, wallMat)
    back.position.set(hw, wallH / 2, 0)
    bg.add(back)
    for (const side of [-1, 1]) {
      const lengthWall = box(B.w, wallH, 0.5, wallMat)
      lengthWall.position.set(0, wallH / 2, side * hd)
      bg.add(lengthWall)
    }
    const frontT = box(0.5, wallH, hd - 1.8, wallMat)
    frontT.position.set(-hw, wallH / 2, -(1.8 + (hd - 1.8) / 2))
    bg.add(frontT)
    const frontB = box(0.5, wallH, hd - 1.8, wallMat)
    frontB.position.set(-hw, wallH / 2, 1.8 + (hd - 1.8) / 2)
    bg.add(frontB)
    const lintel2 = box(0.5, 1.0, 3.6, wallMat)
    lintel2.position.set(-hw, wallH - 0.5, 0)
    bg.add(lintel2)
    const roof2 = hipRoof(B.w + 2.5, B.d + 2.5, 2.6, 0x6b4a36)
    roof2.position.y = wallH + 1.3
    bg.add(roof2)
    const giftSign = textPlane(['GIFT PAVILION', 'Statue of Liberty Souvenirs'], { w: 6.4, h: 1.4, bg: '#6b4a36', fg: '#f6ecd8' })
    giftSign.position.set(-hw - 0.4, wallH + 0.5, 0)
    giftSign.rotation.y = -Math.PI / 2
    bg.add(giftSign)

    addWallsLocal(
      ctx.colliders,
      place,
      [
        [hw, -hd, hw, hd],
        [-hw, -hd, hw, -hd],
        [-hw, hd, hw, hd],
        [-hw, -hd, -hw, -1.8],
        [-hw, 1.8, -hw, hd],
      ],
      0,
      wallH,
    )

    const floor = box(B.w - 0.6, 0.06, B.d - 0.6, 0xc9b896)
    floor.position.y = 0.03
    bg.add(floor)
    for (const lx of [-5, 5]) {
      const li = new THREE.PointLight(0xffefd2, 65, 20)
      li.position.set(lx, 3.4, 0)
      bg.add(li)
    }

    // central display tables
    // 1: foam crown stack
    const t1 = box(2.6, 0.9, 1.6, PALETTE.wood)
    t1.position.set(-5, 0.45, -2.5)
    bg.add(t1)
    addBoxLocal(ctx.colliders, place, -5, -2.5, 1.4, 0.9, 0, 1)
    for (let i = 0; i < 7; i++) {
      const crown = new THREE.Group()
      const band = cyl(0.26, 0.28, 0.16, 0x7fc4a8, 9)
      crown.add(band)
      for (let rIdx = 0; rIdx < 7; rIdx++) {
        const a = -Math.PI * 0.5 + (rIdx / 6) * Math.PI
        const spike = cone(0.05, 0.34, 0x7fc4a8, 4)
        spike.position.set(Math.sin(a) * 0.26, 0.18, -Math.cos(a) * 0.26)
        spike.rotation.x = -Math.cos(a) * 0.9
        spike.rotation.z = -Math.sin(a) * 0.9
        crown.add(spike)
      }
      crown.position.set(-5.8 + (i % 4) * 0.6, 1.0 + Math.floor(i / 4) * 0.34, -2.5 + (i % 2) * 0.5)
      bg.add(crown)
    }
    // 2: mini statue army
    const t2 = box(2.6, 0.9, 1.6, PALETTE.wood)
    t2.position.set(0, 0.45, 2.5)
    bg.add(t2)
    addBoxLocal(ctx.colliders, place, 0, 2.5, 1.4, 0.9, 0, 1)
    for (let i = 0; i < 8; i++) {
      const mini = new THREE.Group()
      const body = cone(0.09, 0.42, PALETTE.copper, 7)
      body.position.y = 0.21
      mini.add(body)
      const headM = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(PALETTE.copper))
      headM.position.y = 0.46
      mini.add(headM)
      const armM = cyl(0.018, 0.018, 0.2, PALETTE.copper, 4)
      armM.position.set(0.06, 0.5, 0)
      armM.rotation.z = -0.4
      mini.add(armM)
      mini.position.set(-1 + (i % 4) * 0.6, 0.9, 2.2 + Math.floor(i / 4) * 0.6)
      mini.scale.setScalar(i % 3 === 0 ? 1.4 : 1)
      bg.add(mini)
    }
    // 3: t-shirt racks
    for (let r = 0; r < 2; r++) {
      const rack = new THREE.Group()
      const bar = cyl(0.03, 0.03, 2.4, 0x8e969c, 6)
      bar.rotation.z = Math.PI / 2
      bar.position.y = 1.7
      rack.add(bar)
      for (const [px] of [[-1], [1]]) {
        const postR = cyl(0.04, 0.05, 1.7, 0x8e969c, 6)
        postR.position.set(px * 1.2, 0.85, 0)
        rack.add(postR)
      }
      for (let s = 0; s < 5; s++) {
        const shirt = box(0.42, 0.6, 0.04, [0xc4484a, 0x2e4a66, 0xf2f3ee, 0x3e8f7c, 0xe9b64f][s])
        shirt.position.set(-0.9 + s * 0.45, 1.32, 0)
        rack.add(shirt)
      }
      rack.position.set(4.5, 0, -2.8 + r * 1.6)
      bg.add(rack)
      addBoxLocal(ctx.colliders, place, 4.5, -2.8 + r * 1.6, 1.3, 0.3, 0, 1.8)
    }
    // postcard spinner + snow globe shelf
    const spinner = cyl(0.5, 0.5, 1.7, 0x8e969c, 8)
    spinner.position.set(-9, 0.85, 2.2)
    bg.add(spinner)
    ctx.colliders.addCircle(...l2w(place, -9, 2.2), 0.6)
    for (let i = 0; i < 8; i++) {
      const card = box(0.26, 0.36, 0.02, 0xf2f3ee)
      const a = (i / 8) * Math.PI * 2
      card.position.set(-9 + Math.cos(a) * 0.55, 0.9 + (i % 2) * 0.45, 2.2 + Math.sin(a) * 0.55)
      card.rotation.y = -a
      bg.add(card)
    }
    const globeShelf = box(3, 1.7, 0.5, PALETTE.wood)
    globeShelf.position.set(-9.5, 0.85, -hd + 0.6)
    bg.add(globeShelf)
    addBoxLocal(ctx.colliders, place, -9.5, -hd + 0.6, 1.6, 0.5, 0, 1.9)
    for (let i = 0; i < 4; i++) {
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xcfe8ee, transparent: true, opacity: 0.55, roughness: 0.1 }),
      )
      globe.position.set(-10.6 + i * 0.75, 1.95, -hd + 0.6)
      bg.add(globe)
      const miniS = cone(0.05, 0.2, PALETTE.copper, 5)
      miniS.position.set(-10.6 + i * 0.75, 1.92, -hd + 0.6)
      bg.add(miniS)
    }
    // register
    const reg = box(2.6, 1.0, 1, PALETTE.wood)
    reg.position.set(9, 0.5, 2.8)
    bg.add(reg)
    addBoxLocal(ctx.colliders, place, 9, 2.8, 1.4, 0.6, 0, 1.1)
    const regTill = box(0.55, 0.45, 0.45, 0x33383d)
    regTill.position.set(9, 1.25, 2.8)
    bg.add(regTill)
    const usaSign = textPlane(['★ MADE IN USA ★'], { w: 3, h: 0.5, bg: '#c4484a', fg: '#fff' })
    usaSign.position.set(4.5, 2.6, -hd + 0.4)
    bg.add(usaSign)

    const giftOpen = () =>
      openShopUI(ctx, {
        title: 'Gift Pavilion',
        emoji: '🗽',
        blurb: 'The largest selection of Statue of Liberty souvenirs anywhere — 6,000 sq ft of foam crowns & memories.',
        items: GIFT_CATALOG,
      })
    for (const [lx, lz] of [
      [-5, -0.8],
      [0, 0.8],
      [9, 1.4],
    ]) {
      const spot = l2w(place, lx, lz)
      ctx.interactables.push({ x: spot[0], z: spot[1], radius: 2.6, label: 'Shop <b>souvenirs</b>', onUse: giftOpen })
    }
  }

  // ═══════════════════════════════════════════ INFORMATION CENTER ═══
  {
    const B = BUILDINGS.infoCenter
    const place: Placement = { cx: B.x, cz: B.z, rotY: B.rotY }
    const hw = B.w / 2
    const hd = B.d / 2
    const wallH = 3.6
    const bg = new THREE.Group()
    bg.position.set(B.x, 0, B.z)
    bg.rotation.y = B.rotY
    g.add(bg)
    shelters.push({ x: B.x, z: B.z, r: Math.max(hw, hd) + 1 })
    interiors.push({ cx: B.x, cz: B.z, rot: B.rotY, hx: hw, hz: hd })

    const shell = box(B.w, wallH, B.d, PALETTE.white)
    shell.position.y = wallH / 2
    bg.add(shell)
    const roofI = hipRoof(B.w + 2, B.d + 2, 2.2, PALETTE.canopy)
    roofI.position.y = wallH + 1.1
    bg.add(roofI)
    const signI = textPlane(['INFORMATION CENTER'], { w: 6, h: 0.9, bg: '#3e6b50', fg: '#f6f0e2' })
    signI.position.set(0, wallH + 0.3, hd + 0.3)
    bg.add(signI)
    addBoxLocal(ctx.colliders, place, 0, 0, hw, hd, 0, wallH)

    const spot = l2w(place, 0, hd + 2)
    const infoLines = [
      '🧭 Ranger: “Welcome to Liberty Island! The promenade loop is about a mile — flat the whole way.”',
      '🧭 Ranger: “Museum’s at the northwest point — don’t miss the original torch in the Inspiration Gallery.”',
      '🧭 Ranger: “Crown tickets? Lucky you. 162 steps. The view is worth every one.”',
      '🧭 Ranger: “Keep snacks close — our seagulls have a federal-grade snatching program.”',
    ]
    let infoIdx = 0
    ctx.interactables.push({
      x: spot[0],
      z: spot[1],
      radius: 3,
      label: 'Ask a <b>Park Ranger</b>',
      onUse: () => {
        ctx.ui.toast(infoLines[infoIdx % infoLines.length], 5200)
        infoIdx++
      },
    })
  }

  // ═══════════════════════════════════════════ AUDIO TOUR PAVILION ═══
  {
    const B = BUILDINGS.audioPavilion
    const bg = new THREE.Group()
    bg.position.set(B.x, 0, B.z)
    g.add(bg)
    shelters.push({ x: B.x, z: B.z, r: 4 })
    for (const [px, pz] of [
      [-2.6, -2.6],
      [2.6, -2.6],
      [-2.6, 2.6],
      [2.6, 2.6],
    ]) {
      const postA = cyl(0.12, 0.14, 3, PALETTE.canopy, 7)
      postA.position.set(px, 1.5, pz)
      bg.add(postA)
    }
    const roofA = hipRoof(7.4, 7.4, 1.8, PALETTE.canopy)
    roofA.position.y = 3.8
    bg.add(roofA)
    const counterA = box(4.6, 1.05, 1, PALETTE.wood)
    counterA.position.set(0, 0.52, 0.8)
    bg.add(counterA)
    ctx.colliders.addBox(B.x - 2.3, B.z + 0.3, B.x + 2.3, B.z + 1.3, 0, 1.2)
    for (let i = 0; i < 5; i++) {
      const headset = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 5, 10, Math.PI), mat(0x33383d))
      headset.position.set(-1.6 + i * 0.8, 1.18, 0.8)
      bg.add(headset)
    }
    const signA = textPlane(['AUDIO TOUR'], { w: 3.4, h: 0.6, bg: '#41525e', fg: '#fff' })
    signA.position.set(0, 2.9, 3.75)
    bg.add(signA)
    ctx.interactables.push({
      x: B.x,
      z: B.z + 2.2,
      radius: 2.4,
      label: 'Borrow an <b>audio tour</b>',
      onUse: () =>
        ctx.ui.toast('🎧 “…available in twelve languages! Did you know her copper skin is only as thick as two pennies?”', 5200),
    })
  }

  // ══════════════════════════════════ SECURITY / PEDESTAL ENTRANCE ═══
  {
    const B = BUILDINGS.securityCanopy
    const bg = new THREE.Group()
    bg.position.set(B.x, 0, B.z)
    g.add(bg)
    shelters.push({ x: B.x, z: B.z, r: 18 })
    const hw = B.w / 2
    for (let i = 0; i <= 4; i++) {
      for (const side of [-1, 1]) {
        const postS = cyl(0.1, 0.12, 3.4, 0xd8d4c8, 7)
        postS.position.set(-hw + (i * B.w) / 4, 1.7, side * (B.d / 2 - 1))
        bg.add(postS)
      }
    }
    const tent = box(B.w + 2, 0.3, B.d, 0xeae6da)
    tent.position.y = 3.6
    tent.rotation.z = 0.04
    bg.add(tent)
    const secSign = textPlane(['PEDESTAL & CROWN ACCESS', 'SECURITY SCREENING'], { w: 7, h: 1.2, bg: '#41525e', fg: '#fff' })
    secSign.position.set(-hw - 0.5, 2.6, 0)
    secSign.rotation.y = -Math.PI / 2
    bg.add(secSign)
    // metal detector frames
    for (const off of [-3, 3]) {
      const det = new THREE.Group()
      for (const side of [-0.8, 0.8]) {
        const postD = box(0.18, 2.3, 0.4, 0x8e969c)
        postD.position.set(side, 1.15, 0)
        det.add(postD)
      }
      const top = box(1.8, 0.25, 0.4, 0x8e969c)
      top.position.y = 2.3
      det.add(top)
      det.rotation.y = Math.PI / 2
      det.position.set(B.x + off, 0, B.z)
      g.add(det)
      ctx.colliders.addBox(B.x + off - 0.25, B.z - 0.95, B.x + off + 0.25, B.z - 0.75, 0, 2.2)
      ctx.colliders.addBox(B.x + off - 0.25, B.z + 0.75, B.x + off + 0.25, B.z + 0.95, 0, 2.2)
    }
    g.add(stanchionRow(B.x - hw + 2, B.z + 3.4, B.x + hw - 2, B.z + 3.4))
    g.add(stanchionRow(B.x - hw + 2, B.z - 3.4, B.x + hw - 2, B.z - 3.4))
  }

  // ═══════════════════════════════════════════ ICE CREAM KIOSK ═══
  {
    const K = BUILDINGS.iceCreamKiosk
    const kiosk = iceCreamKiosk()
    kiosk.position.set(K.x, 0, K.z)
    kiosk.rotation.y = K.rotY
    g.add(kiosk)
    ctx.colliders.addBox(K.x - 1.2, K.z - 0.7, K.x + 1.2, K.z + 0.7, 0, 1.6)
    ctx.interactables.push({
      x: K.x,
      z: K.z + 1.6,
      radius: 2.4,
      label: 'Grab a snack at the <b>kiosk</b>',
      onUse: () =>
        openShopUI(ctx, { title: 'Seasonal Kiosk', emoji: '🍦', blurb: 'Outdoor grab-and-go, April–September. The gulls know the schedule too.', items: KIOSK_MENU }),
    })
  }

  // wayfinding signs
  const sign1 = signBoard(['← MUSEUM · FLAG PLAZA →', '← FERRIES · STATUE →'], 3.6, 1.0)
  sign1.position.set(-120, 0, 52)
  sign1.rotation.y = 0.3
  g.add(sign1)
  const sign2 = signBoard(['CROWN CAFÉ ←', 'GIFT PAVILION →'], 3, 0.9)
  sign2.position.set(-62, 0, 46)
  sign2.rotation.y = -0.2
  g.add(sign2)

  return {
    group: g,
    isSheltered(x: number, z: number): boolean {
      for (const s of shelters) {
        const dx = x - s.x
        const dz = z - s.z
        if (dx * dx + dz * dz < s.r * s.r) return true
      }
      return false
    },
    update(): void {
      const p = ctx.hooks.playerPos()
      for (const r of interiors) {
        const c = Math.cos(r.rot)
        const s = Math.sin(r.rot)
        const dx = p.x - r.cx
        const dz = p.z - r.cz
        const lx = dx * c - dz * s
        const lz = dx * s + dz * c
        if (Math.abs(lx) < r.hx && Math.abs(lz) < r.hz && p.y < 4) {
          ctx.state.indoors = true
          break
        }
      }
    },
  }
}
