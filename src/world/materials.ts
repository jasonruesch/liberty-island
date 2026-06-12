// Shared palette + material helpers for the chunky low-poly look.

import * as THREE from 'three'

export const PALETTE = {
  // environment
  skyHorizon: 0xdfe6e8,
  skyZenith: 0x9fb2bd,
  cloud: 0xe8edef,
  water: 0x5d8395,
  waterDeep: 0x4a6e80,
  foam: 0xdfe9ea,
  fogColor: 0xc7d2d6,

  // island
  grass: 0x6fa45c,
  grassLight: 0x7fb46a,
  path: 0xc9bda8,
  pathEdge: 0xb3a78f,
  granite: 0x9b9d99,
  graniteDark: 0x7e807c,
  seawall: 0x8a8d88,
  concrete: 0xb9bcb4,

  // statue
  copper: 0x6fa28e,
  copperLight: 0x83b6a0,
  copperDark: 0x5d8a78,
  copperRaw: 0xa9694b, // un-patinated copper (museum replicas)
  torchGold: 0xe9b64f,
  pedestal: 0xb5a98f,
  pedestalDark: 0x9a8f78,

  // builds
  wood: 0x8a6843,
  woodLight: 0xa98a5f,
  glass: 0x9fc4cf,
  roofGreen: 0x7c9a62,
  white: 0xf2f3ee,
  canopy: 0x3e6b50, // NPS green
  red: 0xc4484a,
  navy: 0x2e4a66,

  // characters
  skin1: 0xf3c89e,
  skin2: 0xe0a878,
  skin3: 0xb97f56,
  skin4: 0x8a5a3b,
  skin5: 0x6b4128,
} as const

const matCache = new Map<string, THREE.MeshStandardMaterial>()

export interface MatOpts {
  flat?: boolean
  rough?: number
  metal?: number
  emissive?: number
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
}

/** cached standard material — most of the world is built from these */
export function mat(color: number, opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.flat ?? true}|${opts.rough ?? 0.9}|${opts.metal ?? 0}|${opts.emissive ?? 0}|${opts.emissiveIntensity ?? 0}|${opts.transparent ?? false}|${opts.opacity ?? 1}|${opts.side ?? THREE.FrontSide}`
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.9,
      metalness: opts.metal ?? 0,
      flatShading: opts.flat ?? true,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    })
    if (opts.emissive) {
      m.emissive = new THREE.Color(opts.emissive)
      m.emissiveIntensity = opts.emissiveIntensity ?? 0.5
    }
    matCache.set(key, m)
  }
  return m
}

/** quick mesh helper */
export function box(
  w: number,
  h: number,
  d: number,
  color: number,
  opts?: MatOpts,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function cyl(
  rTop: number,
  rBottom: number,
  h: number,
  color: number,
  radial = 10,
  opts?: MatOpts,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, radial), mat(color, opts))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function sph(r: number, color: number, seg = 8, opts?: MatOpts): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, Math.floor(seg * 0.75))), mat(color, opts))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function cone(r: number, h: number, color: number, radial = 8, opts?: MatOpts): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, radial), mat(color, opts))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** canvas-texture label plane (signs, plaques, menu boards) */
export function textPlane(
  lines: string[],
  opts: {
    w: number
    h: number
    bg?: string
    fg?: string
    font?: string
    pad?: number
    align?: CanvasTextAlign
  },
): THREE.Mesh {
  const scale = 56
  const cw = Math.max(64, Math.round(opts.w * scale))
  const ch = Math.max(32, Math.round(opts.h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const g = canvas.getContext('2d')!
  g.fillStyle = opts.bg ?? '#f5efe2'
  g.fillRect(0, 0, cw, ch)
  g.fillStyle = opts.fg ?? '#2c3540'
  const fontPx = Math.floor((ch - (opts.pad ?? 8) * 2) / Math.max(1, lines.length) * 0.72)
  g.font = opts.font ?? `700 ${fontPx}px 'Trebuchet MS', sans-serif`
  g.textAlign = opts.align ?? 'center'
  g.textBaseline = 'middle'
  const lineH = (ch - (opts.pad ?? 8) * 2) / Math.max(1, lines.length)
  lines.forEach((line, i) => {
    const x = (opts.align ?? 'center') === 'left' ? (opts.pad ?? 8) : cw / 2
    g.fillText(line, x, (opts.pad ?? 8) + lineH * (i + 0.5), cw - (opts.pad ?? 8) * 2)
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(opts.w, opts.h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }),
  )
  mesh.castShadow = false
  mesh.receiveShadow = true
  return mesh
}

/** procedural patterned texture for outfits (stripes, kente, tartan, ankara) */
export function patternTexture(
  kind: 'stripes' | 'kente' | 'tartan' | 'ankara' | 'floral' | 'marius' | 'vyshyvanka',
  c1: string,
  c2: string,
  c3 = '#ffffff',
): THREE.CanvasTexture {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const g = canvas.getContext('2d')!
  g.fillStyle = c1
  g.fillRect(0, 0, s, s)
  g.fillStyle = c2
  if (kind === 'stripes') {
    for (let y = 0; y < s; y += 24) g.fillRect(0, y, s, 12)
  } else if (kind === 'kente') {
    for (let y = 0; y < s; y += 32) g.fillRect(0, y, s, 16)
    g.fillStyle = c3
    for (let x = 0; x < s; x += 32) g.fillRect(x, 0, 8, s)
  } else if (kind === 'tartan') {
    for (let y = 0; y < s; y += 32) g.fillRect(0, y, s, 10)
    g.globalAlpha = 0.7
    for (let x = 0; x < s; x += 32) g.fillRect(x, 0, 10, s)
    g.globalAlpha = 1
    g.fillStyle = c3
    for (let x = 14; x < s; x += 32) g.fillRect(x, 0, 2, s)
  } else if (kind === 'ankara') {
    for (let y = 0; y < s; y += 32)
      for (let x = 0; x < s; x += 32) {
        g.beginPath()
        g.arc(x + 16, y + 16, 10, 0, Math.PI * 2)
        g.fill()
      }
    g.fillStyle = c3
    for (let y = 0; y < s; y += 32)
      for (let x = 0; x < s; x += 32) {
        g.beginPath()
        g.arc(x + 16, y + 16, 4, 0, Math.PI * 2)
        g.fill()
      }
  } else if (kind === 'floral') {
    for (let i = 0; i < 24; i++) {
      const x = (i * 53) % s
      const y = (i * 37) % s
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2
        g.beginPath()
        g.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 0, Math.PI * 2)
        g.fill()
      }
    }
  } else if (kind === 'marius') {
    g.fillRect(0, 0, s, 40)
    g.fillStyle = c3
    for (let y = 44; y < 80; y += 8) for (let x = (y % 16 === 4 ? 8 : 0); x < s; x += 16) g.fillRect(x, y, 6, 4)
  } else if (kind === 'vyshyvanka') {
    g.fillRect(0, 24, s, 10)
    g.fillRect(0, 90, s, 10)
    g.fillStyle = c3
    for (let x = 0; x < s; x += 16) {
      g.fillRect(x + 4, 40, 8, 8)
      g.fillRect(x + 4, 74, 8, 8)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
