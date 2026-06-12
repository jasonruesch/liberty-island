// Celebration confetti burst — instanced colored quads with gravity & spin.

import * as THREE from 'three'

interface Piece {
  pos: THREE.Vector3
  vel: THREE.Vector3
  rot: THREE.Euler
  spin: THREE.Vector3
  life: number
}

const COLORS = [0xe9b64f, 0x3e8f7c, 0xc4484a, 0x2e4a66, 0xe06fa0, 0xf2f3ee]

export class Confetti {
  private meshes: THREE.InstancedMesh[] = []
  private pieces: Piece[][] = []
  private dummy = new THREE.Object3D()

  constructor(private scene: THREE.Scene) {
    for (const color of COLORS) {
      const m = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(0.14, 0.2),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
        40,
      )
      m.count = 0
      m.frustumCulled = false
      scene.add(m)
      this.meshes.push(m)
      this.pieces.push([])
    }
  }

  burst(x: number, y: number, z: number, count = 110): void {
    for (let i = 0; i < count; i++) {
      const ci = i % COLORS.length
      if (this.pieces[ci].length >= 40) continue
      const a = Math.random() * Math.PI * 2
      const up = 5 + Math.random() * 5.5
      this.pieces[ci].push({
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(Math.cos(a) * (1 + Math.random() * 3), up, Math.sin(a) * (1 + Math.random() * 3)),
        rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
        spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        life: 2.6 + Math.random() * 1.4,
      })
    }
  }

  update(dt: number): void {
    for (let ci = 0; ci < this.meshes.length; ci++) {
      const arr = this.pieces[ci]
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i]
        p.life -= dt
        p.vel.y -= 9.5 * dt
        p.vel.multiplyScalar(1 - dt * 0.7)
        p.pos.addScaledVector(p.vel, dt)
        p.rot.x += p.spin.x * dt
        p.rot.y += p.spin.y * dt
        p.rot.z += p.spin.z * dt
        if (p.life <= 0 || p.pos.y < -2) arr.splice(i, 1)
      }
      const mesh = this.meshes[ci]
      mesh.count = arr.length
      for (let i = 0; i < arr.length; i++) {
        this.dummy.position.copy(arr[i].pos)
        this.dummy.rotation.copy(arr[i].rot)
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }
}
