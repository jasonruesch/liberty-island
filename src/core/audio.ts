// Fully procedural WebAudio: harbor ambience, gulls, crowd, ferry engine,
// horn, footsteps, camera shutter, purchases, squawks and a gentle music loop.

export class AudioSys {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private ambientBus!: GainNode
  private sfxBus!: GainNode
  private musicBus!: GainNode
  private crowdGain!: GainNode
  private engineGain!: GainNode
  private waveGain!: GainNode
  private noiseBuf!: AudioBuffer
  private musicOn = true
  private gullTimer = 0
  private musicStep = 0
  private nextChordAt = 0
  enabled = false

  init(): void {
    if (this.ctx) return
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.85
    const comp = ctx.createDynamicsCompressor()
    this.master.connect(comp)
    comp.connect(ctx.destination)

    this.ambientBus = ctx.createGain()
    this.ambientBus.gain.value = 0.9
    this.ambientBus.connect(this.master)
    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 0.9
    this.sfxBus.connect(this.master)
    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0.12
    this.musicBus.connect(this.master)

    // shared noise buffer
    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

    // --- wind bed ---
    const wind = this.loopNoise()
    const windLP = ctx.createBiquadFilter()
    windLP.type = 'lowpass'
    windLP.frequency.value = 320
    const windG = ctx.createGain()
    windG.gain.value = 0.05
    wind.connect(windLP).connect(windG).connect(this.ambientBus)
    const windLFO = ctx.createOscillator()
    windLFO.frequency.value = 0.07
    const windLFOG = ctx.createGain()
    windLFOG.gain.value = 110
    windLFO.connect(windLFOG).connect(windLP.frequency)
    windLFO.start()

    // --- waves ---
    const waves = this.loopNoise()
    const waveBP = ctx.createBiquadFilter()
    waveBP.type = 'bandpass'
    waveBP.frequency.value = 600
    waveBP.Q.value = 0.6
    this.waveGain = ctx.createGain()
    this.waveGain.gain.value = 0.05
    waves.connect(waveBP).connect(this.waveGain).connect(this.ambientBus)
    const waveLFO = ctx.createOscillator()
    waveLFO.frequency.value = 0.13
    const waveLFOG = ctx.createGain()
    waveLFOG.gain.value = 0.03
    waveLFO.connect(waveLFOG).connect(this.waveGain.gain)
    waveLFO.start()

    // --- crowd murmur (level set by proximity to plazas) ---
    const crowd = this.loopNoise()
    const crowdLP = ctx.createBiquadFilter()
    crowdLP.type = 'lowpass'
    crowdLP.frequency.value = 420
    this.crowdGain = ctx.createGain()
    this.crowdGain.gain.value = 0
    crowd.connect(crowdLP).connect(this.crowdGain).connect(this.ambientBus)

    // --- ferry engine ---
    const eng = ctx.createOscillator()
    eng.type = 'sawtooth'
    eng.frequency.value = 52
    const engLP = ctx.createBiquadFilter()
    engLP.type = 'lowpass'
    engLP.frequency.value = 140
    this.engineGain = ctx.createGain()
    this.engineGain.gain.value = 0
    eng.connect(engLP).connect(this.engineGain).connect(this.ambientBus)
    eng.start()
    const engNoise = this.loopNoise()
    const engNLP = ctx.createBiquadFilter()
    engNLP.type = 'lowpass'
    engNLP.frequency.value = 220
    const engNG = ctx.createGain()
    engNG.gain.value = 0.4
    engNoise.connect(engNLP).connect(engNG).connect(this.engineGain)

    this.nextChordAt = ctx.currentTime + 0.5
    this.enabled = true
  }

  private loopNoise(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    src.start()
    return src
  }

  /** call every frame */
  update(dt: number, opts: { crowd: number; engine: number; shore: number }): void {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.crowdGain.gain.setTargetAtTime(0.035 * opts.crowd, t, 0.4)
    this.engineGain.gain.setTargetAtTime(0.16 * opts.engine, t, 0.5)
    this.waveGain.gain.setTargetAtTime(0.02 + 0.05 * opts.shore, t, 0.8)

    // random distant gulls
    this.gullTimer -= dt
    if (this.gullTimer <= 0) {
      this.gullTimer = 2.5 + Math.random() * 7
      const n = 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < n; i++) this.gullCry(0.05 + Math.random() * 0.06, i * 0.35)
    }

    // music scheduler
    if (this.musicOn && t >= this.nextChordAt - 0.05) this.scheduleChord()
  }

  private scheduleChord(): void {
    const ctx = this.ctx!
    const chords = [
      [261.6, 329.6, 392.0], // C
      [220.0, 261.6, 329.6], // Am
      [174.6, 220.0, 261.6, 349.2], // F
      [196.0, 246.9, 293.7], // G
    ]
    const dur = 4
    const t0 = Math.max(this.nextChordAt, ctx.currentTime + 0.02)
    const chord = chords[this.musicStep % chords.length]
    for (const f of chord) {
      for (const det of [-2.5, 2.5]) {
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.value = f
        o.detune.value = det
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t0)
        g.gain.linearRampToValueAtTime(0.05, t0 + 1.2)
        g.gain.linearRampToValueAtTime(0.0, t0 + dur + 0.4)
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 900
        o.connect(lp).connect(g).connect(this.musicBus)
        o.start(t0)
        o.stop(t0 + dur + 0.6)
      }
    }
    // sparse plucked melody, pentatonic over C
    if (Math.random() < 0.8) {
      const penta = [523.3, 587.3, 659.3, 784.0, 880.0, 1046.5]
      const count = 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) {
        const tt = t0 + 0.5 + Math.random() * (dur - 1.5)
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = penta[Math.floor(Math.random() * penta.length)]
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0, tt)
        g.gain.linearRampToValueAtTime(0.09, tt + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, tt + 1.4)
        o.connect(g).connect(this.musicBus)
        o.start(tt)
        o.stop(tt + 1.5)
      }
    }
    this.musicStep++
    this.nextChordAt = t0 + dur
  }

  toggleMusic(): boolean {
    this.musicOn = !this.musicOn
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.12 : 0, this.ctx.currentTime, 0.3)
    return this.musicOn
  }

  // ------------------------------------------------------------- sfx ---

  gullCry(vol = 0.1, delay = 0, near = false): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    const f0 = near ? 1500 : 1150 + Math.random() * 250
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.32)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f0
    bp.Q.value = 3
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.04)
    g.gain.setValueAtTime(vol, t + 0.18)
    g.gain.linearRampToValueAtTime(0, t + 0.35)
    o.connect(bp).connect(g).connect(this.sfxBus)
    o.start(t)
    o.stop(t + 0.4)
  }

  squawk(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.14
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.setValueAtTime(900 + Math.random() * 300, tt)
      o.frequency.exponentialRampToValueAtTime(420, tt + 0.1)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.12, tt)
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.12)
      o.connect(g).connect(this.sfxBus)
      o.start(tt)
      o.stop(tt + 0.13)
    }
  }

  flutter(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    for (let i = 0; i < 6; i++) {
      const tt = t + i * 0.07
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuf
      src.playbackRate.value = 1.6
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.07, tt)
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.06)
      src.connect(bp).connect(g).connect(this.sfxBus)
      src.start(tt, Math.random(), 0.07)
    }
  }

  footstep(surface: 'pavement' | 'grass' | 'wood' | 'metal' = 'pavement'): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = surface === 'grass' ? 500 : surface === 'wood' ? 900 : surface === 'metal' ? 1600 : 1200
    const g = ctx.createGain()
    const v = surface === 'grass' ? 0.05 : 0.075
    g.gain.setValueAtTime(v, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + (surface === 'wood' ? 0.09 : 0.06))
    src.connect(f).connect(g).connect(this.sfxBus)
    src.start(t, Math.random() * 1.5, 0.08)
    if (surface === 'wood' || surface === 'metal') {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = surface === 'wood' ? 130 : 260
      const og = ctx.createGain()
      og.gain.setValueAtTime(0.04, t)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      o.connect(og).connect(this.sfxBus)
      o.start(t)
      o.stop(t + 0.1)
    }
  }

  hornBlast(long = true): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const dur = long ? 2.2 : 0.8
    for (const f of [98, 124]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 500
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.16, t + 0.25)
      g.gain.setValueAtTime(0.16, t + dur - 0.3)
      g.gain.linearRampToValueAtTime(0, t + dur)
      o.connect(lp).connect(g).connect(this.sfxBus)
      o.start(t)
      o.stop(t + dur + 0.1)
    }
  }

  shutter(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2400
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.22, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    src.connect(hp).connect(g).connect(this.sfxBus)
    src.start(t, 0.3, 0.06)
    const src2 = ctx.createBufferSource()
    src2.buffer = this.noiseBuf
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.14, t + 0.07)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    src2.connect(hp)
    src2.connect(g2)
    g2.connect(this.sfxBus)
    src2.start(t + 0.07, 0.6, 0.05)
  }

  ding(): void {
    this.tone([880, 1318.5], 0.09, 0.16, 'sine')
  }

  uiClick(): void {
    this.tone([520], 0.05, 0.05, 'triangle')
  }

  elevatorDing(): void {
    this.tone([987.8], 0.1, 0.7, 'sine')
  }

  bite(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.playbackRate.setValueAtTime(1.4, t)
    src.playbackRate.exponentialRampToValueAtTime(0.5, t + 0.12)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1500
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.16, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
    src.connect(lp).connect(g).connect(this.sfxBus)
    src.start(t, Math.random(), 0.14)
  }

  achievement(): void {
    this.tone([523.3], 0.1, 0.22, 'sine', 0)
    this.tone([659.3], 0.1, 0.22, 'sine', 0.11)
    this.tone([784.0], 0.1, 0.22, 'sine', 0.22)
    this.tone([1046.5], 0.12, 0.5, 'sine', 0.33)
  }

  fanfare(): void {
    this.achievement()
    this.tone([392, 523.3, 659.3], 0.07, 1.4, 'triangle', 0.5)
  }

  private tone(freqs: number[], vol: number, dur: number, type: OscillatorType, delay = 0): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime + delay
    for (const f of freqs) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(vol, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(g).connect(this.sfxBus)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
  }
}
