<template>
  <Transition name="log-slide">
    <div v-if="visible" class="game-logs">
      <div class="logs-header" @click="expanded = !expanded">
        <div class="logs-title-row">
          <div class="log-status-dot" :class="statusClass" />
          <span class="logs-title">Game Console</span>
          <span v-if="store.isRunning" class="logs-live-badge">LIVE</span>
        </div>
        <div class="logs-header-right">
          <button class="logs-action" :class="{ copied }" title="Copy logs" @click.stop="copyLogs">
            <svg v-if="!copied" width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M8 4V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2" stroke="currentColor" stroke-width="1.2"/></svg>
            <svg v-else width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="logs-action" title="Save logs to file" @click.stop="saveLogs">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10h8M6 2v6M3.5 5.5 6 8l2.5-2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="logs-clear" title="Clear logs" @click.stop="store.logs.splice(0)">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M4 3V2h4v1M5 6v3M7 6v3M2 3l.5 7a1 1 0 0 0 1 .9h5a1 1 0 0 0 1-.9L10 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <svg
            class="logs-chevron"
            :class="{ rotated: expanded }"
            width="12" height="12" viewBox="0 0 12 12" fill="none"
          >
            <polyline points="2 4 6 8 10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <Transition name="expand">
        <div v-if="expanded" class="logs-body" ref="bodyEl">
          <div v-if="store.logs.length === 0" class="logs-empty">No output yet…</div>
          <div
            v-for="(line, i) in store.logs"
            :key="i"
            class="log-line"
            :class="lineClass(line)"
          >{{ line }}</div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useLauncherStore } from '../../store/launcherStore'

const store = useLauncherStore()
const expanded = ref(false)
const bodyEl = ref<HTMLElement | null>(null)
const copied = ref(false)

async function copyLogs() {
  if (!store.logs.length) return
  await navigator.clipboard.writeText(store.logs.join('\n'))
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

async function saveLogs() {
  if (!store.logs.length) return
  await (window as any).api.launch.saveLogs(store.logs)
}

const visible = computed(() => store.logs.length > 0 || store.isRunning || store.isLaunching || store.status === 'error')

const statusClass = computed(() => {
  if (store.isRunning) return 'running'
  if (store.isLaunching) return 'launching'
  if (store.status === 'error') return 'error'
  return 'idle'
})

watch(() => store.isRunning,   (v) => { if (v) expanded.value = true })
watch(() => store.isLaunching, (v) => { if (v) expanded.value = true })
watch(() => store.status,      (v) => { if (v === 'error') expanded.value = true })

watch(() => store.logs.length, () => {
  if (!expanded.value) return
  nextTick(() => {
    if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
  })
})

function lineClass(line: string) {
  if (line.startsWith('[ERR]') || /ERROR|FATAL/i.test(line)) return 'line-error'
  if (/WARN/i.test(line)) return 'line-warn'
  if (line.startsWith('[Launcher]')) return 'line-info'
  return ''
}
</script>

<style lang="scss" scoped>
.game-logs {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 320px;
  z-index: 20;
  background: $bg;
  border-top: 1px solid $border;
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 120ms;
  &:hover { background: $surface-elevated; }
}

.logs-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  &.running   { background: $text-secondary; animation: pulse 2s infinite; }
  &.launching { background: $muted; animation: pulse 1s infinite; }
  &.error     { background: $muted; }
  &.idle      { background: $border-strong; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.logs-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: $muted;
}

.logs-live-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: $text-secondary;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius-sm;
  padding: 1px 5px;
}

.logs-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logs-action {
  color: $muted;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: color 120ms;
  &:hover { color: $text-primary; }
  &.copied { color: $text-secondary; }
}

.logs-clear {
  color: $muted;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: color 120ms;
  &:hover { color: $text-secondary; }
}

.logs-chevron {
  color: $muted;
  transition: transform 200ms ease;
  &.rotated { transform: rotate(180deg); }
}

.logs-body {
  max-height: 200px;
  overflow-y: auto;
  padding: 6px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: $border; border-radius: 4px; }
}

.logs-empty {
  font-size: 11px;
  color: $muted;
  font-style: italic;
  padding: 4px 0;
}

.log-line {
  font-size: 11px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: $text-secondary;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
  &.line-error { color: $text-secondary; }
  &.line-warn  { color: $muted; }
  &.line-info  { color: $text-muted; }
}

.log-slide-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.log-slide-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.log-slide-enter-from, .log-slide-leave-to { opacity: 0; transform: translateY(8px); }

.expand-enter-active { transition: all 0.2s ease; }
.expand-leave-active { transition: all 0.15s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0 !important; padding-top: 0; padding-bottom: 0; }
</style>
