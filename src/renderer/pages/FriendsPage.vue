<template>
  <div class="friends-page" :class="{ 'has-chat': !!chatFriend }">

    <!-- Tabs -->
    <div class="tab-row">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
        <span v-if="t.key === 'requests' && friendsStore.pendingCount" class="tab-badge">
          {{ friendsStore.pendingCount }}
        </span>
      </button>
    </div>

    <!-- ── Friends tab ──────────────────────────────────────────────────────── -->
    <template v-if="activeTab === 'friends'">

      <!-- Add friend bar -->
      <div class="add-bar">
        <div class="add-input-wrap" :class="{ focused: addFocused }">
          <input
            v-model="addInput"
            class="add-input"
            placeholder="Add friend by username..."
            spellcheck="false"
            @focus="addFocused = true"
            @blur="addFocused = false"
            @keyup.enter="sendRequest"
          />
        </div>
        <button class="add-btn" :disabled="!addInput.trim() || adding" @click="sendRequest">
          <span v-if="adding" class="spinner sm" />
          <template v-else>ADD</template>
        </button>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <input v-model="search" class="search-input" placeholder="Search friends..." spellcheck="false" />
        <img :src="searchIcon" class="search-icon" alt="" />
      </div>

      <!-- Friends list -->
      <div class="list-area">

        <div v-if="loading" class="state-area">
          <span class="spinner lg" />
        </div>

        <div v-else-if="!filteredFriends.length" class="state-area">
          <span class="state-text">
            {{ search ? 'No results' : 'No friends yet' }}
          </span>
        </div>

        <template v-else>
          <!-- Online section -->
          <template v-if="onlineFriends.length">
            <div class="section-label">ONLINE — {{ onlineFriends.length }}</div>
            <div class="friends-grid">
              <div
                v-for="f in onlineFriends"
                :key="f.uuid"
                class="friend-card"
                @click="openChat(f)"
              >
                <div class="friend-head-wrap">
                  <img
                    class="friend-head"
                    :src="`https://mc-heads.net/head/${f.uuid}/128`"
                  @error="(e: Event) => ((e.target as HTMLImageElement).src = `https://mc-heads.net/head/MHF_Steve/128`)"
                    :alt="f.username"
                  />
                  <span class="friend-status-dot dot-online" />
                  <button class="card-remove-btn" @click.stop="removeFriend(f.uuid)" title="Remove friend">✕</button>
                </div>
                <div class="friend-card-label">
                  <span class="friend-card-name">{{ f.username }}</span>
                  <span class="friend-card-status online-text">online</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Offline section -->
          <template v-if="offlineFriends.length">
            <div class="section-label">OFFLINE — {{ offlineFriends.length }}</div>
            <div class="friends-grid">
              <div
                v-for="f in offlineFriends"
                :key="f.uuid"
                class="friend-card friend-card--offline"
                @click="openChat(f)"
              >
                <div class="friend-head-wrap">
                  <img
                    class="friend-head"
                    :src="`https://mc-heads.net/head/${f.uuid}/128`"
                  @error="(e: Event) => ((e.target as HTMLImageElement).src = `https://mc-heads.net/head/MHF_Steve/128`)"
                    :alt="f.username"
                  />
                  <span class="friend-status-dot dot-offline" />
                  <button class="card-remove-btn" @click.stop="removeFriend(f.uuid)" title="Remove friend">✕</button>
                </div>
                <div class="friend-card-label">
                  <span class="friend-card-name">{{ f.username }}</span>
                  <span class="friend-card-status offline-text">offline</span>
                </div>
              </div>
            </div>
          </template>
        </template>

      </div>
    </template>

    <!-- ── Requests tab ─────────────────────────────────────────────────────── -->
    <template v-else>
      <div class="list-area">

        <!-- Incoming -->
        <template v-if="friendsStore.incomingRequests.length">
          <div class="section-label">INCOMING — {{ friendsStore.incomingRequests.length }}</div>
          <div class="friends-grid">
            <div
              v-for="r in friendsStore.incomingRequests"
              :key="r.uuid"
              class="friend-card"
            >
              <div class="friend-head-wrap">
                <img
                  class="friend-head"
                  :src="`https://mc-heads.net/head/${r.uuid}/128`"
                  @error="(e: Event) => ((e.target as HTMLImageElement).src = `https://mc-heads.net/head/MHF_Steve/128`)"
                  :alt="r.username"
                />
                <span class="friend-status-dot dot-pending" />
              </div>
              <div class="friend-card-label">
                <span class="friend-card-name">{{ r.username }}</span>
                <span class="friend-card-status pending-text">incoming</span>
              </div>
              <div class="card-request-actions">
                <button class="action-btn action-btn--accept" @click="acceptRequest(r.uuid)">✓</button>
                <button class="action-btn action-btn--decline" @click="declineRequest(r.uuid)">✕</button>
              </div>
            </div>
          </div>
        </template>

        <!-- Outgoing -->
        <template v-if="friendsStore.outgoingRequests.length">
          <div class="section-label">SENT — {{ friendsStore.outgoingRequests.length }}</div>
          <div class="friends-grid">
            <div
              v-for="r in friendsStore.outgoingRequests"
              :key="r.uuid"
              class="friend-card friend-card--offline"
            >
              <div class="friend-head-wrap">
                <img
                  class="friend-head"
                  :src="`https://mc-heads.net/head/${r.uuid}/128`"
                  @error="(e: Event) => ((e.target as HTMLImageElement).src = `https://mc-heads.net/head/MHF_Steve/128`)"
                  :alt="r.username"
                />
                <span class="friend-status-dot dot-pending" />
              </div>
              <div class="friend-card-label">
                <span class="friend-card-name">{{ r.username }}</span>
                <span class="friend-card-status pending-text">pending</span>
              </div>
              <div class="card-request-actions">
                <button class="action-btn action-btn--decline" @click="cancelRequest(r.uuid)">CANCEL</button>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty -->
        <div
          v-if="!friendsStore.incomingRequests.length && !friendsStore.outgoingRequests.length"
          class="state-area"
        >
          <span class="state-text">No pending requests</span>
        </div>

      </div>
    </template>

    <!-- ── Chat panel ───────────────────────────────────────────────────────── -->
    <Transition name="chat-slide">
      <div v-if="chatFriend" class="chat-panel">

        <!-- Chat header -->
        <div class="chat-header">
          <img
            class="chat-avatar"
            :src="`https://mc-heads.net/head/${chatFriend.uuid}/64`"
            @error="(e: Event) => ((e.target as HTMLImageElement).src = `https://mc-heads.net/head/MHF_Steve/64`)"
          />
          <div class="chat-header-info">
            <span class="chat-header-name">{{ chatFriend.username }}</span>
            <span class="chat-header-status" :class="chatFriend.online ? 'online-text' : 'offline-text'">
              {{ chatFriend.online ? 'online' : 'offline' }}
            </span>
          </div>
          <button class="chat-close-btn" @click="closeChat">✕</button>
        </div>

        <!-- Messages -->
        <div class="chat-messages" ref="chatScrollEl">
          <div v-if="chatLoading" class="chat-empty">
            <span class="spinner sm" />
          </div>
          <div v-else-if="!chatMessages.length" class="chat-empty">
            <span class="chat-empty-text">No messages yet</span>
          </div>
          <template v-else>
            <div
              v-for="msg in chatMessages"
              :key="msg.id"
              class="chat-msg"
              :class="{ 'chat-msg--mine': msg.fromUuid === myUuid }"
            >
              <span class="chat-msg-bubble">{{ msg.content }}</span>
              <span class="chat-msg-time">{{ formatTime(msg.sentAt) }}</span>
            </div>
          </template>
        </div>

        <!-- Input -->
        <div class="chat-input-row">
          <input
            v-model="chatInput"
            class="chat-input"
            :placeholder="`Message ${chatFriend.username}...`"
            spellcheck="false"
            maxlength="2000"
            @keyup.enter="sendChat"
          />
          <button class="chat-send-btn" :disabled="!chatInput.trim()" @click="sendChat">▶</button>
        </div>

      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="toast" :class="`toast--${toast.type}`">{{ toast.msg }}</div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFriendsStore } from '../store/friendsStore'
import { useAccountStore } from '../store/accountStore'
import type { ChatMessage } from '../types'
import searchIcon from '../assets/icons8-search-50.png'

const friendsStore  = useFriendsStore()
const accountStore  = useAccountStore()
const myUuid        = computed(() => accountStore.selectedAccount?.uuid ?? '')

const activeTab = ref('friends')
const search    = ref('')
const addInput  = ref('')
const addFocused = ref(false)
const adding    = ref(false)
const loading   = ref(false)

const tabs = [
  { key: 'friends',  label: 'Friends'  },
  { key: 'requests', label: 'Requests' },
]

const filteredFriends = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return friendsStore.friends
  return friendsStore.friends.filter(f => f.username.toLowerCase().includes(q))
})

const onlineFriends  = computed(() => filteredFriends.value.filter(f => f.online))
const offlineFriends = computed(() => filteredFriends.value.filter(f => !f.online))

// ── Toast ──────────────────────────────────────────────────────────────────────
interface Toast { msg: string; type: 'ok' | 'err' | 'info' }
const toast = ref<Toast | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, type: Toast['type'] = 'info') {
  toast.value = { msg, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

// ── Actions ────────────────────────────────────────────────────────────────────
async function sendRequest() {
  const name = addInput.value.trim()
  if (!name || adding.value) return
  adding.value = true
  const result = await friendsStore.sendRequest(name)
  adding.value = false
  if (result === 'sent')            { showToast(`Request sent to ${name}`, 'ok');  addInput.value = '' }
  else if (result === 'not_found')    showToast(`Player "${name}" not found`, 'err')
  else if (result === 'already_friends') showToast(`Already friends with ${name}`, 'info')
  else if (result === 'already_pending') showToast('Request already pending', 'info')
  else                                showToast('Something went wrong', 'err')
}

async function acceptRequest(uuid: string) {
  await friendsStore.acceptRequest(uuid)
  showToast('Friend request accepted', 'ok')
}

async function declineRequest(uuid: string) {
  await friendsStore.declineRequest(uuid)
}

async function cancelRequest(uuid: string) {
  await friendsStore.cancelRequest(uuid)
}

async function removeFriend(uuid: string) {
  await friendsStore.removeFriend(uuid)
}

// ── Chat ───────────────────────────────────────────────────────────────────────
interface ChatFriend { uuid: string; username: string; online: boolean }

const chatFriend   = ref<ChatFriend | null>(null)
const chatMessages = ref<ChatMessage[]>([])
const chatInput    = ref('')
const chatLoading  = ref(false)
const chatScrollEl = ref<HTMLElement | null>(null)

async function openChat(friend: ChatFriend) {
  chatFriend.value   = friend
  chatMessages.value = []
  chatLoading.value  = true
  try {
    chatMessages.value = await window.api.chat.history(friend.uuid)
  } catch { /* non-fatal */ }
  chatLoading.value = false
  scrollChatBottom()
}

function closeChat() {
  chatFriend.value   = null
  chatMessages.value = []
  chatInput.value    = ''
}

async function sendChat() {
  const content = chatInput.value.trim()
  if (!content || !chatFriend.value) return
  chatInput.value = ''
  await window.api.chat.send(chatFriend.value.uuid, content)
}

function scrollChatBottom() {
  nextTick(() => {
    if (chatScrollEl.value) chatScrollEl.value.scrollTop = chatScrollEl.value.scrollHeight
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  loading.value = true
  await friendsStore.refresh()
  loading.value = false

  window.api.chat.onMessage((msg: ChatMessage) => {
    if (
      chatFriend.value &&
      (msg.fromUuid === chatFriend.value.uuid || msg.toUuid === chatFriend.value.uuid)
    ) {
      chatMessages.value.push(msg)
      scrollChatBottom()
    }
  })
})
</script>

<style lang="scss" scoped>
@font-face {
  font-family: 'Mojangles';
  src: url('../assets/fonts/mojangles.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

// ── Page shell ────────────────────────────────────────────────────────────────
.friends-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 8px;
  overflow: hidden;
  background-image: url('../assets/maze-bg.jpg');
  background-size: cover;
  background-position: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.82);
    pointer-events: none;
  }
  > * { position: relative; z-index: 1; }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
.tab-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tab-btn {
  padding: 8px 22px;
  background: #0d0d0d;
  border: 1px solid rgba(137, 137, 137, 0.61);
  color: #aaa;
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 80ms, color 80ms, border-color 80ms;
  border-radius: 0;
  display: flex;
  align-items: center;
  gap: 7px;

  &:hover { background: #1a1a1a; color: #ccc; border-color: rgba(180,180,180,0.61); }
  &.active {
    background: #111;
    color: #d9d9d9;
    border-color: rgba(255,255,255,0.61);
    box-shadow: inset 0 -2px 0 rgba(255,255,255,0.3);
  }
}

.tab-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #f97316;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Mojangles', monospace;
}

// ── Add friend bar ────────────────────────────────────────────────────────────
.add-bar {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}

.add-input-wrap {
  flex: 1;
  max-width: 400px;
  display: flex;
  align-items: center;
  height: 36px;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.61);
  padding: 0 10px;
  transition: border-color 100ms;

  &.focused { border-color: rgba(255,255,255,0.4); }
}

.add-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #cbcbcb;
  letter-spacing: 0.03em;
  &::placeholder { color: #555; }
}

.add-btn {
  height: 36px;
  padding: 0 20px;
  background: #0d0d0d;
  border: 1px solid rgba(137,137,137,0.5);
  color: #888;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  cursor: pointer;
  border-radius: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 80ms, border-color 80ms, color 80ms;

  &:hover:not(:disabled) { background: #1a1a1a; border-color: rgba(255,255,255,0.4); color: #ddd; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

// ── Search bar ────────────────────────────────────────────────────────────────
.search-bar {
  display: flex;
  align-items: center;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.61);
  height: 36px;
  padding: 0 10px;
  gap: 8px;
  flex-shrink: 0;
  max-width: 400px;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #cbcbcb;
  letter-spacing: 0.03em;
  &::placeholder { color: #555; }
}

.search-icon {
  width: 14px;
  height: 14px;
  opacity: 0.5;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

// ── List area ─────────────────────────────────────────────────────────────────
.list-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  scrollbar-width: thin;
  scrollbar-color: #282828 transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #282828; }
}

// ── Section label ─────────────────────────────────────────────────────────────
.section-label {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #333;
  letter-spacing: 0.12em;
  padding: 10px 4px 4px;
  flex-shrink: 0;
}

// ── Friends grid ──────────────────────────────────────────────────────────────
.friends-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 4px 0 10px;
}

// ── Friend card ───────────────────────────────────────────────────────────────
@property --fc-angle {
  syntax: '<angle>';
  initial-value: 45deg;
  inherits: false;
}

.friend-card {
  width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  border: 1px solid transparent;
  background-image:
    linear-gradient(#111, #111),
    conic-gradient(
      from var(--fc-angle),
      rgba(255,255,255,.04) 0%,
      rgba(255,255,255,.45) 18%,
      rgba(255,255,255,.04) 36%,
      rgba(255,255,255,.04) 100%
    );
  background-origin: border-box;
  background-clip: padding-box, border-box;
  transition: --fc-angle 500ms cubic-bezier(.2,0,0,1), transform 300ms cubic-bezier(.2,0,0,1);
  cursor: default;
  flex-shrink: 0;
  overflow: hidden;

  &:hover {
    --fc-angle: 135deg;
    transform: translateY(-3px);
    .card-remove-btn { opacity: 1; }
  }

  &--offline {
    filter: saturate(0.3);
    opacity: 0.6;
    &:hover { opacity: 0.85; filter: saturate(0.5); }
  }
}

// ── Head area ─────────────────────────────────────────────────────────────────
.friend-head-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.friend-head {
  width: 96px;
  height: 96px;
  display: block;
  image-rendering: pixelated;
}

.friend-status-dot {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid #111;

  &.dot-online  { background: #30d158; box-shadow: 0 0 6px rgba(48,209,88,0.7); }
  &.dot-offline { background: #2a2a2a; }
  &.dot-pending { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
}

.card-remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 18px;
  height: 18px;
  background: rgba(0,0,0,0.75);
  border: 1px solid #444;
  color: #666;
  font-size: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms, color 80ms;
  padding: 0;

  &:hover { color: #f87171; border-color: rgba(248,113,113,0.4); }
}

// ── Card label ────────────────────────────────────────────────────────────────
.friend-card-label {
  width: 100%;
  padding: 6px 8px 7px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: rgba(0,0,0,0.35);
  border-top: 1px solid rgba(255,255,255,0.05);
}

.friend-card-name {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #d9d9d9;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

.friend-card-status {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  letter-spacing: 0.05em;
}

.online-text  { color: #30d158; }
.offline-text { color: #333; }
.pending-text { color: #f59e0b; }

// ── Request actions inside card ───────────────────────────────────────────────
.card-request-actions {
  width: 100%;
  display: flex;
  gap: 0;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.action-btn {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  letter-spacing: 0.07em;
  border: none;
  cursor: pointer;
  border-radius: 0;
  transition: background 80ms, color 80ms;
  flex: 1;
  padding: 6px 0;
  text-align: center;

  &--accept {
    background: rgba(48,209,88,0.08);
    color: #30d158;
    border-right: 1px solid rgba(255,255,255,0.05);
    &:hover { background: rgba(48,209,88,0.18); }
  }

  &--decline {
    background: transparent;
    color: #555;
    &:hover { background: rgba(255,255,255,0.04); color: #999; }
  }
}

// ── States ────────────────────────────────────────────────────────────────────
.state-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-text {
  font-family: 'Mojangles', monospace;
  font-size: 12px;
  color: #2a2a2a;
  letter-spacing: 0.12em;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
.spinner {
  border-radius: 50%;
  border-style: solid;
  border-top-color: #ccc;
  border-color: #333;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;

  &.sm { width: 11px; height: 11px; border-width: 1.5px; }
  &.lg { width: 22px; height: 22px; border-width: 2px; }
}

@keyframes spin { to { transform: rotate(360deg); } }

// ── Toast ─────────────────────────────────────────────────────────────────────
.toast {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  border: 1px solid;
  white-space: nowrap;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0,0,0,0.7);

  &--ok   { background: rgba(8,8,10,0.95); color: #30d158; border-color: rgba(48,209,88,0.3); }
  &--err  { background: rgba(8,8,10,0.95); color: #f87171; border-color: rgba(248,113,113,0.3); }
  &--info { background: rgba(8,8,10,0.95); color: #aaa;    border-color: rgba(255,255,255,0.15); }
}

.toast-enter-active { transition: opacity 150ms, transform 150ms; }
.toast-leave-active { transition: opacity 200ms; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(8px); }
.toast-leave-to     { opacity: 0; }

// ── Chat panel ────────────────────────────────────────────────────────────────
.chat-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  background: rgba(8, 8, 10, 0.97);
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  z-index: 20;
  backdrop-filter: blur(8px);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.chat-avatar {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.chat-header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-header-name {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #d9d9d9;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-header-status {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  letter-spacing: 0.05em;
}

.chat-close-btn {
  background: transparent;
  border: none;
  color: #444;
  font-size: 10px;
  cursor: pointer;
  padding: 4px 6px;
  transition: color 80ms;
  flex-shrink: 0;
  &:hover { color: #888; }
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
  scrollbar-color: #222 transparent;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: #222; }
}

.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-empty-text {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #2a2a2a;
  letter-spacing: 0.06em;
}

.chat-msg {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  max-width: 85%;

  &--mine {
    align-self: flex-end;
    align-items: flex-end;

    .chat-msg-bubble {
      background: rgba(249,115,22,0.15);
      border-color: rgba(249,115,22,0.3);
      color: #e5e5e5;
    }
  }
}

.chat-msg-bubble {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #ccc;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 10px;
  letter-spacing: 0.02em;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.chat-msg-time {
  font-family: 'Mojangles', monospace;
  font-size: 7px;
  color: #333;
  letter-spacing: 0.04em;
  padding: 0 2px;
}

.chat-input-row {
  display: flex;
  gap: 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #ccc;
  padding: 11px 12px;
  letter-spacing: 0.02em;
  &::placeholder { color: #333; }
}

.chat-send-btn {
  width: 42px;
  background: transparent;
  border: none;
  border-left: 1px solid rgba(255,255,255,0.06);
  color: #444;
  font-size: 11px;
  cursor: pointer;
  transition: color 80ms, background 80ms;
  flex-shrink: 0;

  &:hover:not(:disabled) { color: #f97316; background: rgba(249,115,22,0.08); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

// ── Chat slide transition ─────────────────────────────────────────────────────
.chat-slide-enter-active { transition: transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms; }
.chat-slide-leave-active { transition: transform 150ms cubic-bezier(0.4, 0, 1, 1), opacity 150ms; }
.chat-slide-enter-from   { transform: translateX(100%); opacity: 0; }
.chat-slide-leave-to     { transform: translateX(100%); opacity: 0; }
</style>
