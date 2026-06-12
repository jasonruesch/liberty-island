// Liberty Island world layout, derived from the official NPS park map and
// research: ferry dock SW, Information Center + Museum NW, Audio Tour Pavilion
// by the dock, Café + Bookstore with Café Plaza, separate Gift Pavilion,
// circular Flagpole Plaza, Sculpture Garden, September 11 Memorial Grove (NE),
// security canopy at the Pedestal Entrance, Fort Wood star with the statue at
// the east end facing southeast, T-shaped service pier NE.
//
// Coordinates: 1 unit = 1 meter. North = -Z, East = +X. Island surface y = 0.

export const WATER_Y = -2.6
export const ISLAND_Y = 0

/** island outline (roughly 430m x 190m oval, like the real ~14.7 acres) */
export const ISLAND_OUTLINE: [number, number][] = [
  [-215, 10],
  [-205, -30],
  [-185, -60],
  [-150, -82],
  [-105, -94],
  [-55, -100],
  [-5, -102],
  [50, -98],
  [105, -90],
  [150, -78],
  [185, -58],
  [208, -30],
  [216, 0],
  [208, 30],
  [185, 52],
  [150, 68],
  [105, 80],
  [55, 88],
  [0, 92],
  [-55, 92],
  [-105, 88],
  [-145, 80],
  [-175, 64],
  [-198, 42],
]

/** Fort Wood + statue */
export const FORT = {
  x: 118,
  z: -6,
  starOuterR: 50,
  starInnerR: 30,
  wallH: 8,
  points: 11,
  /** statue faces southeast */
  facing: Math.PI * 0.75, // rotation about Y so +Z-forward looks SE… computed in statue.ts
}

/** heights of the statue stack (above island surface) */
export const STATUE_LEVELS = {
  terreplein: 8, // top of Fort Wood walls / base around pedestal
  lobby: 8, // pedestal lobby floor (entered from terreplein)
  pedestalDeck: 38, // observation balcony at top of pedestal
  statueBase: 44, // where copper begins
  crownFloor: 72, // crown room platform
  torchTip: 90,
}

export const DOCK = {
  /** where the pier meets the island */
  rootX: -148,
  rootZ: 74,
  /** pier extends south into the harbor */
  endX: -156,
  endZ: 150,
  width: 16,
  /** ferry comes alongside the east edge of the pier, bow north */
  berth: { x: -140.7, z: 124, heading: 0.06 },
}

export const BUILDINGS = {
  infoCenter: { x: -172, z: 26, w: 15, d: 11, rotY: 0.25 },
  museum: { x: -138, z: -52, w: 56, d: 32, rotY: 0.45 }, // glass face looks SE at the statue
  audioPavilion: { x: -126, z: 44, w: 7, d: 7, rotY: 0 },
  cafe: { x: -82, z: 28, w: 32, d: 21, rotY: 0 }, // Crown Café + Eastern National bookstore
  cafePlaza: { x: -82, z: 56, r: 18 },
  giftPavilion: { x: -38, z: 50, w: 27, d: 18, rotY: -0.12 },
  iceCreamKiosk: { x: -16, z: 72, rotY: 0.3 },
  securityCanopy: { x: 30, z: 6, w: 34, d: 10, rotY: 0 }, // pedestal entrance screening
}

export const FLAG_PLAZA = { x: -48, z: -28, r: 21 }

export const SCULPTURE_GARDEN = { x: 16, z: -56 }

export const MEMORIAL_GROVE = { x: 78, z: -62, rows: 3, cols: 5 }

export const SERVICE_PIER = {
  rootX: 186,
  rootZ: -48,
  endX: 214,
  endZ: -96,
}

/**
 * Main walking paths as polylines [x, z] with width — drawn as pavement and
 * reused for the NPC waypoint graph.
 */
export interface PathDef {
  pts: [number, number][]
  width: number
}

export const PATHS: PathDef[] = [
  // dock head → café plaza → security canopy → fort entrance (the Mall)
  { pts: [[-148, 66], [-120, 58], [-82, 56], [-38, 38], [4, 16], [30, 6], [62, -4], [78, -5]], width: 9 },
  // dock head → info center → museum
  { pts: [[-148, 66], [-162, 44], [-172, 32], [-168, 6], [-152, -30]], width: 6 },
  // info junction → flag plaza
  { pts: [[-168, 6], [-120, -10], [-70, -22], [-48, -28]], width: 7 },
  // flag plaza → sculpture garden → memorial grove → NE promenade
  { pts: [[-48, -28], [-10, -44], [16, -56], [50, -62], [78, -62], [120, -58], [160, -48]], width: 6 },
  // café plaza → flag plaza connector
  { pts: [[-82, 56], [-88, 18], [-70, -8], [-48, -28]], width: 5 },
  // security canopy → south promenade connector
  { pts: [[30, 6], [38, 46], [42, 70]], width: 4 },
  // fort loop spur to the NE pier
  { pts: [[160, -48], [186, -48]], width: 4 },
]

/** promenade ring: island outline inset toward land */
export function insetOutline(inset: number): [number, number][] {
  // outline is roughly centered on (0,-5); shrink toward that centroid
  const cx = 0
  const cz = -5
  return ISLAND_OUTLINE.map(([x, z]) => {
    const dx = x - cx
    const dz = z - cz
    const d = Math.hypot(dx, dz)
    const k = (d - inset) / d
    return [cx + dx * k, cz + dz * k] as [number, number]
  })
}

export const PROMENADE_INSET = 4.5
export const PROMENADE_WIDTH = 7

/** promenade checkpoint markers for the "walk the loop" goal */
export const PROMENADE_CHECKPOINTS: { id: string; x: number; z: number }[] = [
  { id: 'west', x: -200, z: 8 },
  { id: 'north', x: -5, z: -94 },
  { id: 'east', x: 205, z: -2 },
  { id: 'south', x: 0, z: 84 },
]

/** ferry route: in from the NE (Battery), sweep past the statue's face, dock SW */
export const FERRY_ARRIVAL: [number, number][] = [
  [950, -780],
  [620, -420],
  [430, -120],
  [380, 140],
  [240, 235],
  [60, 225],
  [-90, 195],
  [-138, 154],
  [-140.7, 124],
]

export const FERRY_DEPART: [number, number][] = [
  [-140.7, 124],
  [-132, 190],
  [-60, 260],
  [150, 320],
  [420, 260],
  [700, -100],
  [950, -700],
]

/** distant landmarks (positions are stylized, fog does the rest) */
export const LANDMARKS = {
  manhattan: { x: 1050, z: -1150 },
  ellisIsland: { x: -210, z: -760 },
  jerseyCity: { x: -950, z: -260 },
  brooklyn: { x: 1500, z: 420 },
  governors: { x: 1050, z: -180 },
  verrazzano: { x: 420, z: 2100 },
}
