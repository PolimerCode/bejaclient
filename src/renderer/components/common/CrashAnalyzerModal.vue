<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="store.crashInfo" class="crash-overlay" @click.self="store.crashInfo = null">
        <div class="crash-modal">

          <div class="crash-header">
            <div class="crash-icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="crash-header-text">
              <h2 class="crash-title">Game Crashed</h2>
              <p class="crash-subtitle">BejaClient analyzed your crash log</p>
            </div>
            <button class="crash-close" @click="store.crashInfo = null">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="crash-body">
            <div class="crash-card cause-card">
              <span class="card-label">Likely Cause</span>
              <p class="card-text">{{ store.crashInfo.cause }}</p>
            </div>
            <div class="crash-card fix-card">
              <span class="card-label">Suggested Fix</span>
              <p class="card-text">{{ store.crashInfo.fix }}</p>
            </div>
            <div v-if="store.crashInfo.lines.length" class="crash-log-wrap">
              <span class="card-label">Error Lines</span>
              <pre class="crash-log">{{ store.crashInfo.lines.join('\n') }}</pre>
            </div>
          </div>

          <div class="crash-footer">
            <button class="btn-secondary" @click="store.crashInfo = null">Dismiss</button>
            <button class="btn-primary" @click="openProfiles">Profile Settings</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLauncherStore } from '../../store/launcherStore'

const store  = useLauncherStore()
const router = useRouter()

function openProfiles() {
  store.crashInfo = null
  router.push('/profiles')
}
</script>

<style lang="scss" scoped>
.crash-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.crash-modal {
  width: 480px;
  max-width: 92vw;
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: $shadow-inset, $shadow-xl;
}

.crash-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #1e1414;
  background: #1a1010;
}

.crash-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(220, 60, 60, 0.12);
  border: 1px solid rgba(220, 60, 60, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e05050;
  flex-shrink: 0;
}

.crash-header-text { flex: 1; }

.crash-title {
  font-size: 15px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 2px;
}

.crash-subtitle {
  font-size: 11px;
  color: $muted;
  margin: 0;
}

.crash-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  color: $text-secondary;
  cursor: pointer;
  transition: color $transition, background $transition;
  flex-shrink: 0;
  &:hover { color: $text-primary; background: $border; }
}

.crash-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.crash-card {
  padding: 12px 14px;
  border-radius: $radius;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cause-card {
  background: rgba(220, 60, 60, 0.07);
  border: 1px solid rgba(220, 60, 60, 0.2);
}

.fix-card {
  background: rgba(52, 199, 89, 0.06);
  border: 1px solid rgba(52, 199, 89, 0.18);
}

.card-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: $muted;
}

.card-text {
  font-size: 13px;
  color: $text-primary;
  margin: 0;
  line-height: 1.5;
}

.crash-log-wrap {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.crash-log {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 10px;
  color: #e05050;
  background: #0d0a0a;
  border: 1px solid #1e1414;
  border-radius: $radius;
  padding: 10px 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
  margin: 0;
  &::-webkit-scrollbar { width: 3px; height: 3px; }
  &::-webkit-scrollbar-thumb { background: #2a1a1a; border-radius: 3px; }
}

.crash-footer {
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid $border;
  background: $surface-panel;
}

.btn-primary {
  flex: 1;
  padding: 8px 16px;
  background: $text-primary;
  color: $bg;
  border: none;
  border-radius: $radius;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background $transition;
  &:hover { background: $text-secondary; }
}

.btn-secondary {
  flex: 1;
  padding: 8px 16px;
  background: $surface-elevated;
  color: $text-secondary;
  border: 1px solid $border;
  border-radius: $radius;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background $transition;
  &:hover { background: $border; color: $text-primary; }
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 150ms ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
