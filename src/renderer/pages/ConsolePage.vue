<template>
  <div class="beja-console">

    <div class="con-bar">
      <div class="con-bar-left">
        <div class="con-dot" :class="dotClass" />
        <span class="con-title">BejaConsole</span>
        <span class="con-status">{{ statusLabel }}</span>
      </div>
      <div class="con-bar-right">
        <div class="filter-tabs">
          <button
            v-for="f in FILTERS"
            :key="f.id"
            class="filter-tab"
            :class="{ active: activeFilter === f.id }"
            @click="activeFilter = f.id"
          >{{ f.label }}</button>
        </div>
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search…"
            spellcheck="false"
          />
          <svg v-if="searchQuery" class="search-clear" @click="searchQuery = ''" width="10" height="10" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <button class="con-btn" :class="{ active: autoScroll }" title="Auto-scroll" @click="autoScroll = !autoScroll">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/>
          </svg>
        </button>
        <button class="con-btn" :class="{ copied }" title="Copy all" @click="copyAll">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
        <button class="con-btn" title="Clear" @click="clearLogs">Clear</button>
      </div>
    </div>

    <div class="con-counts" v-if="counts.error > 0 || counts.warn > 0">
      <span v-if="counts.error > 0" class="cnt cnt-err" @click="activeFilter = 'error'">{{ counts.error }} error{{ counts.error > 1 ? 's' : '' }}</span>
      <span v-if="counts.warn  > 0" class="cnt cnt-warn" @click="activeFilter = 'warn'">{{ counts.warn }} warning{{ counts.warn > 1 ? 's' : '' }}</span>
    </div>

    <div class="con-main">
      <div class="con-body" ref="bodyEl" @scroll="onBodyScroll">
        <div v-if="!filteredLines.length" class="con-empty">
          <template v-if="!lines.length">Waiting for output…</template>
          <template v-else>No lines match filter.</template>
        </div>
        <div
          v-for="(l, i) in filteredLines"
          :key="i"
          class="con-line"
          :class="lineClass(l)"
        >{{ l }}</div>
      </div>

      <div class="con-side">
        <video
          class="con-video"
          :src="consoleSideVideo"
          autoplay
          loop
          muted
          playsinline
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import consoleSideVideo from '../assets/console-side.mp4'

const FILTERS = [
  { id: 'all',   label: 'ALL'   },
  { id: 'info',  label: 'INFO'  },
  { id: 'warn',  label: 'WARN'  },
  { id: 'error', label: 'ERROR' },
  { id: 'beja',  label: 'BEJA'  },
] as const

type FilterId = typeof FILTERS[number]['id']

const lines        = ref<string[]>([])
const status       = ref('idle')
const copied       = ref(false)
const bodyEl       = ref<HTMLElement | null>(null)
const activeFilter = ref<FilterId>('all')
const searchQuery  = ref('')
const autoScroll   = ref(true)
let userScrolled   = false

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

function isError(l: string) { return l.startsWith('[ERR]') || /\b(ERROR|FATAL)\b/.test(l) }
function isWarn(l: string)  { return /\bWARN\b/.test(l) }
function isBeja(l: string)  { return l.startsWith('[BejaClient]') || l.startsWith('[Launcher]') || l.startsWith('[IPC]') }

function lineClass(l: string): string {
  if (isError(l))            return 'ln-err'
  if (isWarn(l))             return 'ln-warn'
  if (l.startsWith('[BejaClient]')) return 'ln-beja'
  if (l.startsWith('[Launcher]'))   return 'ln-info'
  if (l.startsWith('[IPC]'))        return 'ln-ipc'
  return ''
}

const counts = computed(() => ({
  error: lines.value.filter(isError).length,
  warn:  lines.value.filter(l => isWarn(l) && !isError(l)).length,
}))

const filteredLines = computed(() => {
  let ls = lines.value
  if (activeFilter.value === 'error') ls = ls.filter(isError)
  else if (activeFilter.value === 'warn')  ls = ls.filter(l => isWarn(l) && !isError(l))
  else if (activeFilter.value === 'beja')  ls = ls.filter(isBeja)
  else if (activeFilter.value === 'info')  ls = ls.filter(l => !isError(l) && !isWarn(l) && !isBeja(l))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    ls = ls.filter(l => l.toLowerCase().includes(q))
  }
  return ls
})

watch(filteredLines, () => {
  if (autoScroll.value && !userScrolled) scrollBottom()
})

function onBodyScroll() {
  const el = bodyEl.value
  if (!el) return
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  userScrolled = !atBottom
  if (atBottom) autoScroll.value = true
}

function scrollBottom() {
  nextTick(() => {
    if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
  })
}

function clearLogs() { lines.value = []; userScrolled = false }

async function copyAll() {
  const target = filteredLines.value.length ? filteredLines.value : lines.value
  if (!target.length) return
  await navigator.clipboard.writeText(target.join('\n'))
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

onMounted(() => {
  const prevTitle = document.title
  document.title = 'BejaConsole'
  onUnmounted(() => { document.title = prevTitle })

  window.api.console.onLog(line => {
    lines.value.push(line)
    if (lines.value.length > 2000) lines.value.shift()
  })
  window.api.console.onStatus(s => {
    if (s === 'running' || s === 'starting' || s === 'error') {
      status.value = s
    } else if (s.startsWith('stopped')) {
      status.value = 'idle'
    }
  })
  window.api.console.onClear(() => { lines.value = []; userScrolled = false })
})
</script>

<style lang="scss" scoped>
.beja-console {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg;
  color: $text-secondary;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  overflow: hidden;
}

.con-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 14px;
  height: 42px;
  background: $surface-panel;
  border-bottom: 1px solid $border;
  user-select: none;
  gap: 8px;
  box-shadow: $shadow-inset;
}

.con-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.con-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: $border-strong;

  &.dot-running  { background: $success; box-shadow: 0 0 6px rgba(48, 209, 88, 0.5); animation: blink 2s #{$ease-both} infinite; }
  &.dot-starting { background: $warning; box-shadow: 0 0 6px rgba(232, 160, 48, 0.5); animation: blink 0.8s #{$ease-both} infinite; }
  &.dot-error    { background: $error; }
  &.dot-idle     { background: $border-strong; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.con-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: $text-muted;
}

.con-status {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: $border-strong;
}

.con-bar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: flex-end;
}

.filter-tabs {
  display: flex;
  gap: 1px;
  background: $bg;
  border: 1px solid $border;
  border-radius: 5px;
  padding: 2px;
  margin-right: 4px;
}

.filter-tab {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  font-family: inherit;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: $text-muted;
  cursor: pointer;
  transition: background $transition-fast, color $transition-fast;

  &:hover  { color: $text-secondary; }
  &.active { background: $surface-elevated; color: $text-primary; }
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 130px;
  padding: 4px 24px 4px 9px;
  font-size: 11px;
  font-family: inherit;
  background: $surface;
  border: 1px solid $border;
  border-radius: 5px;
  color: $text-secondary;
  outline: none;
  transition: border-color $transition-fast, width 200ms $ease-out;

  &:focus { border-color: $border-strong; width: 180px; }
  &::placeholder { color: $text-muted; opacity: 0.5; }
}

.search-clear {
  position: absolute;
  right: 7px;
  color: $text-muted;
  cursor: pointer;
  transition: color $transition-fast;
  &:hover { color: $text-secondary; }
}

.con-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-family: inherit;
  background: $surface;
  border: 1px solid $border;
  border-radius: 5px;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: border-color $transition-fast, color $transition-fast, background $transition-fast;

  &:hover    { border-color: $border-strong; color: $text-secondary; background: $surface-elevated; }
  &.copied   { color: $success; border-color: rgba(48, 209, 88, 0.25); }
  &.active   { color: $primary; border-color: rgba(62, 184, 255, 0.3); }
}

.con-counts {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 4px 14px;
  background: $surface-panel;
  border-bottom: 1px solid $border;
}

.cnt {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: opacity 120ms;
  &:hover { opacity: 0.7; }
}
.cnt-err  { color: $error; }
.cnt-warn { color: $warning; }

.con-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.con-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;

  &::-webkit-scrollbar { width: 2px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: $border-strong; border-radius: 2px; }
}

.con-side {
  width: 220px;
  flex-shrink: 0;
  border-left: 1px solid $border;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg;
}

.con-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.con-empty {
  font-size: 12px;
  color: $border-strong;
  padding: 8px 0;
  font-style: italic;
}

.con-line {
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: $text-muted;

  &.ln-err  { color: $error; }
  &.ln-warn { color: $warning; }
  &.ln-beja { color: #22d3ee; }  // bioluminescent cyan for BejaClient
  &.ln-info { color: $primary; }
  &.ln-ipc  { color: #2db89e; }
}
</style>
