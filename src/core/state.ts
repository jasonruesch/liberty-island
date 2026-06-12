// Central game state: phase, wallet, inventory, photos, goals.
// Pure data + listeners; no three.js imports so every module can use it.

export type GamePhase = 'title' | 'arrival' | 'island' | 'return' | 'ended'

export type ItemKind = 'food' | 'drink' | 'souvenir' | 'tool'

export interface ItemDef {
  id: string
  name: string
  price: number
  kind: ItemKind
  desc: string
  emoji: string
  /** wearable souvenirs (foam crown) attach to the player when equipped */
  wearable?: boolean
  /** number of bites/sips before it is gone */
  bites?: number
}

export interface InventorySlot {
  item: ItemDef
  bitesLeft: number
}

export interface PhotoEntry {
  dataUrl: string
  caption: string
  selfie: boolean
  withStatue: boolean
  time: number
}

export interface GoalDef {
  id: string
  label: string
  emoji: string
  main?: boolean
}

export const GOALS: GoalDef[] = [
  { id: 'arrive', label: 'Arrive at Liberty Island', emoji: '⛴️' },
  { id: 'selfie', label: 'Take a selfie with Lady Liberty', emoji: '🤳', main: true },
  { id: 'museum', label: 'See the original 1886 torch in the museum', emoji: '🔥' },
  { id: 'crown', label: 'Climb to the crown', emoji: '👑' },
  { id: 'souvenir', label: 'Buy a souvenir at the Gift Pavilion', emoji: '🗽' },
  { id: 'snack', label: 'Enjoy a Crown Café snack (mind the gulls!)', emoji: '🌭' },
  { id: 'friends', label: 'Chat with 5 fellow travelers', emoji: '💬' },
  { id: 'promenade', label: 'Walk the waterfront promenade loop', emoji: '🚶' },
]

type Listener = () => void

export class GameState {
  phase: GamePhase = 'title'
  wallet = 80
  inventory: InventorySlot[] = []
  equippedIndex = -1
  photos: PhotoEntry[] = []
  goalsDone = new Set<string>()
  npcsTalked = new Set<string>()
  promenadeCheckpoints = new Set<string>()
  foodStolenCount = 0
  itemsBought = 0
  distanceWalked = 0
  /** true while the player is standing on the ferry deck */
  onFerry = true
  /** zone flags maintained by world triggers */
  indoors = false
  insideStatue = false
  private listeners = new Set<Listener>()

  onChange(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit(): void {
    for (const fn of this.listeners) fn()
  }

  spend(amount: number): boolean {
    if (this.wallet < amount) return false
    this.wallet = Math.round((this.wallet - amount) * 100) / 100
    this.emit()
    return true
  }

  addItem(item: ItemDef): void {
    this.inventory.push({ item, bitesLeft: item.bites ?? 0 })
    this.itemsBought++
    this.emit()
  }

  removeItem(index: number): void {
    this.inventory.splice(index, 1)
    if (this.equippedIndex === index) this.equippedIndex = -1
    else if (this.equippedIndex > index) this.equippedIndex--
    this.emit()
  }

  get equipped(): InventorySlot | null {
    return this.equippedIndex >= 0 ? (this.inventory[this.equippedIndex] ?? null) : null
  }

  completeGoal(id: string): boolean {
    if (this.goalsDone.has(id)) return false
    this.goalsDone.add(id)
    this.emit()
    return true
  }

  get allGoalsDone(): boolean {
    return GOALS.every((g) => this.goalsDone.has(g.id))
  }
}
