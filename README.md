# Liberty Island — A Wobbly Day Out 🗽

A Three.js recreation of Liberty Island, NYC, in a chunky low-poly *Wobbly Life*
style. You arrive by ferry on a cloudy spring noon with two dozen travelers
from around the world. The goal: **a selfie with Lady Liberty herself.**

```bash
npm install --include=dev
npm run dev        # → http://localhost:5173
```

## The day

1. **Ferry arrival** — ride the *Miss Liberty* in from the harbor, walk the
   decks while tourists point and chatter, sweep past the statue's face, and
   dock at the southwest pier (horn blasts included).
2. **The island** — mapped from the official NPS park map: ferry dock & canopy,
   Information Center, the Statue of Liberty Museum (NW), Audio Tour Pavilion,
   Crown Café + Eastern National bookstore with the Café Plaza, the big Gift
   Pavilion, circular Flagpole Plaza, Sculpture Garden (Bartholdi, Eiffel,
   Lazarus, Pulitzer, Laboulaye), September 11 Memorial Grove, the security
   canopy at the Pedestal Entrance, Fort Wood's 11-point star, the waterfront
   promenade ring with benches, historic lampposts, coin binoculars and spring
   tulip beds — plus the NE service pier.
3. **The statue** — Fort Wood terreplein → pedestal lobby (with the empty
   original-torch plinth) → elevator or switchback stairs → observation balcony
   at the colonnade → the 162-step spiral to the **crown room** with its 25
   windows. She faces southeast, torch in her right hand, JULY IV MDCCLXXVI
   tablet in her left, broken shackles and a raised right heel at her feet.
4. **The museum** — Immersive Theater ("Liberty Rising"), Engagement Gallery
   (Bartholdi's workshop: full-scale copper face & foot, Eiffel armature), and
   the Inspiration Gallery with the **original 1886 torch** and the *Becoming
   Liberty* collage — your statue selfies get added to the wall.
5. **Food & souvenirs** — the Crown Café menu uses the real items & prices
   (Beast Burger $16.30, clam chowder, Nuchas empanadas…); the Gift Pavilion
   sells the real stock (foam crown — wearable!, replicas, snow globes); the
   bookstore and the seasonal ice-cream kiosk round it out.
6. **The birds** — eat outdoors and gulls will stalk, circle, and dive for
   your snack. Keep moving, finish fast, or eat under cover. Pigeons strut the
   plazas and mob your crumbs.
7. **The photo** — P raises the camera, F flips to selfie, scroll zooms.
   Real PNGs with polaroid frames land in your gallery (Tab) and can be saved.
   Frame Lady Liberty behind you for the big one — confetti, cheering
   tourists, and a spot on the museum collage.
8. **Heading home** — board the ferry at the pier whenever you're ready for a
   recap of your day and the sail back.

## Controls

| Key | Action |
|---|---|
| WASD / arrows | walk |
| Shift | run (also shakes off stalking gulls) |
| Space | jump |
| Mouse | look (click to capture pointer) |
| E | talk / use / order / read |
| P | camera · click = shoot · F = selfie flip · scroll = zoom |
| F | take a bite of held food |
| 1–8 | equip inventory |
| V | first/third person |
| Tab | photo gallery |
| M | music on/off |

## Tech notes

- Three.js + TypeScript + Vite; every mesh is procedural (no model files),
  every sound is synthesized WebAudio (no audio files).
- Walkable world via ground-zone sampling (flat polys, ramps, a parametric
  double-helix for the crown stairs) + segment/circle/box blockers.
- 24 NPCs share one chunky character rig with outfit variants: sari, kimono,
  kente, ankara & gele, kilt, Marius sweater, vyshyvanka, charro, breton…
  each with their own story lines (E to chat).
- Overcast noon lighting, drifting low-poly clouds, animated harbor water,
  and the skyline ring: Lower Manhattan + One WTC, Ellis Island, Jersey City,
  Brooklyn, Governors Island and the Verrazzano-Narrows.
- `scripts/shoot.mjs` — headless-Chrome screenshot tour used for visual QA.

Sources used for the layout & catalogs: the NPS park map & dining/gifts pages,
Wikipedia (Liberty Island, Statue of Liberty, Statue of Liberty Museum),
visitor guides, and thestatueofliberty.com (Crown Café menu & Evelyn Hill
gift stock).
