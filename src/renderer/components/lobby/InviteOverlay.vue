<template>
  <Transition name="invite-slide">
    <div v-if="visible" class="invite-backdrop" @click.self="$emit('close')">
      <div class="invite-panel">

        <div class="invite-header">
          <h3 class="invite-title">Invite Friends</h3>
          <button class="invite-close" @click="$emit('close')">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="14" y1="2" x2="2"  y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="invite-search-wrap">
          <svg class="invite-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            v-model="search"
            class="invite-search"
            placeholder="Search friends..."
            autofocus
          />
        </div>

        <div class="invite-section-label" v-if="onlineFriends.length > 0">Online — {{ onlineFriends.length }}</div>

        <div class="invite-list">
          <div
            v-for="friend in filteredFriends"
            :key="friend.uuid"
            class="invite-item"
            :class="{ offline: !friend.online, invited: invitedSet.has(friend.uuid) }"
          >
            <div class="invite-avatar">{{ friend.username[0].toUpperCase() }}</div>
            <div class="invite-info">
              <div class="invite-name">{{ friend.username }}</div>
              <div class="invite-status">
                <span class="invite-dot" :class="{ online: friend.online }" />
                {{ friend.online ? 'Online' : 'Offline' }}
              </div>
            </div>
            <button
              class="invite-btn"
              :disabled="!friend.online || invitedSet.has(friend.uuid)"
              @click="invite(friend)"
            >
              {{ invitedSet.has(friend.uuid) ? 'Invited ✓' : 'Invite' }}
            </button>
          </div>

          <div v-if="filteredFriends.length === 0" class="invite-empty">
            <span v-if="search">No results for "{{ search }}"</span>
            <span v-else-if="friendsStore.friends.length === 0">No friends yet</span>
            <span v-else>All friends are offline</span>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFriendsStore } from '../../store/friendsStore'
import { useLobbyStore } from '../../store/lobbyStore'

defineProps<{ visible: boolean }>()
defineEmits<{ close: [] }>()

const friendsStore = useFriendsStore()
const lobbyStore   = useLobbyStore()

const search     = ref('')
const invitedSet = ref<Set<string>>(new Set())

const onlineFriends = computed(() =>
  friendsStore.friends.filter(f => f.online),
)

const filteredFriends = computed(() => {
  const q = search.value.trim().toLowerCase()
  return friendsStore.friends
    .filter(f => !q || f.username.toLowerCase().includes(q))
    .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0))
})

function invite(friend: { uuid: string; username: string }): void {
  invitedSet.value.add(friend.uuid)
  lobbyStore.inviteFriend(friend.uuid)
}
</script>

<style lang="scss" scoped>
.invite-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 80px 24px 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
}

.invite-panel {
  width: 340px;
  background: $surface-elevated;
  border: 1px solid $border-strong;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 100px);
}

.invite-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid $border;
}

.invite-title {
  font-size: 15px;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}

.invite-close {
  background: none;
  border: none;
  cursor: pointer;
  color: $text-muted;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color $transition, background $transition;

  &:hover { color: $text-primary; background: rgba(255,255,255,0.08); }
}

.invite-search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid $border;
}

.invite-search-icon {
  color: $text-muted;
  flex-shrink: 0;
}

.invite-search {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: $text-primary;
  font-family: $font-family;

  &::placeholder { color: $text-muted; }
}

.invite-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: $text-muted;
  padding: 12px 20px 6px;
}

.invite-list {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: $border transparent;
}

.invite-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  transition: background $transition;

  &:hover:not(.offline) { background: rgba(255,255,255,0.04); }
  &.offline { opacity: 0.5; }
}

.invite-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: $surface;
  border: 1px solid $border-strong;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: $text-secondary;
  flex-shrink: 0;
}

.invite-info { flex: 1; min-width: 0; }

.invite-name {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invite-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: $text-muted;
  margin-top: 2px;
}

.invite-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $text-muted;
  flex-shrink: 0;

  &.online { background: $success; box-shadow: 0 0 5px rgba(52, 199, 89, 0.6); }
}

.invite-btn {
  padding: 6px 14px;
  border-radius: $radius-sm;
  border: 1px solid $border-strong;
  background: transparent;
  color: $text-secondary;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background $transition, color $transition, border-color $transition;
  font-family: $font-family;

  &:not(:disabled):hover {
    background: $accent;
    border-color: $accent;
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}

.invite-empty {
  padding: 32px 20px;
  text-align: center;
  font-size: 13px;
  color: $text-muted;
}

// ── Slide transition ─────────────────────────────────────────────────────────
.invite-slide-enter-active,
.invite-slide-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
  .invite-panel { transition: transform 180ms ease; }
}
.invite-slide-enter-from { opacity: 0; .invite-panel { transform: translateX(20px); } }
.invite-slide-leave-to   { opacity: 0; .invite-panel { transform: translateX(20px); } }
</style>
