// Keyboard + pointer-lock mouse input with per-frame edge detection.

export class Input {
  keys = new Set<string>()
  private pressedThisFrame = new Set<string>()
  mouseDX = 0
  mouseDY = 0
  wheelDelta = 0
  pointerLocked = false
  mouseDownLeft = false
  private clickedThisFrame = false
  /** when true (a modal is open) gameplay input is ignored */
  uiCapture = false

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return
      this.keys.add(e.code)
      this.pressedThisFrame.add(e.code)
      // keep the browser from scrolling / triggering quick-find
      if (['Space', 'Tab', 'KeyE', 'Slash', "Quote"].includes(e.code) && !this.uiCapture) e.preventDefault()
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.keys.clear())

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas
      if (!this.pointerLocked) this.keys.clear()
    })

    window.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.mouseDX += e.movementX
        this.mouseDY += e.movementY
      }
    })
    window.addEventListener(
      'wheel',
      (e) => {
        if (this.pointerLocked) this.wheelDelta += e.deltaY
      },
      { passive: true },
    )
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDownLeft = true
        if (this.pointerLocked) this.clickedThisFrame = true
      }
    })
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDownLeft = false
    })
  }

  requestLock(): void {
    if (!this.pointerLocked) this.canvas.requestPointerLock()
  }

  releaseLock(): void {
    if (this.pointerLocked) document.exitPointerLock()
  }

  /** true only on the frame the key went down */
  pressed(code: string): boolean {
    return !this.uiCapture && this.pressedThisFrame.has(code)
  }

  /** edge-detected even while a modal is open (for closing modals) */
  pressedRaw(code: string): boolean {
    return this.pressedThisFrame.has(code)
  }

  down(code: string): boolean {
    return !this.uiCapture && this.keys.has(code)
  }

  clicked(): boolean {
    return !this.uiCapture && this.clickedThisFrame
  }

  /** call at the END of every frame */
  endFrame(): void {
    this.pressedThisFrame.clear()
    this.clickedThisFrame = false
    this.mouseDX = 0
    this.mouseDY = 0
    this.wheelDelta = 0
  }
}
