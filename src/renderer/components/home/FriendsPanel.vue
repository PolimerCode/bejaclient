<template>
  <!-- Outer wrapper handles slide animation -->
  <div class="friends-wrapper" :class="{ collapsed: panelHidden }">

    <!-- Toggle tab — always visible, sits on the left edge of the wrapper -->
    <button class="toggle-tab" @click="store.togglePanel()" :title="panelHidden ? 'Show friends' : 'Hide friends'">
      <svg
        class="tab-chevron"
        :class="{ flipped: panelHidden }"
        xmlns="http://www.w3.org/2000/svg"
        width="12" height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      <span v-if="pendingCount > 0 && panelHidden" class="tab-badge">{{ pendingCount }}</span>
    </button>

    <!-- Panel -->
    <div class="friends-panel">

      <!-- Header -->
      <div class="panel-header">
        <span class="panel-title">Friends</span>
        <span
          v-if="store.socketStatus !== 'connected'"
          class="socket-status-dot"
          :class="store.socketStatus"
          :title="store.socketStatus === 'error' ? 'Real-time connection failed' : store.socketStatus === 'connecting' ? 'Connecting…' : 'Disconnected'"
        />
        <button class="add-btn" :class="{ open: showAdd }" @click="toggleAdd()" title="Add friend">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Friend
        </button>
      </div>

      <!-- Add-friend form -->
      <Transition name="slide-down">
        <div v-if="showAdd" class="add-form">
          <input
            ref="inputEl"
            v-model="gamertag"
            class="add-input"
            placeholder="Minecraft gamertag…"
            maxlength="32"
            @keydown.enter="send"
            @keydown.escape="close"
          />
          <button class="send-btn" :disabled="!gamertag.trim()" @click="send()">Send</button>
          <Transition name="fade">
            <p v-if="feedback" class="feedback" :class="feedbackType">{{ feedback }}</p>
          </Transition>
        </div>
      </Transition>

      <!-- Pending outgoing count -->
      <p v-if="outgoingRequests.length" class="pending-label">
        {{ outgoingRequests.length }} pending request{{ outgoingRequests.length > 1 ? 's' : '' }}
      </p>

      <!-- Friends list -->
      <div class="list">
        <template v-if="friends.length === 0">
          <div class="empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>No friends found</span>
          </div>
        </template>

        <div v-for="friend in friends" :key="friend.uuid" class="friend-row">
          <div class="avatar">{{ friend.username[0].toUpperCase() }}</div>
          <span class="friend-name">{{ friend.username }}</span>
          <span class="status" :class="friend.online ? 'online' : 'offline'" :title="friend.online ? 'Online' : 'Offline'" />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useFriendsStore } from '../../store/friendsStore'

const store = useFriendsStore()
const { panelHidden, pendingCount, friends, outgoingRequests } = storeToRefs(store)

const showAdd = ref(false)
const gamertag = ref('')
const feedback = ref('')
const feedbackType = ref<'ok' | 'err'>('ok')
const inputEl  = ref<HTMLInputElement | null>(null)

let feedbackTimer: ReturnType<typeof setTimeout>

function toggleAdd() {
  showAdd.value = !showAdd.value
  if (showAdd.value) nextTick(() => inputEl.value?.focus())
  else close()
}

function close() {
  showAdd.value = false
  gamertag.value = ''
  feedback.value = ''
}

async function send() {
  const tag = gamertag.value.trim()
  if (!tag) return
  const result = await store.sendRequest(tag)
  clearTimeout(feedbackTimer)
  if (result === 'sent') {
    feedbackType.value = 'ok'
    feedback.value = `Request sent to ${tag}!`
    gamertag.value = ''
  } else if (result === 'already_friends') {
    feedbackType.value = 'err'
    feedback.value = 'Already friends.'
  } else if (result === 'not_found') {
    feedbackType.value = 'err'
    feedback.value = `Player "${tag}" not found.`
  } else {
    feedbackType.value = 'err'
    feedback.value = 'Request already pending.'
  }
  feedbackTimer = setTimeout(() => { feedback.value = '' }, 3000)
}
</script>

<style lang="scss" scoped>
.friends-wrapper {
  position: absolute;
  right: 16px;
  top: 16px;
  bottom: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  transform: translateX(0);
  transition: transform 420ms cubic-bezier(0.34, 1.20, 0.64, 1);

  &.collapsed {
    transform: translateX(226px);
  }
}

.toggle-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 22px;
  height: 52px;
  flex-shrink: 0;
  background: $surface;
  border: 1px solid $border;
  border-right: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  color: $text-secondary;
  padding: 0;
  transition: color 200ms, background 200ms;

  &:hover {
    color: $text-primary;
    background: $surface-elevated;
  }
}

.tab-chevron {
  transition: transform 420ms cubic-bezier(0.34, 1.20, 0.64, 1);
  &.flipped { transform: rotate(180deg); }
}

.tab-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: $border-strong;
  color: $text-primary;
  font-size: 9px;
  font-weight: 700;
  border-radius: 50%;
  line-height: 1;
}

.friends-panel {
  width: 220px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $surface;
  border: 1px solid $border;
  border-radius: 0 $radius-lg $radius-lg 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid $border;
  flex-shrink: 0;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: 0.02em;
}

.socket-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 6px;
  &.connecting { background: rgba(255,255,255,0.25); animation: pulse-dot 1.2s ease-in-out infinite; }
  &.disconnected { background: #ffd60a; }
  &.error { background: #ff453a; }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 1; }
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: $radius;
  border: 1px solid $border;
  background: $surface-elevated;
  color: $text-secondary;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;

  &:hover, &.open {
    background: $border;
    border-color: $border-strong;
    color: $text-primary;
  }
}

.add-form {
  padding: 10px 12px;
  border-bottom: 1px solid $border;
  flex-shrink: 0;
}

.add-input {
  width: 100%;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  padding: 7px 10px;
  color: $text-primary;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms;

  &::placeholder { color: $muted; }
  &:focus { border-color: $border-strong; }
}

.send-btn {
  margin-top: 7px;
  width: 100%;
  padding: 6px;
  background: $text-primary;
  color: $bg;
  border: none;
  border-radius: $radius;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;

  &:hover:not(:disabled) { background: $text-secondary; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.feedback {
  margin: 6px 0 0;
  font-size: 11px;
  color: $text-secondary;
}

.pending-label {
  padding: 6px 14px;
  font-size: 11px;
  color: $muted;
  border-bottom: 1px solid $border;
  flex-shrink: 0;
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: $border; border-radius: 4px; }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 40px;
  color: $muted;
  font-size: 12px;
}

.friend-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 6px;
  border-radius: 8px;
  transition: background 120ms;
  &:hover { background: $surface-elevated; }
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: $surface-elevated;
  border: 1px solid $border;
  color: $text-primary;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.friend-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  &.offline { background: $border-strong; }
  &.online  { background: $text-secondary; }
}

.slide-down-enter-active, .slide-down-leave-active { transition: opacity 180ms, transform 180ms; }
.slide-down-enter-from, .slide-down-leave-to       { opacity: 0; transform: translateY(-6px); }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
