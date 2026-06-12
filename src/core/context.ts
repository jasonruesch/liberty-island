// Shared context handed to every module.

import type * as THREE from 'three'
import type { GameState } from './state'
import type { Input } from './input'
import type { AudioSys } from './audio'
import type { UI } from './ui'
import type { ColliderWorld } from './collision'

export interface Interactable {
  x: number
  z: number
  y?: number
  radius: number
  label: string
  /** lower = higher priority when several are in range */
  order?: number
  enabled?: () => boolean
  onUse: () => void
}

export interface GameContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  canvas: HTMLCanvasElement
  state: GameState
  input: Input
  audio: AudioSys
  ui: UI
  colliders: ColliderWorld
  interactables: Interactable[]
  time: number
  /** late-bound cross-module hooks */
  hooks: {
    playerPos: () => THREE.Vector3
    playerVel: () => THREE.Vector3
    addPhotoToCollage: (dataUrl: string) => void
    confettiAt: (x: number, y: number, z: number) => void
    npcCheer: () => void
    goalDone: (id: string, title: string, sub: string) => void
    requestReturnFerry: () => void
    onBite: (pos: THREE.Vector3) => void
  }
}
