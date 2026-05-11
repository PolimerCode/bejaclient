<template>
  <div class="home-page" @click.self="closeDropdown">

    <!-- ── Video banner ── -->
    <div class="play-banner-wrap">
      <video class="play-banner" autoplay loop muted playsinline>
        <source :src="bannerVideo" type="video/mp4" />
      </video>
    </div>

    <!-- ── Launch zone ── -->
    <div class="play-zone">
      <div class="launch-cluster">

        <!-- Instance pill + gear -->
        <div class="instance-row">
          <div
            class="instance-pill"
            :class="{ open: showDropdown }"
            @click.stop="toggleDropdown"
          >
            <span class="inst-label">iNSTANCE</span>
            <span class="inst-sep" />
            <span class="inst-ver">{{ activeProfile?.version ?? '—' }}</span>
            <svg class="inst-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <button class="gear-btn" @click="goSettings" title="Settings">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>

        <!-- Profile dropdown -->
        <Transition name="drop">
          <div v-if="showDropdown" class="profile-dropdown" @click.stop>
            <button
              v-for="p in profiles"
              :key="p.id"
              class="profile-opt"
              :class="{ active: p.id === activeProfile?.id }"
              @click="selectProfile(p.id)"
            >
              <span class="popt-name">{{ p.name }}</span>
              <span class="popt-ver">{{ p.version }}</span>
            </button>
            <div v-if="!profiles.length" class="popt-empty">No instances configured</div>
          </div>
        </Transition>

        <!-- Play button -->
        <button
          class="play-btn"
          :class="btnClass"
          :disabled="!canLaunch"
          @click="handlePlay"
        >
          <div v-if="installProgress" class="prog-track">
            <div class="prog-fill" :style="{ width: progressPct + '%' }" />
          </div>
          <span class="play-text">{{ playLabel }}</span>
        </button>

        <!-- Progress / launch hint -->
        <p v-if="installProgress" class="play-sub">{{ installProgress.task }}</p>
        <p v-else-if="launcherStore.status === 'error' && launcherStore.lastError" class="play-error">{{ launcherStore.lastError.split('\n')[0] }}</p>
        <p v-else-if="!account" class="play-hint" @click="goSettings">
          Sign in to play →
        </p>
        <p v-else-if="!activeProfile" class="play-hint" @click="goSettings">
          Create a profile first →
        </p>

      </div>
    </div>

    <!-- ── News zone — placeholder embeds only ── -->
    <div class="news-zone">
      <div class="news-inner">

        <!-- Featured banner placeholder -->
        <div class="news-banner" />

        <!-- Row 1 -->
        <div class="news-grid">
          <div v-for="n in 4" :key="n" class="news-card" />
        </div>

        <!-- Row 2 -->
        <div class="news-grid">
          <div v-for="n in 4" :key="'b' + n" class="news-card" />
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import bannerVideo from '../assets/play-banner.mp4'
import { useRouter } from 'vue-router'
import { useAccountStore } from '../store/accountStore'
import { useLauncherStore } from '../store/launcherStore'

const router        = useRouter()
const accountStore  = useAccountStore()
const launcherStore = useLauncherStore()

const account         = computed(() => accountStore.selectedAccount)
const activeProfile   = computed(() => launcherStore.activeProfile)
const profiles        = computed(() => launcherStore.profiles)
const isRunning       = computed(() => launcherStore.isRunning)
const isLaunching     = computed(() => launcherStore.isLaunching)
const installProgress = computed(() => launcherStore.installProgress)

const showDropdown = ref(false)

const progressPct = computed(() => {
  const p = installProgress.value
  if (!p || p.total <= 0) return 0
  return Math.round((p.progress / p.total) * 100)
})

const canLaunch = computed(
  () => (account.value !== null || isRunning.value) &&
        (activeProfile.value !== null || isRunning.value) &&
        !isLaunching.value,
)

const playLabel = computed(() => {
  const s = launcherStore.status
  if (isRunning.value)  return 'STOP'
  if (s === 'stopping') return 'STOPPING'
  if (s === 'error')    return 'ERROR'
  if (isLaunching.value) return installProgress.value ? `${progressPct.value}%` : 'LAUNCHING'
  return 'PLAY'
})

const btnClass = computed(() => ({
  running:    isRunning.value,
  launching:  isLaunching.value && !installProgress.value,
  installing: isLaunching.value && !!installProgress.value,
  error:      launcherStore.status === 'error',
}))

function toggleDropdown()  { showDropdown.value = !showDropdown.value }
function closeDropdown()   { showDropdown.value = false }
function goSettings()      { router.push('/settings') }

async function selectProfile(id: string) {
  await launcherStore.setActiveProfile(id)
  showDropdown.value = false
}

async function handlePlay() {
  if (isRunning.value) await launcherStore.killGame()
  else                 await launcherStore.launch()
}
</script>

<style lang="scss" scoped>
.home-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: #000;
}

// ── Video banner ──────────────────────────────────────────────────────────────
.play-banner-wrap {
  flex-shrink: 0;
  padding: 14px 14px 0;
}

.play-banner {
  display: block;
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 18px;
  pointer-events: none;
}

// ── Play zone ──────────────────────────────────────────────────────────────────
.play-zone {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 14px 28px;
  position: relative;
}

.launch-cluster {
  display: flex;
  flex-direction: column;
  width: 380px;
}

// ── Instance row ──────────────────────────────────────────────────────────────
.instance-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.instance-pill {
  flex: 1;
  display: flex;
  align-items: center;
  height: 44px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: 10px;
  padding: 0 14px;
  cursor: pointer;
  gap: 10px;
  user-select: none;
  transition: border-color $transition;

  &:hover, &.open { border-color: $border-strong; }
}

.inst-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-muted;
  flex-shrink: 0;
}

.inst-sep {
  width: 1px;
  height: 18px;
  background: $border-strong;
  flex-shrink: 0;
}

.inst-ver {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.inst-chevron {
  flex-shrink: 0;
  color: $muted;
  transition: transform $transition;

  .instance-pill.open & { transform: rotate(180deg); }
}

.gear-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  transition: border-color $transition, color $transition;

  &:hover {
    border-color: $border-strong;
    color: $text-secondary;
  }
}

// ── Profile dropdown ──────────────────────────────────────────────────────────
.profile-dropdown {
  position: absolute;
  top: 52px;
  left: 0;
  right: 52px;
  background: $surface-elevated;
  border: 1px solid $border-strong;
  border-radius: 10px;
  overflow: hidden;
  z-index: 20;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.profile-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: $text-secondary;
  font-size: 13px;
  text-align: left;
  transition: background $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: $text-primary;
  }

  &.active { color: var(--accent, #{$accent}); }
}

.popt-name { font-weight: 600; }
.popt-ver  { font-size: 11px; color: $muted; }
.popt-empty { padding: 12px 14px; font-size: 12px; color: $muted; }

.drop-enter-active, .drop-leave-active {
  transition: opacity $transition, transform $transition;
}
.drop-enter-from, .drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

// ── Play button ───────────────────────────────────────────────────────────────
.play-btn {
  position: relative;
  height: 64px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  overflow: hidden;
  background: var(--accent, #{$accent});
  display: flex;
  align-items: center;
  justify-content: center;
  transition: filter $transition, background $transition;

  &:hover:not(:disabled)  { filter: brightness(1.12); }
  &:active:not(:disabled) { filter: brightness(0.88); }

  &:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    filter: grayscale(0.3);
  }

  &.running {
    background: $surface-elevated;
    border: 1px solid $border;
    .play-text { color: $text-primary; }
  }

  &.launching  { filter: brightness(0.8); }
  &.installing { filter: brightness(0.65); }
  &.error      { background: #b02020; }
}

.play-text {
  position: relative;
  z-index: 1;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fff;
  line-height: 1;
}

.prog-track {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.prog-fill {
  height: 100%;
  background: var(--accent, #{$accent});
  transition: width 200ms ease;
}

.play-sub {
  margin: 7px 0 0;
  font-size: 11px;
  color: $text-muted;
  text-align: center;
  letter-spacing: 0.03em;
}

.play-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: $muted;
  text-align: center;
  cursor: pointer;
  transition: color $transition;

  &:hover { color: var(--accent, #{$accent}); }
}

.play-error {
  margin: 8px 0 0;
  font-size: 11px;
  color: #e05050;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 380px;
}

// ── News zone ─────────────────────────────────────────────────────────────────
.news-zone {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: $border; border-radius: 2px; }
}

.news-inner {
  padding: 0 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

// ── Placeholder embeds ────────────────────────────────────────────────────────
.news-banner {
  height: 90px;
  border-radius: 12px;
  background: $surface-elevated;
  border: 1px solid $border;
  flex-shrink: 0;
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.news-card {
  height: 140px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: 10px;
}
</style>
