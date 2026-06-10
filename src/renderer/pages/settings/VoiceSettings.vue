<template>
  <div class="voice-settings">
    <h2 class="section-title">Voice & Microphone</h2>

    <!-- ── Device selector ───────────────────────────────────────────────── -->
    <div class="setting-group">
      <div class="group-label">Input Device</div>
      <div class="group-body">
        <div class="setting-row">
          <label class="setting-label">Microphone</label>
          <select class="setting-select" v-model="selectedDeviceId" @change="restartStream">
            <option value="">Default microphone</option>
            <option v-for="d in inputDevices" :key="d.deviceId" :value="d.deviceId">
              {{ d.label || `Microphone ${d.deviceId.slice(0, 6)}` }}
            </option>
          </select>
        </div>

        <!-- Volume meter -->
        <div class="setting-row setting-row--meter">
          <label class="setting-label">Input level</label>
          <div class="meter-wrap">
            <div class="meter-bar">
              <div class="meter-fill" :style="{ width: meterPct + '%' }" :class="meterClass" />
            </div>
            <span class="meter-label" :class="meterClass">{{ meterLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Test mode selector ────────────────────────────────────────────── -->
    <div class="setting-group">
      <div class="group-label">Microphone Test</div>
      <div class="group-body">

        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ active: mode === 'monitor' }"
            @click="setMode('monitor')"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 9.5a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <circle cx="7" cy="6" r="2" stroke="currentColor" stroke-width="1.3"/>
            </svg>
            Live Monitor
          </button>
          <button
            class="mode-tab"
            :class="{ active: mode === 'record' }"
            @click="setMode('record')"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3.5" fill="currentColor" opacity="0.8"/>
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
            </svg>
            Record & Play Back
          </button>
        </div>

        <!-- ── MONITOR MODE ──────────────────────────────────────────────── -->
        <div v-if="mode === 'monitor'" class="test-panel">
          <p class="test-desc">
            Hear your mic in real-time. Wear headphones to avoid feedback.
          </p>

          <div class="setting-row">
            <label class="setting-label">Monitor volume</label>
            <div class="slider-wrap">
              <input type="range" min="0" max="100" v-model.number="monitorVolume" class="slider" />
              <span class="slider-val">{{ monitorVolume }}%</span>
            </div>
          </div>

          <div class="setting-row">
            <label class="setting-label">Reverb</label>
            <div class="slider-wrap">
              <input type="range" min="0" max="100" v-model.number="reverbWet" class="slider" />
              <span class="slider-val">{{ reverbWet }}%</span>
            </div>
          </div>

          <div class="test-actions">
            <button
              class="test-btn"
              :class="{ 'test-btn--stop': isMonitoring }"
              @click="toggleMonitor"
              :disabled="!hasStream"
            >
              <svg v-if="!isMonitoring" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 3.5a3 3 0 0 1 6 0v3a3 3 0 0 1-6 0V3.5Z" stroke="currentColor" stroke-width="1.3"/>
                <path d="M2.5 7a4.5 4.5 0 0 0 9 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <line x1="7" y1="11.5" x2="7" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/>
              </svg>
              {{ isMonitoring ? 'Stop monitor' : 'Start monitor' }}
            </button>

            <div v-if="isMonitoring" class="monitor-live-badge">
              <span class="live-dot" />
              Live
            </div>
          </div>

          <div v-if="isMonitoring" class="monitor-warning">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1L12 12H1L6.5 1Z" stroke="#e8a030" stroke-width="1.2" stroke-linejoin="round"/>
              <line x1="6.5" y1="5" x2="6.5" y2="8" stroke="#e8a030" stroke-width="1.3" stroke-linecap="round"/>
              <circle cx="6.5" cy="9.5" r="0.6" fill="#e8a030"/>
            </svg>
            Use headphones — speakers will cause feedback loop
          </div>
        </div>

        <!-- ── RECORD MODE ───────────────────────────────────────────────── -->
        <div v-if="mode === 'record'" class="test-panel">
          <p class="test-desc">
            Record up to {{ MAX_REC_SEC }} seconds, then play it back.
          </p>

          <div class="rec-display">
            <!-- Idle -->
            <template v-if="recState === 'idle'">
              <div class="rec-time">{{ MAX_REC_SEC }}s max</div>
            </template>
            <!-- Recording -->
            <template v-if="recState === 'recording'">
              <div class="rec-time rec-time--live">
                <span class="live-dot" />
                {{ recElapsed.toFixed(1) }}s / {{ MAX_REC_SEC }}s
              </div>
              <div class="rec-waveform">
                <div
                  v-for="(h, i) in waveformBars"
                  :key="i"
                  class="rec-bar"
                  :style="{ height: h + 'px' }"
                />
              </div>
            </template>
            <!-- Has recording -->
            <template v-if="recState === 'done'">
              <div class="rec-time rec-time--done">{{ recDuration.toFixed(1) }}s recorded</div>
            </template>
            <!-- Playing back -->
            <template v-if="recState === 'playing'">
              <div class="rec-time rec-time--play">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 2l7 4-7 4V2z" fill="currentColor"/>
                </svg>
                Playing…
              </div>
            </template>
          </div>

          <div class="test-actions">
            <!-- Record button -->
            <button
              v-if="recState === 'idle' || recState === 'done'"
              class="test-btn test-btn--record"
              :class="{ 'test-btn--has-rec': recState === 'done' }"
              @click="startRecord"
              :disabled="!hasStream"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="3.5" fill="currentColor"/>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              {{ recState === 'done' ? 'Record again' : 'Record' }}
            </button>

            <!-- Stop recording -->
            <button
              v-if="recState === 'recording'"
              class="test-btn test-btn--stop"
              @click="stopRecord"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/>
              </svg>
              Stop
            </button>

            <!-- Play back -->
            <button
              v-if="recState === 'done'"
              class="test-btn test-btn--play"
              @click="playBack"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
              </svg>
              Play back
            </button>

            <!-- Stop playback -->
            <button
              v-if="recState === 'playing'"
              class="test-btn test-btn--stop"
              @click="stopPlayback"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/>
              </svg>
              Stop
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Permission error -->
    <div v-if="permError" class="perm-error">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="#e05050" stroke-width="1.3"/>
        <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="#e05050" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="10.5" r="0.8" fill="#e05050"/>
      </svg>
      {{ permError }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

// ── State ────────────────────────────────────────────────────────────────────

const MAX_REC_SEC = 10

const mode            = ref<'monitor' | 'record'>('monitor')
const inputDevices    = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref('')
const permError       = ref('')

const hasStream   = ref(false)
const isMonitoring = ref(false)
const monitorVolume = ref(80)
const reverbWet    = ref(0)

type RecState = 'idle' | 'recording' | 'done' | 'playing'
const recState    = ref<RecState>('idle')
const recElapsed  = ref(0)
const recDuration = ref(0)
const waveformBars = ref<number[]>(Array(24).fill(4))

// ── Audio graph nodes ────────────────────────────────────────────────────────

let stream: MediaStream | null = null
let audioCtx: AudioContext | null = null
let sourceNode: MediaStreamAudioSourceNode | null = null
let analyserNode: AnalyserNode | null = null
let gainNode: GainNode | null = null
let convolver: ConvolverNode | null = null
let destNode: MediaStreamAudioDestinationNode | null = null

// Meter RAF
let meterFrame: number | null = null
const meterPct = ref(0)
const meterClass = computed(() => {
  if (meterPct.value > 80) return 'meter--hot'
  if (meterPct.value > 40) return 'meter--good'
  return 'meter--low'
})
const meterLabel = computed(() => {
  if (!hasStream.value) return 'No mic'
  if (meterPct.value > 80) return 'Hot'
  if (meterPct.value > 40) return 'Good'
  if (meterPct.value > 5)  return 'Low'
  return 'Silent'
})

// MediaRecorder
let recorder: MediaRecorder | null = null
let recChunks: Blob[] = []
let recBlob: Blob | null = null
let recTimer: ReturnType<typeof setInterval> | null = null
let waveTimer: ReturnType<typeof setInterval> | null = null
let playbackAudio: HTMLAudioElement | null = null

// ── Init ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  try {
    // Get device list (needs permission first)
    stream = await navigator.mediaDevices.getUserMedia({
      audio: selectedDeviceId.value ? { deviceId: { exact: selectedDeviceId.value } } : true,
      video: false,
    })
    hasStream.value = true
    permError.value = ''
    await refreshDevices()
    buildAudioGraph()
    startMeter()
  } catch (e: unknown) {
    hasStream.value = false
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
      permError.value = 'Microphone access denied. Allow mic permission in your OS settings.'
    } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
      permError.value = 'No microphone found.'
    } else {
      permError.value = `Could not open mic: ${msg}`
    }
  }
}

async function refreshDevices(): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  inputDevices.value = devices.filter(d => d.kind === 'audioinput')
}

function buildAudioGraph(): void {
  if (!stream) return
  audioCtx = new AudioContext()
  sourceNode = audioCtx.createMediaStreamSource(stream)
  analyserNode = audioCtx.createAnalyser()
  analyserNode.fftSize = 256
  analyserNode.smoothingTimeConstant = 0.5
  sourceNode.connect(analyserNode)
}

function startMeter(): void {
  if (!analyserNode) return
  const buf = new Uint8Array(analyserNode.frequencyBinCount)

  function tick(): void {
    meterFrame = requestAnimationFrame(tick)
    if (!analyserNode) return
    analyserNode.getByteFrequencyData(buf)
    const avg = buf.reduce((s, v) => s + v, 0) / buf.length
    meterPct.value = Math.min(100, Math.round((avg / 128) * 100 * 2.5))
  }
  tick()
}

async function restartStream(): Promise<void> {
  teardown()
  await init()
}

// ── Monitor mode ─────────────────────────────────────────────────────────────

async function toggleMonitor(): Promise<void> {
  if (isMonitoring.value) {
    stopMonitor()
  } else {
    await startMonitor()
  }
}

async function startMonitor(): Promise<void> {
  if (!audioCtx || !sourceNode) return

  gainNode = audioCtx.createGain()
  gainNode.gain.value = monitorVolume.value / 100

  if (reverbWet.value > 0) {
    convolver = audioCtx.createConvolver()
    convolver.buffer = buildImpulseResponse(audioCtx, 1.5, 3)

    const dryGain  = audioCtx.createGain()
    const wetGain  = audioCtx.createGain()
    dryGain.gain.value = 1 - reverbWet.value / 100
    wetGain.gain.value = reverbWet.value / 100

    sourceNode.connect(dryGain)
    sourceNode.connect(convolver)
    convolver.connect(wetGain)

    dryGain.connect(gainNode)
    wetGain.connect(gainNode)
  } else {
    sourceNode.connect(gainNode)
  }

  gainNode.connect(audioCtx.destination)
  isMonitoring.value = true
}

function stopMonitor(): void {
  // Disconnect monitor chain by rebuilding gain connections
  if (gainNode) {
    try { gainNode.disconnect() } catch { /* ignore */ }
    gainNode = null
  }
  if (convolver) {
    try { convolver.disconnect() } catch { /* ignore */ }
    convolver = null
  }
  // Reconnect source → analyser only
  if (sourceNode && analyserNode) {
    try { sourceNode.disconnect() } catch { /* ignore */ }
    sourceNode.connect(analyserNode)
  }
  isMonitoring.value = false
}

function buildImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const rate     = ctx.sampleRate
  const length   = rate * duration
  const impulse  = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

// ── Volume / reverb watchers ──────────────────────────────────────────────────

watch(monitorVolume, v => {
  if (gainNode) gainNode.gain.value = v / 100
})

watch(reverbWet, () => {
  if (isMonitoring.value) {
    stopMonitor()
    startMonitor()
  }
})

// ── Record mode ───────────────────────────────────────────────────────────────

function startRecord(): void {
  if (!stream) return
  recChunks = []
  recBlob   = null
  recElapsed.value = 0
  waveformBars.value = Array(24).fill(4)

  recorder = new MediaRecorder(stream)
  recorder.ondataavailable = e => { if (e.data.size > 0) recChunks.push(e.data) }
  recorder.onstop = () => {
    recBlob = new Blob(recChunks, { type: 'audio/webm' })
    recDuration.value = recElapsed.value
    recState.value = 'done'
  }
  recorder.start(100)
  recState.value = 'recording'

  recTimer = setInterval(() => {
    recElapsed.value += 0.1
    if (recElapsed.value >= MAX_REC_SEC) stopRecord()
  }, 100)

  // Animate waveform from analyser
  waveTimer = setInterval(() => {
    if (!analyserNode) return
    const buf = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteFrequencyData(buf)

    const bars: number[] = []
    const step = Math.floor(buf.length / 24)
    for (let i = 0; i < 24; i++) {
      const avg = buf.slice(i * step, (i + 1) * step).reduce((s, v) => s + v, 0) / step
      bars.push(Math.max(3, Math.min(32, Math.round(avg / 4)))  )
    }
    waveformBars.value = bars
  }, 80)
}

function stopRecord(): void {
  if (recTimer)  { clearInterval(recTimer);  recTimer  = null }
  if (waveTimer) { clearInterval(waveTimer); waveTimer = null }
  recorder?.stop()
  recorder = null
}

function playBack(): void {
  if (!recBlob) return
  recState.value = 'playing'
  const url = URL.createObjectURL(recBlob)
  playbackAudio = new Audio(url)
  playbackAudio.onended = () => {
    recState.value = 'done'
    URL.revokeObjectURL(url)
  }
  playbackAudio.play().catch(() => { recState.value = 'done' })
}

function stopPlayback(): void {
  playbackAudio?.pause()
  playbackAudio = null
  recState.value = 'done'
}

// ── Mode switch ───────────────────────────────────────────────────────────────

function setMode(m: 'monitor' | 'record'): void {
  if (mode.value === 'monitor' && isMonitoring.value) stopMonitor()
  if (mode.value === 'record'  && recState.value === 'recording') stopRecord()
  if (recState.value === 'playing') stopPlayback()
  mode.value = m
}

// ── Teardown ──────────────────────────────────────────────────────────────────

function teardown(): void {
  if (meterFrame !== null) cancelAnimationFrame(meterFrame)
  if (recTimer)  clearInterval(recTimer)
  if (waveTimer) clearInterval(waveTimer)
  recorder?.stop()
  playbackAudio?.pause()
  isMonitoring.value = false
  recState.value     = 'idle'

  try { gainNode?.disconnect()    } catch { /* ignore */ }
  try { convolver?.disconnect()   } catch { /* ignore */ }
  try { sourceNode?.disconnect()  } catch { /* ignore */ }
  try { analyserNode?.disconnect() } catch { /* ignore */ }

  audioCtx?.close().catch(() => {})
  stream?.getTracks().forEach(t => t.stop())

  audioCtx     = null
  sourceNode   = null
  analyserNode = null
  gainNode     = null
  convolver    = null
  stream       = null
  hasStream.value  = false
  meterPct.value   = 0
}

onUnmounted(teardown)

// Auto-init on mount
init()
</script>

<style lang="scss" scoped>
.voice-settings {
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: $sp-6;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 $sp-2;
}

// ── Setting groups ────────────────────────────────────────────────────────────
.setting-group {
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  overflow: hidden;
}

.group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: $text-muted;
  padding: 12px 18px 0;
}

.group-body {
  padding: 10px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;

  &--meter { gap: 12px; }
}

.setting-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  min-width: 110px;
  flex-shrink: 0;
}

.setting-select {
  flex: 1;
  background: $surface-elevated;
  border: 1px solid $border-strong;
  border-radius: $radius-sm;
  color: $text-primary;
  font-size: 13px;
  font-family: $font-family;
  padding: 7px 10px;
  outline: none;
  cursor: pointer;
  transition: border-color $transition;

  &:focus { border-color: $accent; }

  option { background: $surface-elevated; }
}

// ── Volume meter ──────────────────────────────────────────────────────────────
.meter-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.meter-bar {
  flex: 1;
  height: 8px;
  background: $surface-elevated;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid $border;
}

.meter-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 60ms linear, background 200ms;

  &.meter--low  { background: $text-muted; }
  &.meter--good { background: $success; }
  &.meter--hot  { background: $warning; }
}

.meter-label {
  font-size: 11px;
  font-weight: 600;
  min-width: 38px;
  text-align: right;

  &.meter--low  { color: $text-muted; }
  &.meter--good { color: $success; }
  &.meter--hot  { color: $warning; }
}

// ── Mode tabs ─────────────────────────────────────────────────────────────────
.mode-tabs {
  display: flex;
  gap: 6px;
  background: $surface-elevated;
  border-radius: $radius-sm;
  padding: 3px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  justify-content: center;
  padding: 7px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: $text-muted;
  font-size: 12px;
  font-weight: 600;
  font-family: $font-family;
  cursor: pointer;
  transition: background $transition, color $transition;

  &:hover { color: $text-secondary; }

  &.active {
    background: $surface;
    color: $text-primary;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }
}

// ── Test panels ───────────────────────────────────────────────────────────────
.test-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.test-desc {
  font-size: 12px;
  color: $text-muted;
  margin: 0;
  line-height: 1.5;
}

// ── Slider ────────────────────────────────────────────────────────────────────
.slider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.slider {
  flex: 1;
  accent-color: $accent;
  cursor: pointer;
}

.slider-val {
  font-size: 12px;
  color: $text-secondary;
  min-width: 34px;
  text-align: right;
}

// ── Action row ────────────────────────────────────────────────────────────────
.test-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.test-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: $radius-sm;
  border: 1px solid $border-strong;
  background: rgba(255,255,255,0.05);
  color: $text-secondary;
  font-size: 12px;
  font-weight: 600;
  font-family: $font-family;
  cursor: pointer;
  transition: background $transition, color $transition, border-color $transition;

  &:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
    color: $text-primary;
  }

  &:disabled { opacity: 0.4; cursor: default; }

  &--stop {
    color: $error;
    border-color: rgba(224, 80, 80, 0.4);
    background: rgba(224, 80, 80, 0.08);
    &:hover:not(:disabled) {
      background: rgba(224, 80, 80, 0.16);
      color: $error;
    }
  }

  &--record {
    color: $error;
    border-color: rgba(224, 80, 80, 0.4);
    &:hover:not(:disabled) { background: rgba(224,80,80,0.1); }
  }

  &--has-rec {
    color: $text-muted;
    border-color: $border-strong;
  }

  &--play {
    color: $success;
    border-color: rgba(52, 199, 89, 0.4);
    background: rgba(52, 199, 89, 0.06);
    &:hover:not(:disabled) { background: rgba(52,199,89,0.14); }
  }
}

// ── Monitor live badge ────────────────────────────────────────────────────────
.monitor-live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: $error;
  letter-spacing: 0.5px;
}

.monitor-warning {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: $warning;
  opacity: 0.85;
  margin-top: -4px;
}

// ── Record display ────────────────────────────────────────────────────────────
.rec-display {
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius-sm;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 72px;
  justify-content: center;
}

.rec-time {
  font-size: 13px;
  font-weight: 600;
  color: $text-muted;
  display: flex;
  align-items: center;
  gap: 8px;

  &--live { color: $error; }
  &--done { color: $success; }
  &--play { color: $accent; }
}

.rec-waveform {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 36px;
}

.rec-bar {
  width: 3px;
  background: $error;
  border-radius: 2px;
  transition: height 80ms ease;
  opacity: 0.85;
}

// ── Shared live dot ───────────────────────────────────────────────────────────
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $error;
  box-shadow: 0 0 6px rgba(224,80,80,0.7);
  animation: blink 1s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

// ── Permission error ──────────────────────────────────────────────────────────
.perm-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(224, 80, 80, 0.08);
  border: 1px solid rgba(224, 80, 80, 0.3);
  border-radius: $radius-sm;
  font-size: 13px;
  color: $error;
}
</style>
