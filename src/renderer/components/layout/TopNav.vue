<template>
  <header class="top-nav-bar" :class="{ maximized }">

    <!-- Brand -->
    <div class="brand" @dblclick="toggleMaximize">
      <img :src="logoUrl" class="brand-logo" alt="BC" />
      <span class="brand-text"><span class="brand-beja">beja</span><span class="brand-client">client</span></span>
    </div>

    <!-- Nav -->
    <nav class="nav-area">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-link"
        :class="{ active: isActive(item) }"
        @mouseenter="() => { playHover(); preload(item.path) }"
      >
        {{ item.label }}
        <span v-if="item.path === '/' && isGameRunning" class="nav-run-dot" />
      </RouterLink>
    </nav>

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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import logoUrl      from '../../../assets/bc-logo.png'
import iconHub      from '../../../assets/nav-hub.png'
import iconDirs     from '../../../assets/nav-directories.png'
import iconExplore  from '../../../assets/nav-explore.png'
import iconFriends  from '../../../assets/nav-friends.png'
import iconQuests   from '../../../assets/nav-quests.png'
import iconLocker   from '../../../assets/nav-locker.png'
import iconPass     from '../../../assets/nav-pass.png'
import { useAccountStore }  from '../../store/accountStore'
import { useFriendsStore }  from '../../store/friendsStore'
import { useLauncherStore } from '../../store/launcherStore'
import { playHover }        from '../../composables/useSounds'

const route         = useRoute()
const accountStore  = useAccountStore()
const friendsStore  = useFriendsStore()
const launcherStore = useLauncherStore()
const isGameRunning = computed(() => launcherStore.isRunning)
const maximized     = ref(false)

onMounted(async () => {
  maximized.value = await window.api.window.isMaximized()
  window.api.window.onMaximized((v: boolean) => { maximized.value = v })
})

function minimize()       { window.api.window.minimize() }
function toggleMaximize() { window.api.window.maximize() }
function close()          { window.api.window.close() }

const navItems = [
  { label: 'Hub',         path: '/',          exact: true,  icon: iconHub     },
  { label: 'Directories', path: '/profiles',  exact: false, icon: iconDirs    },
  { label: 'Explore',     path: '/mods',      exact: false, icon: iconExplore },
  { label: 'Friends',     path: '/friends',   exact: false, icon: iconFriends,
    badge: computed(() => friendsStore.pendingCount || null) },
  { label: 'Quests',      path: '/quests',    exact: false, icon: iconQuests  },
  { label: 'Locker',      path: '/cosmetics', exact: false, icon: iconLocker  },
  { label: 'Client Pass', path: '/pass',      exact: false, icon: iconPass    },
]

function isActive(item: { path: string; exact: boolean }) {
  return item.exact ? route.path === item.path : route.path.startsWith(item.path)
}

const preloaded = new Set<string>()
function preload(path: string) {
  if (preloaded.has(path)) return
  preloaded.add(path)
  const map: Record<string, () => Promise<unknown>> = {
    '/profiles': () => import('../../pages/settings/ProfilesSettings.vue'),
    '/settings': () => import('../../pages/SettingsPage.vue'),
    '/pass':     () => import('../../pages/PassPage.vue'),
    '/lobby':    () => import('../../pages/LobbyPage.vue'),
  }
  map[path]?.()
}
</script>

<style lang="scss" scoped>
.top-nav-bar {
  display: flex;
  align-items: center;
  height: 52px;
  background: rgba(39, 41, 46, 0.67);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  flex-shrink: 0;
  -webkit-app-region: drag;
  border-radius: 90px;
  margin: 10px 12px 0;
  border: 1px solid rgba(255, 255, 255, 0.13);
  box-shadow: 0px -4px 60px rgba(0, 0, 0, 0.33);
  position: relative;
  z-index: 10;
}

// ── Brand ─────────────────────────────────────────────────────────────────────
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 20px 0 22px;
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: no-drag;
  cursor: default;
  height: 28px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  margin-right: 4px;
}

.brand-logo   { width: 20px; height: 20px; object-fit: contain; }
.brand-text   { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; letter-spacing: 0.06em; }
.brand-beja   { font-weight: 900; color: $text-primary; }
.brand-client { font-weight: 900; color: $warning; }

// ── Nav ───────────────────────────────────────────────────────────────────────
.nav-area {
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
  flex: 1;
  padding: 0 4px;
  gap: 2px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.60);
  text-decoration: none;
  white-space: nowrap;
  transition: color 140ms ease, background 140ms ease, transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 180ms ease;
  border-radius: 20px;
  letter-spacing: 0.01em;
  transform-origin: center bottom;

  &:hover {
    color: rgba(255, 255, 255, 0.92);
    background: rgba(255, 255, 255, 0.08);
    transform: perspective(300px) scale(1.12) translateY(-2px) rotateX(-6deg);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  &.active {
    color: rgba(255, 255, 255, 0.96);
    font-weight: 600;
    background: rgba(255, 255, 255, 0.11);
  }
}

.nav-run-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: $success;
  box-shadow: 0 0 5px rgba(48, 209, 88, 0.7);
  flex-shrink: 0;
  animation: runPulse 2s ease-in-out infinite;
}

@keyframes runPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

// ── Window controls ───────────────────────────────────────────────────────────
.win-controls {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
  padding-right: 14px;
  gap: 4px;
}

.win-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.32);
  transition: background 140ms ease, color 140ms ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.88);
  }

  &.win-close:hover {
    background: #c0392b;
    color: #fff;
  }
}
</style>
