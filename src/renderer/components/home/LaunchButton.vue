<template>
  <div class="launch-wrap">
  <div class="launch-split" ref="rootEl">

    <!-- Main launch area -->
    <button
      class="launch-main"
      :class="status"
      :disabled="status === 'starting' || status === 'stopping'"
      @click="onLaunch"
    >
      <!-- Idle: rocket + carved LAUNCH label + current profile -->
      <template v-if="status === 'idle'">
        <svg class="launch-rocket" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        </svg>
        <span class="launch-label launch-label--title">LAUNCH</span>
        <span v-if="activeProfile" class="launch-version">{{ versionLabel }}</span>
      </template>

      <!-- Starting -->
      <template v-else-if="status === 'starting'">
        <div class="launch-state-overlay">
          <svg class="launch-icon spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span class="launch-label launch-label--status">{{ store.statusMsg || $t('launch.starting') }}</span>
        </div>
      </template>

      <!-- Running -->
      <template v-else-if="status === 'running'">
        <div class="launch-state-overlay">
          <span class="launch-label">{{ $t('launch.running') }}</span>
        </div>
      </template>

      <!-- Error -->
      <template v-else-if="status === 'error'">
        <div class="launch-state-overlay">
          <span class="launch-label launch-label--error">{{ $t('launch.retry') }}</span>
        </div>
      </template>
    </button>

    <!-- Divider -->
    <div class="launch-divider" />

    <!-- Dropdown chevron -->
    <button class="launch-chevron" @click.stop="toggleDropdown" :disabled="status === 'starting' || status === 'stopping'">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Profile dropdown -->
    <Transition name="dropdown-fade">
      <div v-if="dropdownOpen" class="profile-dropdown">
        <div class="dropdown-label">{{ $t('launch.profile') }}</div>
        <button
          v-for="profile in profiles"
          :key="profile.id"
          class="dropdown-item"
          :class="{ active: profile.id === activeProfile?.id }"
          @click="selectProfile(profile.id)"
        >
          <span class="dropdown-item-name">{{ profile.name }}</span>
          <span class="dropdown-item-version">{{ profile.version }}</span>
        </button>
        <div v-if="profiles.length === 0" class="dropdown-empty">{{ $t('launch.noProfiles') }}</div>
      </div>
    </Transition>
  </div>

  <Transition name="err-fade">
    <div v-if="status === 'error' && store.lastError" class="launch-error">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><line x1="6" y1="3.5" x2="6" y2="6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="8.5" r="0.6" fill="currentColor"/></svg>
      <span class="launch-error-text">{{ store.lastError }}</span>
    </div>
  </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLauncherStore } from '../../store/launcherStore'

const store = useLauncherStore()
const status = computed(() => store.status)
const profiles = computed(() => store.profiles)
const activeProfile = computed(() => store.activeProfile)
const dropdownOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const LOADER_NAMES: Record<string, string> = {
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
  quilt: 'Quilt',
  vanilla: '',
}

const versionLabel = computed(() => {
  const p = activeProfile.value
  if (!p) return ''
  if (p.useBejaClient) return `BJC ${p.version}`
  const name = LOADER_NAMES[p.loader] ?? p.loader
  return name ? `${name} ${p.version}` : p.version
})

function onLaunch() {
  if (status.value === 'running') {
    store.killGame()
  } else if (status.value === 'idle' || status.value === 'error') {
    store.launch()
  }
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

async function selectProfile(id: string) {
  await store.setActiveProfile(id)
  dropdownOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (dropdownOpen.value && rootEl.value && !rootEl.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside, true))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside, true))
</script>

<style lang="scss" scoped>
.launch-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.launch-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 10px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  max-width: 340px;
  color: $text-secondary;
  cursor: pointer;
  user-select: text;
}

.launch-error-text {
  font-size: 11px;
  color: $text-secondary;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
}

.err-fade-enter-active, .err-fade-leave-active { transition: opacity 0.2s ease; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; }

.launch-split {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 340px;
  height: 80px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 0;
  overflow: visible;
  background: rgba(13, 13, 13, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.7), inset 0 -1px 0 rgba(255, 255, 255, 0.03);
}

.launch-main {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 120ms;

  &:hover:not(:disabled) { opacity: 0.85; }
  &:disabled { cursor: not-allowed; opacity: 0.6; }
}

.launch-icon {
  flex-shrink: 0;
  color: #fff;
  &.spin { animation: spin 0.9s linear infinite; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ── Carved-in look — dark shadow up-left (recess wall), faint highlight down-right (lit rim) ──
.launch-rocket {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.45);
  filter:
    drop-shadow(-1px -1px 0.5px rgba(0, 0, 0, 0.9))
    drop-shadow(1px 1px 0.5px rgba(255, 255, 255, 0.18));
}

.launch-label {
  font-family: 'Mojangles', sans-serif;
  font-size: 30px;
  font-weight: 400;
  line-height: 1;
  color: rgba(255, 255, 255, 0.55);
  text-shadow: -1px -1px 1px rgba(0, 0, 0, 0.9), 1px 1px 1px rgba(255, 255, 255, 0.18);

  &--title {
    font-size: 24px;
    letter-spacing: 0.04em;
  }

  &--status {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
    color: rgba(255, 255, 255, 0.7);
    text-shadow: none;
  }

  &--error { color: #ff6b6b; text-shadow: none; }
}

.launch-version {
  text-align: center;
  font-family: 'Mojangles', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1;
  margin-top: 3px;
  text-shadow: -1px -1px 1px rgba(0, 0, 0, 0.9), 1px 1px 1px rgba(255, 255, 255, 0.12);
  background: transparent;
}

.launch-state-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  border-radius: 0;
}

.launch-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  align-self: stretch;
}

.launch-chevron {
  width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: color 120ms, opacity 120ms;
  flex-shrink: 0;

  &:hover:not(:disabled) { opacity: 0.7; color: #fff; }
  &:disabled { cursor: not-allowed; }
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
.profile-dropdown {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.61);
  border-radius: 0;
  overflow: hidden;
  z-index: 10;
}

.dropdown-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $muted;
  padding: 10px 14px 6px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 14px;
  background: none;
  border: none;
  color: $text-secondary;
  cursor: pointer;
  font-size: 13px;
  transition: background 120ms, color 120ms;

  &:hover {
    background: #1a1a1a;
    color: $text-primary;
  }

  &.active {
    color: $text-primary;
    .dropdown-item-name { font-weight: 600; }
  }
}

.dropdown-item-name {
  font-weight: 500;
}

.dropdown-item-version {
  font-size: 11px;
  color: $muted;
}

.dropdown-empty {
  padding: 12px 14px;
  font-size: 12px;
  color: $muted;
  font-style: italic;
}

.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(6px); }
</style>
