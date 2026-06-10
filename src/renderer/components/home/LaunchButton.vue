<template>
  <div class="launch-wrap">
  <div class="launch-split" ref="rootEl" :style="{ backgroundImage: `url(${launchBg})` }">

    <!-- Main launch area -->
    <button
      class="launch-main"
      :class="status"
      :disabled="status === 'starting' || status === 'stopping'"
      @click="onLaunch"
    >
      <!-- Idle: show version label below the "Launch" text from the bg image -->
      <template v-if="status === 'idle'">
        <span v-if="activeProfile" class="launch-version">{{ versionLabel }}</span>
      </template>

      <!-- Starting -->
      <template v-else-if="status === 'starting'">
        <div class="launch-state-overlay">
          <svg class="launch-icon spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span class="launch-label launch-label--status">{{ store.statusMsg || 'Starting…' }}</span>
        </div>
      </template>

      <!-- Running -->
      <template v-else-if="status === 'running'">
        <div class="launch-state-overlay">
          <span class="launch-label">Running</span>
        </div>
      </template>

      <!-- Error -->
      <template v-else-if="status === 'error'">
        <div class="launch-state-overlay">
          <span class="launch-label launch-label--error">Retry</span>
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
        <div class="dropdown-label">Profile</div>
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
        <div v-if="profiles.length === 0" class="dropdown-empty">No profiles</div>
      </div>
    </Transition>
  </div>

  <Transition name="err-fade">
    <div v-if="status === 'error' && store.lastError" class="launch-error">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><line x1="6" y1="3.5" x2="6" y2="6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="8.5" r="0.6" fill="currentColor"/></svg>
      <span class="launch-error-text">{{ store.lastError.split('\n')[0] }}</span>
    </div>
  </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLauncherStore } from '../../store/launcherStore'
import launchBg from '../../assets/launch-btn-bg.png'

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
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  max-width: 275px;
  color: $text-secondary;
}

.launch-error-text {
  font-size: 11px;
  color: $text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.err-fade-enter-active, .err-fade-leave-active { transition: opacity 0.2s ease; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; }

.launch-split {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 340px;
  height: 80px;
  border: none;
  border-radius: 0;
  overflow: visible;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  backdrop-filter: blur(6px);
}

.launch-main {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
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

.launch-label {
  font-family: 'Mojangles', sans-serif;
  font-size: 30px;
  font-weight: 400;
  line-height: 1;
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.55), 0 0 12px rgba(255,255,255,0.25);

  &--status {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
    text-shadow: none;
  }

  &--error { color: #ff6b6b; }
}

.launch-version {
  position: absolute;
  bottom: 13px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'Mojangles', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.4);
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
  background: rgba(255, 255, 255, 0.18);
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
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: opacity 120ms;
  flex-shrink: 0;

  &:hover:not(:disabled) { opacity: 0.7; }
  &:disabled { cursor: not-allowed; }
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
.profile-dropdown {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
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
    background: $surface-elevated;
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
