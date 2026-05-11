<template>
  <div class="beja-console">

    <div class="con-bar">
      <div class="con-bar-left">
        <div class="con-dot" :class="dotClass" />
        <span class="con-title">BejaConsole</span>
        <span class="con-status">{{ statusLabel }}</span>
      </div>
      <div class="con-bar-right">
        <button class="con-btn" :class="{ copied }" title="Copy all" @click="copyAll">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
        <button class="con-btn" title="Clear" @click="clearLogs">Clear</button>
      </div>
    </div>

    <div class="con-body" ref="bodyEl">
      <div v-if="!lines.length" class="con-empty">Waiting for output…</div>
      <div
        v-for="(l, i) in lines"
        :key="i"
        class="con-line"
        :class="lineClass(l)"
      >{{ l }}</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'

const lines = ref<string[]>([])
const status = ref('idle')
const copied = ref(false)
const bodyEl = ref<HTMLElement | null>(null)

const dotClass = computed(() => {
  if (status.value === 'running')  return 'dot-running'
  if (status.value === 'starting') return 'dot-starting'
  if (status.value === 'error')    return 'dot-error'
  return 'dot-idle'
})

const statusLabel = computed(() => {
  if (status.value === 'running')  return 'RUNNING'
  if (status.value === 'starting') return 'STARTING'
  if (status.value === 'error')    return 'ERROR'
  return ''
})

function lineClass(l: string): string {
  if (l.startsWith('[ERR]') || /\b(ERROR|FATAL)\b/.test(l)) return 'ln-err'
  if (/\bWARN\b/.test(l))          return 'ln-warn'
  if (l.startsWith('[BejaClient]')) return 'ln-beja'
  if (l.startsWith('[Launcher]'))   return 'ln-info'
  if (l.startsWith('[IPC]'))        return 'ln-ipc'
  return ''
}

function scrollBottom() {
  nextTick(() => {
    if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
  })
}

function clearLogs() { lines.value = [] }

async function copyAll() {
  if (!lines.value.length) return
  await navigator.clipboard.writeText(lines.value.join('\n'))
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

onMounted(() => {
  window.api.console.onLog(line => {
    lines.value.push(line)
    if (lines.value.length > 2000) lines.value.shift()
    scrollBottom()
  })
  window.api.console.onStatus(s => {
    if (s === 'running' || s === 'starting' || s === 'error') {
      status.value = s
    } else if (s.startsWith('stopped')) {
      status.value = 'idle'
    }
  })
  window.api.console.onClear(() => { lines.value = [] })
})
</script>

<style lang="scss" scoped>
.beja-console {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #060809;
  color: #c8cdd6;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  overflow: hidden;
}

.con-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  height: 42px;
  background: #0d1014;
  border-bottom: 1px solid #1a1f27;
  user-select: none;
}

.con-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.con-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #2a3040;

  &.dot-running  { background: #34c759; animation: blink 2s ease-in-out infinite; }
  &.dot-starting { background: #f97316; animation: blink 0.8s ease-in-out infinite; }
  &.dot-error    { background: #e05050; }
  &.dot-idle     { background: #2a3040; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.con-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8892a0;
}

.con-status {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #4a5568;
}

.con-bar-right {
  display: flex;
  gap: 6px;
}

.con-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-family: inherit;
  background: #141820;
  border: 1px solid #1e2530;
  border-radius: 5px;
  color: #6b7585;
  cursor: pointer;
  transition: border-color 120ms, color 120ms;

  &:hover    { border-color: #2a3448; color: #a0aab8; }
  &.copied   { color: #34c759; border-color: #1a3020; }
}

.con-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #1e2530; border-radius: 4px; }
}

.con-empty {
  font-size: 12px;
  color: #2e3848;
  padding: 8px 0;
  font-style: italic;
}

.con-line {
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
  color: #7a8496;

  &.ln-err  { color: #e05050; }
  &.ln-warn { color: #c8922a; }
  &.ln-beja { color: #f97316; }
  &.ln-info { color: #4a8fcc; }
  &.ln-ipc  { color: #3a7a50; }
}
</style>
