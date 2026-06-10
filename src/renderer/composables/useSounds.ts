import { useSettingsStore } from '../store/settingsStore'

let ctx: AudioContext | null = null
// Cached store reference — resolved once after Pinia is ready, avoids per-click lookup
let _store: ReturnType<typeof useSettingsStore> | null = null

function store() {
  if (!_store) _store = useSettingsStore()
  return _store
}

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Call this once on app mount to pay the AudioContext init cost upfront
export function warmAudio(): void {
  const c = audio()
  // Schedule a silent no-op buffer to fully initialize the audio graph
  const buf = c.createBuffer(1, 1, c.sampleRate)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(c.destination)
  src.start()
}

function isEnabled(): boolean {
  try {
    return store().settings.launcher.soundEnabled !== false
  } catch {
    return true
  }
}

function volume(): number {
  try {
    return (store().settings.launcher.soundVolume ?? 50) / 100
  } catch {
    return 0.5
  }
}

function style(): 'soft' | 'clicky' {
  try {
    return store().settings.launcher.soundStyle ?? 'soft'
  } catch {
    return 'soft'
  }
}

function v(base: number): number {
  return base * volume()
}

// ── Clicky helpers ─────────────────────────────────────────────────────────────

function clickyNoise(c: AudioContext, t: number, freq: number, q: number, gain: number, decay: number) {
  const len = Math.floor(c.sampleRate * (decay * 2))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  src.connect(filter)
  filter.connect(g)
  g.connect(c.destination)
  src.start(t)
  src.stop(t + decay * 2)
}

// ── Hover ──────────────────────────────────────────────────────────────────────

let _lastHover = 0
export function playHover(): void {
  if (!isEnabled()) return
  const now = performance.now()
  if (now - _lastHover < 40) return
  _lastHover = now
  const c = audio()
  const t = c.currentTime

  if (style() === 'clicky') {
    // Tight high-freq noise tick
    clickyNoise(c, t, 3500, 3.5, v(0.09), 0.012)
  } else {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(820, t)
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.03)
    gain.gain.setValueAtTime(v(0.07), t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.035)
  }
}

// ── Button click ───────────────────────────────────────────────────────────────

export function playClick(): void {
  if (!isEnabled()) return
  const c = audio()
  const t = c.currentTime

  if (style() === 'clicky') {
    clickyNoise(c, t, 2200, 1.8, v(0.18), 0.022)
  } else {
    const osc1 = c.createOscillator()
    const gain1 = c.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(420, t)
    osc1.frequency.exponentialRampToValueAtTime(180, t + 0.055)
    gain1.gain.setValueAtTime(v(0.16), t)
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.055)
    osc1.connect(gain1)
    gain1.connect(c.destination)
    osc1.start(t)
    osc1.stop(t + 0.06)

    const osc2 = c.createOscillator()
    const gain2 = c.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(840, t)
    osc2.frequency.exponentialRampToValueAtTime(360, t + 0.035)
    gain2.gain.setValueAtTime(v(0.06), t)
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.035)
    osc2.connect(gain2)
    gain2.connect(c.destination)
    osc2.start(t)
    osc2.stop(t + 0.04)
  }
}

// ── Global mouse-down ──────────────────────────────────────────────────────────

let _lastClick = 0
export function playMouseClick(): void {
  if (!isEnabled()) return
  const now = performance.now()
  if (now - _lastClick < 60) return   // drop clicks faster than 60ms apart
  _lastClick = now
  const c = audio()
  const t = c.currentTime

  if (style() === 'clicky') {
    clickyNoise(c, t, 2000, 1.5, v(0.15), 0.018)
  } else {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(360, t)
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.045)
    gain.gain.setValueAtTime(v(0.11), t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.05)
  }
}

// ── Launch ─────────────────────────────────────────────────────────────────────

export function playLaunch(): void {
  if (!isEnabled()) return
  const c = audio()
  const t = c.currentTime

  const sweep = c.createOscillator()
  const sweepGain = c.createGain()
  sweep.connect(sweepGain)
  sweepGain.connect(c.destination)
  sweep.type = 'sine'
  sweep.frequency.setValueAtTime(180, t)
  sweep.frequency.exponentialRampToValueAtTime(680, t + 0.32)
  sweepGain.gain.setValueAtTime(0, t)
  sweepGain.gain.linearRampToValueAtTime(v(0.28), t + 0.04)
  sweepGain.gain.setValueAtTime(v(0.28), t + 0.28)
  sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48)
  sweep.start(t)
  sweep.stop(t + 0.5)

  const harm = c.createOscillator()
  const harmGain = c.createGain()
  harm.connect(harmGain)
  harmGain.connect(c.destination)
  harm.type = 'triangle'
  harm.frequency.setValueAtTime(360, t)
  harm.frequency.exponentialRampToValueAtTime(1360, t + 0.32)
  harmGain.gain.setValueAtTime(0, t)
  harmGain.gain.linearRampToValueAtTime(v(0.10), t + 0.04)
  harmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
  harm.start(t)
  harm.stop(t + 0.45)

  const ding = c.createOscillator()
  const dingGain = c.createGain()
  ding.connect(dingGain)
  dingGain.connect(c.destination)
  ding.type = 'triangle'
  ding.frequency.setValueAtTime(1200, t + 0.28)
  dingGain.gain.setValueAtTime(0.0001, t + 0.28)
  dingGain.gain.linearRampToValueAtTime(v(0.30), t + 0.31)
  dingGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75)
  ding.start(t + 0.28)
  ding.stop(t + 0.76)
}

export function useSounds() {
  return { playHover, playClick, playMouseClick, playLaunch }
}
