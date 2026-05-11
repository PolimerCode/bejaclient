<template>
  <RouterView v-if="isConsole" />
  <div v-else class="app-shell">
    <NavBar />
    <main class="main-content" ref="mainRef" @scroll="onScroll">
      <RouterView v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
    </main>
    <RightPanel />
    <UpdateNotification />
    <WhatsNewModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/layout/NavBar.vue'
import RightPanel from './components/layout/RightPanel.vue'
import UpdateNotification from './components/common/UpdateNotification.vue'
import WhatsNewModal from './components/common/WhatsNewModal.vue'
import { useScrollState } from './composables/useScrollState'
import { useAccountStore } from './store/accountStore'
import { useLauncherStore } from './store/launcherStore'
import { useSettingsStore } from './store/settingsStore'
import { playLaunch, playMouseClick, warmAudio } from './composables/useSounds'

const route = useRoute()
const isConsole = computed(() => route.path === '/console')

const { updateScroll } = useScrollState()
const mainRef = ref<HTMLElement | null>(null)

function onScroll() {
  if (mainRef.value) updateScroll(mainRef.value)
}

const accountStore  = useAccountStore()
const launcherStore = useLauncherStore()
const settingsStore = useSettingsStore()

function applyAccent(color: string) {
  document.documentElement.style.setProperty('--accent', color)
}

onMounted(async () => {
  if (isConsole.value) return  // console window handles its own setup
  await Promise.all([
    settingsStore.load(),
    accountStore.loadAccounts(),
    launcherStore.loadProfiles(),
    launcherStore.fetchNews(),
  ])
  applyAccent(settingsStore.settings.appearance.accentColor)
  launcherStore.setupLaunchListeners()
  warmAudio()
  document.addEventListener('mousedown', (e) => { if (e.button === 0) playMouseClick() })
})

watch(() => settingsStore.settings.appearance.accentColor, applyAccent)

watch(() => launcherStore.status, (val, prev) => {
  if (val === 'running' && prev !== 'running') playLaunch()
})
</script>

<style lang="scss">
*, *::before, *::after { box-sizing: border-box; }

body { margin: 0; background: #000; }

.app-shell {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
  color: $text-primary;
}

.main-content {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  background: #000;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}
</style>
