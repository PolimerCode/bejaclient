<template>
  <Transition name="update-fade">
    <div v-if="state !== 'idle'" class="update-overlay">
      <div class="update-card">

        <div class="update-header">
          <div class="update-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4 15h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="update-header-text">
            <div class="update-title">{{ state === 'restarting' ? 'Update Ready' : 'Updating BejaClient' }}</div>
            <div class="update-subtitle">Version {{ version }}</div>
          </div>
        </div>

        <!-- Downloading -->
        <template v-if="state === 'downloading'">
          <div class="progress-wrap">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progress + '%' }" />
            </div>
            <div class="progress-row">
              <span class="progress-pct">{{ progress }}%</span>
              <span class="progress-meta">{{ transferredMb }} / {{ totalMb }} MB &nbsp;·&nbsp; {{ speedMbs }} MB/s</span>
            </div>
          </div>
          <div class="update-notice">Downloading — please don't close the launcher</div>
        </template>

        <!-- Ready to install + countdown -->
        <template v-else-if="state === 'restarting'">
          <div class="progress-wrap">
            <div class="progress-track">
              <div class="progress-fill full" />
            </div>
            <div class="progress-row">
              <span class="progress-pct">100%</span>
              <span class="progress-meta">Download complete</span>
            </div>
          </div>
          <div class="restart-row">
            <span class="update-notice">Restarting in <strong>{{ countdown }}s</strong>…</span>
            <button class="restart-btn" @click="doInstall">Restart Now</button>
          </div>
        </template>

        <!-- Error -->
        <template v-else-if="state === 'error'">
          <div class="update-error">{{ errorMsg }}</div>
          <button class="dismiss-btn" @click="state = 'idle'">Dismiss</button>
        </template>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

type State = 'idle' | 'downloading' | 'restarting' | 'error'

const PENDING_KEY = 'beja-whats-new-pending'
const RESTART_DELAY = 8

const state     = ref<State>('idle')
const version   = ref('')
const progress  = ref(0)
const countdown = ref(RESTART_DELAY)
const errorMsg  = ref('')

const transferred = ref(0)
const total       = ref(0)
const speed       = ref(0)

const transferredMb = computed(() => (transferred.value / 1_048_576).toFixed(1))
const totalMb       = computed(() => (total.value       / 1_048_576).toFixed(1))
const speedMbs      = computed(() => (speed.value       / 1_048_576).toFixed(2))

let countdownTimer: ReturnType<typeof setInterval>

function doInstall() {
  clearInterval(countdownTimer)
  window.api.updater.install()
}

function startCountdown() {
  state.value = 'restarting'
  countdown.value = RESTART_DELAY
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      doInstall()
    }
  }, 1000)
}

onMounted(() => {
  window.api.updater.onAvailable((info) => {
    version.value = info.version
    progress.value = 0
    transferred.value = 0
    total.value = 0
    speed.value = 0
    state.value = 'downloading'
    const rawNotes = info.releaseNotes as string | Array<{ note?: string }> | null | undefined
    const notes = typeof rawNotes === 'string'
      ? rawNotes
      : Array.isArray(rawNotes)
        ? rawNotes.map(n => n.note ?? '').join('\n')
        : null
    localStorage.setItem(PENDING_KEY, JSON.stringify({ version: info.version, notes }))
  })

  window.api.updater.onProgress((p) => {
    state.value = 'downloading'
    progress.value    = Math.round(p.percent)
    transferred.value = p.transferred
    total.value       = p.total
    speed.value       = p.bytesPerSecond
  })

  window.api.updater.onDownloaded((info) => {
    version.value = info.version
    progress.value = 100
    startCountdown()
  })

  window.api.updater.onError((msg) => {
    errorMsg.value = msg
    state.value = 'error'
  })
})
</script>

<style lang="scss" scoped>
.update-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.update-card {
  background: $bg;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 28px 32px;
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.update-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.update-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(39, 173, 224, 0.12);
  border: 1px solid rgba(39, 173, 224, 0.25);
  color: #27ADE0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.update-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.update-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

.update-subtitle {
  font-size: 12px;
  color: $text-secondary;
}

.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: $border;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #27ADE0;
  border-radius: 3px;
  transition: width 0.4s ease;

  &.full { width: 100%; }
}

.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-pct {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.progress-meta {
  font-size: 12px;
  color: $text-secondary;
  font-variant-numeric: tabular-nums;
}

.update-notice {
  font-size: 12px;
  color: $text-secondary;

  strong { color: $text-primary; }
}

.restart-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.restart-btn {
  flex-shrink: 0;
  background: #27ADE0;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover { opacity: 0.85; }
}

.update-error {
  font-size: 12px;
  color: #e05555;
  line-height: 1.5;
}

.dismiss-btn {
  align-self: flex-end;
  background: none;
  border: 1px solid $border;
  color: $text-secondary;
  border-radius: 6px;
  padding: 5px 14px;
  font-size: 12px;
  cursor: pointer;

  &:hover { color: $text-primary; border-color: $text-secondary; }
}

.update-fade-enter-active,
.update-fade-leave-active { transition: opacity 0.25s ease; }
.update-fade-enter-from,
.update-fade-leave-to     { opacity: 0; }
</style>
