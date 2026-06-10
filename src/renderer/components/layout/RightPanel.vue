<template>
  <aside class="right-panel" :class="{ maximized }">

    <!-- Window controls -->
    <div class="win-controls">
      <button class="win-btn" title="Minimize" @click="minimize">
        <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
      </button>
      <button class="win-btn" title="Maximize" @click="toggleMaximize">
        <svg width="9" height="9" viewBox="0 0 9 9"><rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/></svg>
      </button>
      <button class="win-btn close-btn" title="Close" @click="close">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.2"/>
          <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
    </div>

    <!-- Action icons -->
    <div class="panel-actions">
      <div class="panel-pill">
      <button class="panel-btn" title="Notifications" @click="notifStore.toggleDrawer()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span v-if="notifStore.unreadCount > 0" class="panel-badge">{{ notifStore.unreadCount }}</span>
      </button>
      <button class="panel-btn" title="Friends" @click="$router.push('/friends')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="16" y1="11" x2="22" y2="11"/>
        </svg>
        <span v-if="friendsStore.pendingCount > 0" class="panel-badge">{{ friendsStore.pendingCount }}</span>
      </button>
      </div>
    </div>

    <!-- Scrollbar -->
    <div class="scroll-track">
      <div
        class="scroll-thumb"
        :style="{ top: scrollPercent * 85 + '%', opacity: hasScroll ? 1 : 0 }"
      />
    </div>

    <!-- Social icons -->
    <div class="panel-social">
      <button class="panel-btn" title="Discord" @click="openExternal('https://discord.gg/bejaclient')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </button>
      <button class="panel-btn" title="YouTube" @click="openExternal('https://youtube.com/@bejaclient')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </button>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFriendsStore } from '../../store/friendsStore'
import { useNotificationsStore } from '../../store/notificationsStore'
import { useScrollState } from '../../composables/useScrollState'

const friendsStore = useFriendsStore()
const notifStore   = useNotificationsStore()
const { scrollPercent, hasScroll } = useScrollState()

const maximized = ref(false)

onMounted(async () => {
  maximized.value = await window.api.window.isMaximized()
  window.api.window.onMaximized((v: boolean) => { maximized.value = v })
})

function minimize()       { window.api.window.minimize() }
function toggleMaximize() { window.api.window.maximize() }
function close()          { window.api.window.close() }

function openExternal(url: string) {
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.right-panel {
  display: flex;
  flex-direction: column;
  width: $right-panel-width;
  height: 100vh;
  background: $surface-panel;
  flex-shrink: 0;
  z-index: 100;
  -webkit-app-region: drag;
}

// ── Window controls ───────────────────────────────────────────────────────────
.win-controls {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 32px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.win-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: $muted;
  transition: color $transition;
  border-radius: $radius-sm;

  &:hover {
    color: $text-secondary;
  }

  &.close-btn:hover {
    color: #e06060;
  }
}

// ── Action buttons ────────────────────────────────────────────────────────────
.panel-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 0 16px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.panel-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: rgba(255,255,255,0.04);
  border: 1px solid $border;
  border-radius: 20px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}

// ── Scrollbar ─────────────────────────────────────────────────────────────────
.scroll-track {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  padding: 8px 0;
  -webkit-app-region: drag;

  &::before {
    content: '';
    position: absolute;
    top: 8px;
    bottom: 8px;
    width: 3px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 30px;
  }
}

.scroll-thumb {
  position: absolute;
  width: 4px;
  height: 15%;
  background: var(--accent, #{$accent});
  border-radius: 30px;
  transition: top 0.1s ease, opacity 0.2s ease;
  left: 50%;
  transform: translateX(-50%);
}

// ── Social icons ──────────────────────────────────────────────────────────────
.panel-social {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 0 24px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

// ── Shared panel button ───────────────────────────────────────────────────────
.panel-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: $muted;
  border-radius: $radius;
  transition: color $transition, background $transition;

  &:hover {
    color: $text-primary;
    background: rgba(255, 255, 255, 0.06);
  }
}

.panel-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: var(--accent, #{$accent});
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
