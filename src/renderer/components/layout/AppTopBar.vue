<template>
  <header class="topbar" :class="{ maximized }">

    <!-- Brand -->
    <div class="topbar-brand">
      <div class="brand-info">
        <span class="brand-name">BejaClient</span>
        <span class="brand-version">BejaClient version {{ version }}</span>
      </div>
    </div>

    <!-- Drag region -->
    <div class="topbar-drag" />

    <!-- Instance picker -->
    <button class="instance-btn" :style="{ backgroundImage: `url(${pillBg})` }" @click="openWizard">
      {{ instanceLabel }}
    </button>

    <!-- Account -->
    <template v-if="account">
      <div ref="pillRef" class="account-pill" :style="{ backgroundImage: `url(${pillBg})` }" @click="dropdownOpen = !dropdownOpen">
        <img
          class="account-head"
          :src="`https://mc-heads.net/avatar/${account.uuid}/22`"
          :alt="account.username"
          @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
        />
        <span class="account-name">{{ account.username }}</span>
        <svg class="pill-chevron" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- Dropdown — teleported to body to escape all stacking contexts -->
      <Teleport to="body">
        <Transition name="dd">
          <div v-if="dropdownOpen" ref="dropdownRef" class="acc-dropdown" :style="dropdownStyle" @click.stop>
            <div class="dd-label">Accounts</div>

            <button
              v-for="acc in accountStore.accounts"
              :key="acc.id"
              class="dd-item"
              :class="{ active: acc.selected }"
              @click="switchAccount(acc.id)"
            >
              <img class="dd-head" :src="`https://mc-heads.net/avatar/${acc.uuid}/18`" :alt="acc.username"
                @error="(e) => (e.target as HTMLImageElement).style.display='none'" />
              <span class="dd-name">{{ acc.username }}</span>
              <svg v-if="acc.selected" width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <div class="dd-sep" />

            <button class="dd-item dd-add" :disabled="accountStore.loading" @click="addAccount">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>Add Account</span>
            </button>
          </div>
        </Transition>
      </Teleport>
    </template>
    <button
      v-else
      class="account-pill account-pill--guest"
      :style="{ backgroundImage: `url(${pillBg})` }"
      :disabled="accountStore.loading"
      @click="accountStore.login()"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M1.5 11.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      <span class="account-name account-name--guest">{{ accountStore.loading ? 'Signing in…' : 'Sign in' }}</span>
    </button>

    <!-- Window controls -->
    <div class="win-controls">
      <button class="win-btn" title="Minimize" @click="minimize">
        <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
      </button>
      <button class="win-btn" title="Maximize" @click="toggleMaximize">
        <svg v-if="!maximized" width="9" height="9" viewBox="0 0 9 9">
          <rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
        </svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10">
          <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
          <rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
        </svg>
      </button>
      <button class="win-btn win-close" title="Close" @click="close">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.3"/>
          <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" stroke-width="1.3"/>
        </svg>
      </button>
    </div>

  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAccountStore }  from '../../store/accountStore'
import { useLauncherStore } from '../../store/launcherStore'
import pillBg from '../../assets/pill-bg.png'

const accountStore = useAccountStore()
const launcherStore = useLauncherStore()

const maximized    = ref(false)
const dropdownOpen = ref(false)
const pillRef      = ref<HTMLElement | null>(null)
const dropdownRef  = ref<HTMLElement | null>(null)
const version      = '1.0.0'

const account       = computed(() => accountStore.selectedAccount)
const instanceLabel = computed(() => launcherStore.activeProfile?.name ?? 'No instance')

const dropdownStyle = computed(() => {
  if (!pillRef.value) return {}
  const rect = pillRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 6}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
})

function openWizard()     { launcherStore.wizardOpen = true }
function minimize()       { window.api.window.minimize() }
function toggleMaximize() { window.api.window.maximize() }
function close()          { window.api.window.close() }

async function switchAccount(id: string) {
  await accountStore.selectAccount(id)
  dropdownOpen.value = false
}

async function addAccount() {
  dropdownOpen.value = false
  await accountStore.login()
}

function onClickOutside(e: MouseEvent) {
  const t = e.target as Node
  if (
    pillRef.value && !pillRef.value.contains(t) &&
    dropdownRef.value && !dropdownRef.value.contains(t)
  ) {
    dropdownOpen.value = false
  }
}

onMounted(async () => {
  maximized.value = await window.api.window.isMaximized()
  window.api.window.onMaximized((v: boolean) => { maximized.value = v })
  document.addEventListener('mousedown', onClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside, true)
})
</script>

<style lang="scss" scoped>
.topbar {
  display: flex;
  align-items: center;
  height: 58px;
  flex-shrink: 0;
  -webkit-app-region: drag;
  background: #070908;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0 12px 0 20px;
  gap: 12px;
}

// ── Brand ─────────────────────────────────────────────────────────────────────
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

.brand-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-name {
  font-size: 14px;
  font-weight: 400;
  color: $text-primary;
  line-height: 1;
  font-family: 'Mojangles', sans-serif;
}

.brand-version {
  font-size: 10px;
  color: $text-muted;
  line-height: 1;
}

// ── Drag spacer ───────────────────────────────────────────────────────────────
.topbar-drag {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}

// ── Instance button ───────────────────────────────────────────────────────────
.instance-btn {
  -webkit-app-region: no-drag;
  height: 34px;
  padding: 0 16px;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  border: none;
  border-radius: 0;
  color: $text-primary;
  font-size: 13px;
  font-weight: 400;
  font-family: 'Mojangles', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity $transition-fast;

  &:hover { opacity: 0.85; }
}

// ── Account pill ──────────────────────────────────────────────────────────────
.account-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px 0 8px;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  border: none;
  border-radius: 0;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
  color: $text-secondary;
  transition: opacity $transition-fast;

  &:hover { opacity: 0.85; }
}

.account-pill--guest {
  color: #e05555;
  cursor: pointer;
  &:hover:not(:disabled) { opacity: 1; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.account-head {
  width: 22px;
  height: 22px;
  border-radius: 3px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.account-name {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;

  &--guest {
    color: #e05555;
    font-weight: 400;
    font-style: normal;
    font-family: 'Mojangles', sans-serif;
  }
}

.pill-chevron {
  transition: transform 150ms ease;
  &.open { transform: rotate(180deg); }
}

.acc-dropdown {
  position: fixed;
  min-width: 200px;
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  overflow: hidden;
  z-index: 2000;
  box-shadow: $shadow-xl;
}

.dd-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $muted;
  padding: 10px 12px 6px;
}

.dd-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  color: $text-secondary;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 100ms, color 100ms;

  &:hover:not(:disabled) { background: $surface-elevated; color: $text-primary; }
  &.active { color: $text-primary; font-weight: 600; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.dd-head {
  width: 18px;
  height: 18px;
  border-radius: 2px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.dd-name { flex: 1; }

.dd-sep {
  height: 1px;
  background: $border;
  margin: 4px 0;
}

.dd-add { color: $accent; }

.dd-enter-active, .dd-leave-active { transition: opacity 120ms ease, transform 120ms ease; }
.dd-enter-from, .dd-leave-to { opacity: 0; transform: translateY(-6px); }

// ── Window controls ───────────────────────────────────────────────────────────
.win-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.win-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.35);
  transition: background 80ms ease, color 80ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.88);
  }

  &.win-close:hover {
    background: #c0392b;
    color: #fff;
  }
}
</style>
