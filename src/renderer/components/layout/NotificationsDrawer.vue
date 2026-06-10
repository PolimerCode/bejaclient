<template>
  <Teleport to="body">

    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="store.drawerOpen" class="drawer-backdrop" @click="store.closeDrawer()" />
    </Transition>

    <!-- Drawer -->
    <Transition name="drawer-slide">
      <div v-if="store.drawerOpen" class="notifications-drawer">

        <div class="drawer-header">
          <span class="drawer-title">Notifications</span>
          <div class="drawer-header-actions">
            <button v-if="store.notifications.length" class="clear-btn" @click="store.notifications = []">
              Clear all
            </button>
            <button class="close-btn" @click="store.closeDrawer()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="drawer-body">
          <div v-if="store.notifications.length === 0" class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span>No notifications</span>
          </div>

          <div v-for="notif in store.notifications" :key="notif.id" class="notif-card">

            <!-- Friend request -->
            <template v-if="notif.type === 'friend_request'">
              <div class="notif-avatar">{{ notif.data?.username?.[0]?.toUpperCase() }}</div>
              <div class="notif-content">
                <p class="notif-title">{{ notif.title }}</p>
                <p class="notif-body">{{ notif.body }}</p>
                <div class="notif-actions">
                  <button class="btn-accept" @click="acceptRequest(notif)">Accept</button>
                  <button class="btn-decline" @click="declineRequest(notif)">Decline</button>
                </div>
              </div>
              <span class="notif-time">{{ timeAgo(notif.timestamp) }}</span>
            </template>

            <!-- System -->
            <template v-else-if="notif.type === 'system'">
              <div class="notif-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div class="notif-content">
                <p class="notif-title">{{ notif.title }}</p>
                <p class="notif-body">{{ notif.body }}</p>
              </div>
              <div class="notif-right">
                <span class="notif-time">{{ timeAgo(notif.timestamp) }}</span>
                <button class="notif-dismiss" @click="store.remove(notif.id)">×</button>
              </div>
            </template>

          </div>
        </div>

      </div>
    </Transition>

  </Teleport>
</template>

<script setup lang="ts">
import { useNotificationsStore } from '../../store/notificationsStore'
import { useFriendsStore } from '../../store/friendsStore'
import type { BejaNotification } from '../../store/notificationsStore'

const store        = useNotificationsStore()
const friendsStore = useFriendsStore()

async function acceptRequest(notif: BejaNotification) {
  if (!notif.data?.uuid) return
  await friendsStore.acceptRequest(notif.data.uuid)
  store.remove(notif.id)
}

async function declineRequest(notif: BejaNotification) {
  if (!notif.data?.uuid) return
  await friendsStore.declineRequest(notif.data.uuid)
  store.remove(notif.id)
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
</script>

<style lang="scss" scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: transparent;
}

.notifications-drawer {
  position: fixed;
  top: 0;
  right: $right-panel-width;
  width: 320px;
  height: 100vh;
  background: $surface;
  border-left: 1px solid $border;
  z-index: 201;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.4);
}

// ── Header ────────────────────────────────────────────────────────────────────
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 14px;
  border-bottom: 1px solid $border;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 14px;
  font-weight: 700;
  color: $text-primary;
}

.drawer-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-btn {
  background: none;
  border: none;
  font-size: 11px;
  color: $muted;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: $radius;
  transition: color $transition, background $transition;
  &:hover { color: $text-secondary; background: $surface-elevated; }
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  color: $text-secondary;
  cursor: pointer;
  transition: color $transition, background $transition;
  &:hover { color: $text-primary; background: $border; }
}

// ── Body ──────────────────────────────────────────────────────────────────────
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: $border; border-radius: 4px; }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: $muted;
  font-size: 13px;
  padding: 40px 0;
}

// ── Notification card ─────────────────────────────────────────────────────────
.notif-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
}

.notif-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: $surface-elevated;
  border: 1px solid $border-strong;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: $text-primary;
  flex-shrink: 0;
}

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: $surface-elevated;
  border: 1px solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $muted;
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-title {
  font-size: 12px;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}

.notif-body {
  font-size: 11px;
  color: $text-secondary;
  margin: 0 0 8px;
  line-height: 1.4;
}

.notif-actions {
  display: flex;
  gap: 6px;
}

.btn-accept {
  padding: 4px 12px;
  background: $text-primary;
  color: $bg;
  border: none;
  border-radius: $radius;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background $transition;
  &:hover { background: $text-secondary; }
}

.btn-decline {
  padding: 4px 12px;
  background: $surface-elevated;
  color: $text-secondary;
  border: 1px solid $border;
  border-radius: $radius;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background $transition;
  &:hover { background: $border; }
}

.notif-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.notif-time {
  font-size: 10px;
  color: $muted;
  white-space: nowrap;
  flex-shrink: 0;
}

.notif-dismiss {
  background: none;
  border: none;
  color: $muted;
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  transition: color $transition;
  &:hover { color: $text-secondary; }
}

// ── Transitions ───────────────────────────────────────────────────────────────
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 220ms ease; }
.drawer-slide-enter-from,  .drawer-slide-leave-to      { transform: translateX(100%); }
</style>
