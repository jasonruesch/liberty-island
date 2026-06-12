// Chunky, wobbly low-poly people — one rig for the player and every tourist.
// Outfits range from saris, kimonos, kente and ankara to kilts, Marius
// sweaters and vyshyvankas, plus hats, glasses and tourist cameras.

import * as THREE from 'three'
import { PALETTE, mat, box, cyl, sph, cone, patternTexture } from '../world/materials'
import type { NpcDef, OutfitKind } from '../data/npcs'

export interface CharacterConfig {
  skin: number
  hair: number
  outfit: OutfitKind
  c1: number
  c2: number
  c3?: number
  hat?: NpcDef['hat']
  glasses?: boolean
  hasCamera?: boolean
}

export interface CharacterRig {
  group: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  head: THREE.Group
  body: THREE.Group
  /** attach point inside the right hand */
  handR: THREE.Group
  hatAnchor: THREE.Group
  /** drive the walk cycle: phase advances with distance, amount 0..1 */
  setWalk(phase: number, amount: number): void
  /** springy lean from acceleration (the wobble) */
  setLean(x: number, z: number): void
  setPose(pose: 'normal' | 'wave' | 'selfie' | 'point' | 'sit' | 'cheer' | 'eat'): void
  tick(dt: number, t: number): void
}

export const CHAR_HEIGHT = 1.52

export function buildCharacter(cfg: CharacterConfig): CharacterRig {
  const group = new THREE.Group()
  const wobble = new THREE.Group() // lean pivot
  group.add(wobble)

  const skinMat = mat(cfg.skin, { rough: 0.85 })

  // ---- legs ----
  const mkLeg = (side: number): THREE.Group => {
    const leg = new THREE.Group()
    leg.position.set(side * 0.13, 0.44, 0)
    const isSkirt = ['sari', 'kimono', 'kaftan', 'huipil', 'qipao', 'hanbok'].includes(cfg.outfit)
    const limb = cyl(0.085, 0.1, 0.4, isSkirt ? cfg.c1 : cfg.outfit === 'kilt' ? cfg.skin : cfg.c2, 8)
    limb.position.y = -0.2
    leg.add(limb)
    const shoe = box(0.16, 0.1, 0.26, 0x3a3530)
    shoe.position.set(0, -0.41, 0.04)
    leg.add(shoe)
    return leg
  }
  const legL = mkLeg(-1)
  const legR = mkLeg(1)
  wobble.add(legL, legR)

  // ---- body ----
  const body = new THREE.Group()
  body.position.y = 0.44
  wobble.add(body)

  let bodyMat: THREE.MeshStandardMaterial
  const patterned: Partial<Record<OutfitKind, () => THREE.Texture>> = {
    breton: () => patternTexture('stripes', hex(cfg.c1), hex(cfg.c2)),
    kente: () => patternTexture('kente', hex(cfg.c1), hex(cfg.c2), hex(cfg.c3 ?? 0xffffff)),
    ankara: () => patternTexture('ankara', hex(cfg.c1), hex(cfg.c2), hex(cfg.c3 ?? 0xffffff)),
    marius: () => patternTexture('marius', hex(cfg.c1), hex(cfg.c3 ?? 0xc4484a), hex(cfg.c2)),
    vyshyvanka: () => patternTexture('vyshyvanka', hex(cfg.c1), hex(cfg.c2), hex(cfg.c2)),
    kimono: () => patternTexture('floral', hex(cfg.c1), hex(cfg.c2)),
    huipil: () => patternTexture('vyshyvanka', hex(cfg.c1), hex(cfg.c2), hex(cfg.c3 ?? 0x2a9d8f)),
  }
  if (patterned[cfg.outfit]) {
    bodyMat = new THREE.MeshStandardMaterial({ map: patterned[cfg.outfit]!(), roughness: 0.9 })
  } else {
    bodyMat = mat(cfg.c1, { rough: 0.9 }) as THREE.MeshStandardMaterial
  }

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.3, 0.62, 10), bodyMat)
  torso.position.y = 0.31
  torso.castShadow = true
  body.add(torso)

  // outfit extras
  if (['sari', 'kimono', 'kaftan', 'huipil', 'qipao', 'hanbok'].includes(cfg.outfit)) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.5, 10), bodyMat)
    skirt.position.y = -0.2
    body.add(skirt)
  }
  if (cfg.outfit === 'kilt') {
    const kilt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.36, 0.3, 10),
      new THREE.MeshStandardMaterial({ map: patternTexture('tartan', hex(cfg.c1), hex(cfg.c2), hex(cfg.c3 ?? 0xc4484a)), roughness: 0.9 }),
    )
    kilt.position.y = -0.1
    body.add(kilt)
    const sporran = box(0.14, 0.16, 0.06, 0x6d5a42)
    sporran.position.set(0, -0.14, 0.31)
    body.add(sporran)
    const torsoShirt = mat(0xf2f3ee)
    torso.material = torsoShirt
  }
  if (cfg.outfit === 'sari') {
    const drape = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 12, Math.PI * 1.1), mat(cfg.c2))
    drape.position.set(0, 0.42, 0.02)
    drape.rotation.set(0.35, 0.4, 1.1)
    body.add(drape)
  }
  if (cfg.outfit === 'kimono' || cfg.outfit === 'hanbok') {
    const obi = cyl(0.27, 0.27, 0.14, cfg.c2, 10)
    obi.position.y = 0.12
    body.add(obi)
  }
  if (cfg.outfit === 'kente') {
    const sash = box(0.16, 0.62, 0.04, cfg.c3 ?? 0xc8102e)
    sash.position.set(-0.1, 0.3, 0.27)
    sash.rotation.z = 0.3
    body.add(sash)
  }
  if (cfg.outfit === 'charro') {
    for (let i = 0; i < 3; i++) {
      const btn = sph(0.025, PALETTE.torchGold, 6, { metal: 0.8, rough: 0.3 })
      btn.position.set(0.08, 0.15 + i * 0.16, 0.27)
      body.add(btn)
      const btn2 = btn.clone()
      btn2.position.x = -0.08
      body.add(btn2)
    }
  }
  if (cfg.outfit === 'jersey') {
    const ten = box(0.18, 0.22, 0.02, cfg.c2)
    ten.position.set(0, 0.32, 0.285)
    body.add(ten)
  }
  if (cfg.outfit === 'hiking') {
    const pack = box(0.3, 0.4, 0.16, 0xb5502d)
    pack.position.set(0, 0.32, -0.3)
    body.add(pack)
    for (const side of [-0.1, 0.1]) {
      const strap = box(0.05, 0.5, 0.02, 0x6d5a42)
      strap.position.set(side, 0.32, 0.28)
      body.add(strap)
    }
  }
  if (cfg.outfit === 'qipao') {
    const trim = cyl(0.215, 0.215, 0.05, PALETTE.torchGold, 10)
    trim.position.y = 0.56
    body.add(trim)
  }

  // ---- arms ----
  const mkArm = (side: number): THREE.Group => {
    const arm = new THREE.Group()
    arm.position.set(side * 0.295, 1.0, 0)
    const sleeveCol = cfg.outfit === 'kimono' ? cfg.c1 : cfg.outfit === 'hiking' ? cfg.c2 : cfg.c1
    const isPattern = !!patterned[cfg.outfit]
    const limbMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8),
      isPattern ? bodyMat : mat(sleeveCol, { rough: 0.9 }),
    )
    limbMesh.position.y = -0.21
    limbMesh.castShadow = true
    arm.add(limbMesh)
    if (cfg.outfit === 'kimono') {
      const sleeve = box(0.16, 0.26, 0.1, cfg.c2)
      sleeve.position.set(0, -0.22, 0)
      arm.add(sleeve)
    }
    const hand = sph(0.07, cfg.skin, 8)
    hand.position.y = -0.46
    arm.add(hand)
    return arm
  }
  const armL = mkArm(-1)
  const armR = mkArm(1)
  wobble.add(armL, armR)
  const handR = new THREE.Group()
  handR.position.set(0, -0.5, 0.04)
  armR.add(handR)

  // ---- head ----
  const head = new THREE.Group()
  head.position.y = 1.18
  wobble.add(head)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), skinMat)
  skull.castShadow = true
  skull.scale.set(1, 1.06, 1)
  head.add(skull)
  // eyes
  for (const side of [-1, 1]) {
    const eyeW = sph(0.052, 0xffffff, 8, { rough: 0.4 })
    eyeW.position.set(side * 0.1, 0.04, 0.235)
    head.add(eyeW)
    const pupil = sph(0.026, 0x26211e, 6, { rough: 0.3 })
    pupil.position.set(side * 0.1, 0.04, 0.278)
    head.add(pupil)
  }
  // smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 5, 10, Math.PI * 0.8), mat(0x9c5b4a))
  smile.position.set(0, -0.085, 0.245)
  smile.rotation.z = Math.PI + Math.PI * 0.1
  head.add(smile)
  const noseC = sph(0.035, cfg.skin, 6)
  noseC.position.set(0, -0.02, 0.27)
  head.add(noseC)
  // blush
  for (const side of [-1, 1]) {
    const blush = sph(0.035, 0xe8967e, 6, { rough: 1 })
    blush.scale.z = 0.4
    blush.position.set(side * 0.17, -0.05, 0.21)
    head.add(blush)
  }
  // hair cap (unless covered) — tilted back so the face stays clear
  const hairMat = mat(cfg.hair, { rough: 1 })
  if (cfg.hat !== 'hijab' && cfg.hat !== 'gele') {
    const hairC = new THREE.Mesh(new THREE.SphereGeometry(0.285, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.46), hairMat)
    hairC.position.set(0, 0.035, -0.03)
    hairC.rotation.x = 0.38
    head.add(hairC)
  }

  // hats
  const hatAnchor = new THREE.Group()
  hatAnchor.position.y = 0.2
  head.add(hatAnchor)
  switch (cfg.hat) {
    case 'cap': {
      const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(cfg.c2))
      capTop.position.y = 0.08
      hatAnchor.add(capTop)
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 10, 1, false, -0.7, 1.4), mat(cfg.c2))
      brim.position.set(0, 0.1, 0.22)
      hatAnchor.add(brim)
      break
    }
    case 'beret': {
      const beret = sph(0.24, cfg.c2 === 0x2e4a66 ? 0xc4484a : 0x2e4a66, 9)
      beret.scale.y = 0.45
      beret.position.set(0.05, 0.13, -0.02)
      hatAnchor.add(beret)
      break
    }
    case 'sombrero': {
      const brim = cyl(0.52, 0.55, 0.05, 0xd9b96a, 14)
      brim.position.y = 0.08
      hatAnchor.add(brim)
      const dome = cone(0.2, 0.26, 0xd9b96a, 10)
      dome.position.y = 0.22
      hatAnchor.add(dome)
      const bandS = cyl(0.16, 0.18, 0.07, 0xc4484a, 10)
      bandS.position.y = 0.13
      hatAnchor.add(bandS)
      break
    }
    case 'gele': {
      const wrap1 = sph(0.3, cfg.c2, 9)
      wrap1.scale.set(1.05, 0.7, 1.05)
      wrap1.position.y = 0.12
      hatAnchor.add(wrap1)
      const wrap2 = sph(0.24, cfg.c3 ?? cfg.c2, 8)
      wrap2.scale.set(1.1, 0.55, 1.1)
      wrap2.position.y = 0.26
      wrap2.rotation.z = 0.18
      hatAnchor.add(wrap2)
      const knot = sph(0.1, cfg.c2, 7)
      knot.position.set(0.22, 0.22, 0)
      hatAnchor.add(knot)
      break
    }
    case 'hijab': {
      const scarf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.72), mat(cfg.c2))
      scarf.position.y = -0.16
      hatAnchor.add(scarf)
      const drape = cyl(0.2, 0.26, 0.3, cfg.c2, 9)
      drape.position.set(0, -0.34, -0.06)
      hatAnchor.add(drape)
      break
    }
    case 'bucket': {
      const bucket = cyl(0.24, 0.2, 0.16, 0xd9d3c2, 10)
      bucket.position.y = 0.1
      hatAnchor.add(bucket)
      const brimB = cyl(0.32, 0.3, 0.03, 0xd9d3c2, 10)
      brimB.position.y = 0.02
      hatAnchor.add(brimB)
      break
    }
    case 'sunhat': {
      const brimS = cyl(0.45, 0.48, 0.03, 0xe8d8a8, 12)
      brimS.position.y = 0.04
      hatAnchor.add(brimS)
      const domeS = cyl(0.2, 0.23, 0.16, 0xe8d8a8, 10)
      domeS.position.y = 0.12
      hatAnchor.add(domeS)
      const ribbon = cyl(0.21, 0.24, 0.05, 0xc46a8a, 10)
      ribbon.position.y = 0.07
      hatAnchor.add(ribbon)
      break
    }
    case 'visor': {
      const brimV = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 10, 1, false, -0.8, 1.6), mat(0xe9806e))
      brimV.position.set(0, 0.06, 0.16)
      hatAnchor.add(brimV)
      const bandV = cyl(0.265, 0.265, 0.06, 0xe9806e, 10)
      bandV.position.y = 0.05
      hatAnchor.add(bandV)
      break
    }
  }
  if (cfg.glasses) {
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 10), mat(0x33383d))
      lens.position.set(side * 0.1, 0.045, 0.26)
      head.add(lens)
    }
    const bridge = box(0.06, 0.012, 0.012, 0x33383d)
    bridge.position.set(0, 0.05, 0.27)
    head.add(bridge)
  }
  if (cfg.hasCamera) {
    const cam = box(0.16, 0.1, 0.07, 0x33383d)
    cam.position.set(0.06, 0.62, 0.27)
    body.add(cam)
    const lens = cyl(0.035, 0.035, 0.05, 0x6b7280, 8)
    lens.rotation.x = Math.PI / 2
    lens.position.set(0.06, 0.62, 0.32)
    body.add(lens)
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 5, 12, Math.PI), mat(0x6d5a42))
    strap.position.set(0, 0.78, 0.05)
    strap.rotation.x = 0.5
    body.add(strap)
  }

  // ---- animation state ----
  let pose: Parameters<CharacterRig['setPose']>[0] = 'normal'
  let leanX = 0
  let leanZ = 0
  let walkPhase = 0
  let walkAmt = 0

  const rig: CharacterRig = {
    group,
    armL,
    armR,
    legL,
    legR,
    head,
    body,
    handR,
    hatAnchor,
    setWalk(phase, amount) {
      walkPhase = phase
      walkAmt = amount
    },
    setLean(x, z) {
      leanX = x
      leanZ = z
    },
    setPose(p) {
      pose = p
    },
    tick(dt: number, t: number) {
      // walk cycle
      const swing = Math.sin(walkPhase) * walkAmt
      const swing2 = Math.sin(walkPhase + Math.PI) * walkAmt
      legL.rotation.x = swing * 0.85
      legR.rotation.x = swing2 * 0.85
      const idleSway = Math.sin(t * 1.7) * 0.04
      switch (pose) {
        case 'wave':
          armR.rotation.x = Math.PI * 0.92
          armR.rotation.z = Math.sin(t * 9) * 0.4 - 0.2
          armL.rotation.x = swing * 0.7
          break
        case 'selfie':
          armR.rotation.x = Math.PI * 0.65
          armR.rotation.z = -0.5
          armL.rotation.x = -0.2
          armL.rotation.z = 0.5 + Math.sin(t * 6) * 0.15 // peace-sign-ish wiggle
          break
        case 'point':
          armR.rotation.x = Math.PI * 0.55
          armR.rotation.z = 0.15
          armL.rotation.x = swing * 0.7
          break
        case 'cheer':
          armR.rotation.x = Math.PI * 0.95
          armL.rotation.x = Math.PI * 0.95
          armR.rotation.z = -0.25 + Math.sin(t * 8) * 0.2
          armL.rotation.z = 0.25 - Math.sin(t * 8) * 0.2
          break
        case 'eat':
          armR.rotation.x = Math.PI * 0.45 + Math.sin(t * 4) * 0.12
          armR.rotation.z = -0.35
          armL.rotation.x = swing * 0.5
          break
        case 'sit':
          legL.rotation.x = -Math.PI / 2.2
          legR.rotation.x = -Math.PI / 2.2
          armL.rotation.x = -0.3
          armR.rotation.x = -0.3
          break
        default:
          armL.rotation.x = swing2 * 0.7
          armR.rotation.x = swing * 0.7
          armL.rotation.z = 0.08 + idleSway * 0.4
          armR.rotation.z = -0.08 - idleSway * 0.4
      }
      // body bob + wobble lean
      const bob = Math.abs(Math.sin(walkPhase)) * walkAmt * 0.05
      wobble.position.y = bob + (pose === 'sit' ? -0.32 : 0)
      wobble.rotation.x = THREE.MathUtils.damp(wobble.rotation.x, leanZ + idleSway * 0.25 * (1 - walkAmt), 8, dt)
      wobble.rotation.z = THREE.MathUtils.damp(wobble.rotation.z, -leanX, 8, dt)
      head.rotation.z = Math.sin(walkPhase * 0.5) * walkAmt * 0.06 + idleSway * 0.5
    },
  }
  return rig
}

/** small hand-held meshes for foods, drinks & souvenirs */
export function buildItemMesh(id: string): THREE.Group {
  const g = new THREE.Group()
  const add = (m: THREE.Object3D) => g.add(m)
  switch (id) {
    case 'beast-burger':
    case 'cheeseburger': {
      const bunB = cyl(0.09, 0.1, 0.04, 0xd9a35c, 9)
      add(bunB)
      const patty = cyl(0.1, 0.1, 0.035, 0x6d4a35, 9)
      patty.position.y = 0.038
      add(patty)
      const cheese = box(0.16, 0.012, 0.16, 0xe9b64f)
      cheese.position.y = 0.06
      cheese.rotation.y = 0.5
      add(cheese)
      const lettuce = cyl(0.105, 0.1, 0.02, 0x7fb46a, 9)
      lettuce.position.y = 0.075
      add(lettuce)
      const bunT = new THREE.Mesh(new THREE.SphereGeometry(0.1, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9a35c))
      bunT.position.y = 0.085
      add(bunT)
      if (id === 'beast-burger') g.scale.setScalar(1.3)
      break
    }
    case 'hotdog': {
      const bun = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), mat(0xd9a35c))
      bun.rotation.z = Math.PI / 2
      add(bun)
      const dog = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.2, 4, 8), mat(0xb04e36))
      dog.rotation.z = Math.PI / 2
      dog.position.y = 0.035
      add(dog)
      const mustard = box(0.16, 0.01, 0.015, 0xe9b64f)
      mustard.position.y = 0.055
      add(mustard)
      break
    }
    case 'pizza': {
      const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 3), mat(0xe0b160))
      add(slice)
      const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 3), mat(0xc4484a))
      sauce.position.y = 0.014
      add(sauce)
      for (let i = 0; i < 3; i++) {
        const pep = cyl(0.025, 0.025, 0.012, 0x8e3030, 7)
        pep.position.set(0.04 - i * 0.04, 0.024, 0.03 * (i % 2 ? 1 : -1))
        add(pep)
      }
      break
    }
    case 'pretzel': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), mat(0x9c6435))
      add(ring)
      const cross1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.1, 4, 6), mat(0x9c6435))
      cross1.rotation.z = 0.8
      add(cross1)
      const cross2 = cross1.clone()
      cross2.rotation.z = -0.8
      add(cross2)
      break
    }
    case 'fries':
    case 'tenders': {
      const cup = cyl(0.06, 0.045, 0.1, 0xc4484a, 8)
      add(cup)
      for (let i = 0; i < 6; i++) {
        const fry = box(0.014, 0.1, 0.014, 0xe9c46a)
        fry.position.set((i % 3 - 1) * 0.025, 0.08, (Math.floor(i / 3) - 0.5) * 0.03)
        fry.rotation.z = (i - 3) * 0.08
        add(fry)
      }
      if (id === 'tenders') {
        const tender = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.07, 4, 7), mat(0xc98a3d))
        tender.position.set(0.04, 0.09, 0)
        tender.rotation.z = 0.4
        add(tender)
      }
      break
    }
    case 'icecream': {
      const stick = box(0.02, 0.08, 0.01, 0xd9c9a8)
      stick.position.y = -0.06
      add(stick)
      const bar = box(0.08, 0.14, 0.045, 0x6d4a35)
      add(bar)
      const bite = box(0.05, 0.05, 0.05, 0xf6f0e6)
      bite.position.set(0.035, 0.06, 0)
      add(bite)
      break
    }
    case 'chowder': {
      const cup = cyl(0.07, 0.055, 0.09, 0xf2f3ee, 10)
      add(cup)
      const soup = cyl(0.062, 0.062, 0.015, 0xe8dcc2, 10)
      soup.position.y = 0.05
      add(soup)
      const cracker = box(0.025, 0.008, 0.025, 0xd9a35c)
      cracker.position.set(0.02, 0.062, 0.01)
      add(cracker)
      break
    }
    case 'latte':
    case 'hotchoc':
    case 'soda':
    case 'smoothie':
    case 'water': {
      const colors: Record<string, number> = { latte: 0xc9a87a, hotchoc: 0x6d4a35, soda: 0xc4484a, smoothie: 0xc46a8a, water: 0x9fc4cf }
      const cup = cyl(0.05, 0.04, 0.13, id === 'water' ? 0xcfe4ea : 0xf2f3ee, 9, id === 'water' ? { transparent: true, opacity: 0.6 } : undefined)
      add(cup)
      const lid = cyl(0.052, 0.052, 0.015, colors[id], 9)
      lid.position.y = 0.07
      add(lid)
      if (id !== 'water') {
        const straw = cyl(0.008, 0.008, 0.1, 0xf2f3ee, 6)
        straw.position.set(0.015, 0.12, 0)
        straw.rotation.z = 0.15
        add(straw)
      }
      break
    }
    case 'foamcrown': {
      const band = cyl(0.27, 0.29, 0.1, 0x7fc4a8, 12)
      add(band)
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.5 + (i / 6) * Math.PI
        const spike = cone(0.035, 0.22, 0x7fc4a8, 4)
        spike.position.set(Math.sin(a) * 0.27, 0.12, -Math.cos(a) * 0.27)
        spike.rotation.x = -Math.cos(a) * 0.85
        spike.rotation.z = -Math.sin(a) * 0.85
        add(spike)
      }
      break
    }
    case 'cap': {
      const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(0x2e4a66))
      add(capTop)
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 10, 1, false, -0.7, 1.4), mat(0x2e4a66))
      brim.position.set(0, 0.02, 0.22)
      add(brim)
      const statueIcon = cone(0.04, 0.1, 0x7fc4a8, 5)
      statueIcon.position.set(0, 0.12, 0.24)
      add(statueIcon)
      break
    }
    case 'torch-replica': {
      const handle = cyl(0.02, 0.03, 0.16, 0xa9694b, 8)
      add(handle)
      const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), mat(PALETTE.torchGold, { emissive: 0xc98a1d, emissiveIntensity: 0.4 }))
      flame.scale.y = 1.6
      flame.position.y = 0.12
      add(flame)
      break
    }
    case 'mini-statue':
    case 'statue-12': {
      const bodyS = cone(0.05, 0.22, PALETTE.copper, 8)
      bodyS.position.y = 0.11
      add(bodyS)
      const headS = sph(0.028, PALETTE.copper, 7)
      headS.position.y = 0.245
      add(headS)
      const armS = cyl(0.01, 0.01, 0.12, PALETTE.copper, 5)
      armS.position.set(0.035, 0.27, 0)
      armS.rotation.z = -0.35
      add(armS)
      const baseS = box(0.08, 0.03, 0.08, PALETTE.pedestal)
      baseS.position.y = 0.0
      add(baseS)
      if (id === 'statue-12') g.scale.setScalar(1.5)
      break
    }
    case 'plush': {
      const bodyP = sph(0.09, 0x9c7450, 9)
      add(bodyP)
      const headP = sph(0.065, 0x9c7450, 9)
      headP.position.y = 0.11
      add(headP)
      for (const side of [-1, 1]) {
        const ear = sph(0.025, 0x9c7450, 6)
        ear.position.set(side * 0.05, 0.165, 0)
        add(ear)
      }
      const crownP = cyl(0.045, 0.05, 0.03, 0x7fc4a8, 8)
      crownP.position.y = 0.19
      add(crownP)
      break
    }
    case 'snowglobe': {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xcfe8ee, transparent: true, opacity: 0.5, roughness: 0.1 }))
      globe.position.y = 0.06
      add(globe)
      const baseG = cyl(0.055, 0.065, 0.04, 0x6b4a36, 9)
      add(baseG)
      const miniG = cone(0.018, 0.07, PALETTE.copper, 5)
      miniG.position.y = 0.05
      add(miniG)
      break
    }
    default: {
      // generic paper shopping bag
      const bag = box(0.14, 0.16, 0.09, 0xe3d7c2)
      add(bag)
      const logo = cone(0.025, 0.06, PALETTE.copper, 5)
      logo.position.set(0, 0.01, 0.05)
      add(logo)
      for (const side of [-0.04, 0.04]) {
        const handleB = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 8, Math.PI), mat(0x6d5a42))
        handleB.position.set(side, 0.09, 0)
        add(handleB)
      }
    }
  }
  g.traverse((m) => {
    m.castShadow = true
  })
  return g
}

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`
}
