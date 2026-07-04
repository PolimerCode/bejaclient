<template>
  <!-- Toasts are always mounted regardless of route — Teleport to body -->
  <FriendRequestToast />
  <PartyInviteToast />

  <RouterView v-if="isConsole || isLobby" />
  <div v-else class="app-shell">
    <div class="bg-layer" :style="{ backgroundImage: `url(${mazeBg})` }" />

    <!-- Splash screen -->
    <Transition name="splash">
      <div v-if="splashVisible" class="splash-screen" :style="{ backgroundImage: `url(${mazeBg})` }">
        <div class="splash-overlay" />
        <div class="splash-center">
          <div class="splash-brand">
            <img class="splash-icon" :src="logoUrl" alt="BC" />
            <span class="splash-name"><span class="s-beja">Beja</span><span class="s-client">Client</span></span>
          </div>
          <div class="splash-bar-track">
            <div class="splash-bar-fill" :style="{ width: loadProgress + '%' }" />
          </div>
        </div>
      </div>
    </Transition>

    <NavBar v-if="!isConsole && !isLobby" />
    <div v-if="!isConsole && !isLobby" class="main-col">
      <AppTopBar />
      <main class="main-content" ref="mainRef" @scroll="onScroll">
        <RouterView v-slot="{ Component }">
          <KeepAlive :max="8">
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
    <NotificationsDrawer />
    <CrashAnalyzerModal />
    <ConflictWarningModal />
    <InstanceWizard />
    <UpdateNotification />
    <WhatsNewModal />
    <LoginOverlay :show="!splashVisible && !accountStore.hasAccounts" />
    <BetaWarningToast />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import NavBar    from './components/layout/NavBar.vue'
import AppTopBar from './components/layout/AppTopBar.vue'
import mazeBg   from './assets/maze-bg.jpg'
import logoUrl  from './assets/bc-logo-new.png'

import NotificationsDrawer from './components/layout/NotificationsDrawer.vue'
import UpdateNotification from './components/common/UpdateNotification.vue'
import WhatsNewModal from './components/common/WhatsNewModal.vue'
import CrashAnalyzerModal from './components/common/CrashAnalyzerModal.vue'
import ConflictWarningModal from './components/common/ConflictWarningModal.vue'
import InstanceWizard from './components/common/InstanceWizard.vue'
import FriendRequestToast from './components/common/FriendRequestToast.vue'
import PartyInviteToast from './components/common/PartyInviteToast.vue'
import LoginOverlay from './components/common/LoginOverlay.vue'
import BetaWarningToast from './components/common/BetaWarningToast.vue'
import { useScrollState } from './composables/useScrollState'
import { useAccountStore } from './store/accountStore'
import { useLauncherStore } from './store/launcherStore'
import { useSettingsStore } from './store/settingsStore'
import { useFriendsStore } from './store/friendsStore'
import { useLobbyStore } from './store/lobbyStore'
import { useNotificationsStore } from './store/notificationsStore'
import { useLockerStore } from './store/lockerStore'
import { useQuestsStore } from './store/questsStore'
import { playLaunch, playMouseClick, warmAudio } from './composables/useSounds'

const route     = useRoute()
const isConsole = computed(() => route.path === '/console')
const isLobby   = computed(() => route.path === '/lobby')

const { locale } = useI18n()

const splashVisible = ref(true)
const loadProgress  = ref(0)

const { updateScroll } = useScrollState()
const mainRef = ref<HTMLElement | null>(null)

function onScroll() {
  if (mainRef.value) updateScroll(mainRef.value)
}

const accountStore  = useAccountStore()
const launcherStore = useLauncherStore()
const settingsStore = useSettingsStore()
const friendsStore  = useFriendsStore()
const lobbyStore    = useLobbyStore()
const notifStore    = useNotificationsStore()
const lockerStore   = useLockerStore()

function applyAccent(color: string) {
  document.documentElement.style.setProperty('--accent', color)
}

onMounted(async () => {
  if (isConsole.value) return  // console window handles its own setup

  await settingsStore.load()
  loadProgress.value = 25

  await accountStore.loadAccounts()
  loadProgress.value = 50

  // Seed locker store from BejaClient cosmetics + account data (non-blocking)
  const acct = accountStore.selectedAccount
  if (acct) {
    const skinUrl = acct.skinUrl
    const model   = acct.skinModel ?? 'default'
    let capeUrl   = localStorage.getItem('beja_local_cape_url') ?? acct.capeUrl ?? null
    window.api.cosmetics.get(acct.uuid)
      .then((cosmetics: { cape_url?: string | null } | null) => {
        if (cosmetics?.cape_url) capeUrl = cosmetics.cape_url
        if (skinUrl) lockerStore.selectSkin({ skinUrl, capeUrl, model })
      })
      .catch(() => {
        if (skinUrl) lockerStore.selectSkin({ skinUrl, capeUrl, model })
      })
  }

  await launcherStore.loadProfiles()
  loadProgress.value = 75

  loadProgress.value = 100
  await nextTick()

  // Wait until the route component is actually painted in the DOM before closing splash
  await new Promise<void>(resolve => {
    let ticks = 0
    function check() {
      ticks++
      if (document.querySelector('.home-page') || ticks > 120) resolve()
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })

  setTimeout(() => { splashVisible.value = false }, 150)

  // fetchNews is slow (external network) — fire after splash, don't block it
  launcherStore.fetchNews()

  for (const req of friendsStore.incomingRequests) {
    notifStore.addFriendRequest(req.uuid, req.username)
  }
  applyAccent(settingsStore.settings.appearance.accentColor)
  locale.value = settingsStore.settings.appearance.language
  launcherStore.setupLaunchListeners()
  useQuestsStore().setupTracking()
  window.api.friends.onOnline(d  => friendsStore.handleOnline(d))
  window.api.friends.onOffline(d => friendsStore.handleOffline(d))
  window.api.friends.onRequest(d => {
    friendsStore.handleRequest(d)
    notifStore.addFriendRequest(d.uuid, d.username)
  })
  window.api.friends.onAccepted(() => friendsStore.handleAccepted())
  window.api.friends.onRemoved(()  => friendsStore.handleRemoved())

  // Lobby / party socket events
  window.api.lobby.onPartyState(d   => lobbyStore.handlePartyState(d as any))
  window.api.lobby.onMemberJoined(d => lobbyStore.handleMemberJoined(d as any))
  window.api.lobby.onMemberLeft(d   => lobbyStore.handleMemberLeft(d as any))
  window.api.lobby.onReadyUpdate(d  => lobbyStore.handleReadyUpdate(d as any))
  window.api.lobby.onSkinUpdate(d   => lobbyStore.handleSkinUpdate(d as any))
  window.api.lobby.onSpeaking(d     => lobbyStore.handleSpeaking(d as any))
  window.api.lobby.onDisbanded(()   => lobbyStore.handleDisbanded())
  window.api.lobby.onError(d        => lobbyStore.handlePartyError(d as any))
  window.api.lobby.onInviteReceived(d => lobbyStore.handleInviteReceived(d))
  window.api.lobby.onLaunched(async d => {
    const data = d as { server: string; port: number; profileId: string }
    try {
      await window.api.lobby.startWithServer(data.profileId, data.server, data.port)
    } catch { /* non-fatal */ }
  })

  warmAudio()
  document.addEventListener('mousedown', (e) => { if (e.button === 0) playMouseClick() })
})

watch(() => settingsStore.settings.appearance.accentColor, applyAccent)
watch(() => settingsStore.settings.appearance.language, (lang) => { locale.value = lang })

watch(() => launcherStore.status, (val, prev) => {
  if (val === 'running' && prev !== 'running') playLaunch()
})
</script>

<style lang="scss">
*, *::before, *::after { box-sizing: border-box; }

body { margin: 0; background: $bg; }

// ── Splash screen ─────────────────────────────────────────────────────────────
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.splash-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
}

.splash-center {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.splash-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.splash-icon {
  width: 36px;
  height: 36px;
  filter: brightness(0) invert(1);
}

.splash-name {
  font-size: 28px;
  line-height: 1;
}

.s-beja {
  font-weight: 800;
  color: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.s-client {
  font-weight: 300;
  color: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.splash-bar-track {
  width: 360px;
  height: 3px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
}

.splash-bar-fill {
  height: 100%;
  background: #27ADE0;
  border-radius: 2px;
  transition: width 300ms ease;
}

// Transition — clean fade only
.splash-enter-active { transition: opacity 0.5s ease; }
.splash-leave-active { transition: opacity 0.6s ease; }
.splash-enter-from, .splash-leave-to { opacity: 0; }

.bg-layer {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: -1;
  pointer-events: none;
}

.app-shell {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: $text-primary;
  background-color: $bg;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.62);
    z-index: 0;
    pointer-events: none;
  }
}

.main-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  min-height: 0;
  overflow: hidden;
  background: transparent;
  isolation: isolate;
}


.main-content {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  background: transparent;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}
</style>
