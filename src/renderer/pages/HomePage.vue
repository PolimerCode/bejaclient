<template>
  <div class="home-page">

    <!-- Main scrollable column -->
    <div class="main-col">

      <div class="hero-wrap">
        <div class="video-card">
          <video v-if="sceneVideo" ref="videoRef" class="scene-video" :src="sceneVideo" autoplay loop muted playsinline @error="onVideoError" />
          <div v-else class="download-overlay">
            <div class="download-spinner" />
            <span class="download-label">Downloading assets…</span>
          </div>

          <!-- Left flanking member -->
          <div class="flank-slot flank-slot--left">
            <LobbySkinSlot :member="lobbySlots[0]" size="2xl" :initial-rotation-y="0.524" @invite="openInvite" />
          </div>

          <!-- Center: local player — preserves original HeroSkinViewer positioning/animation -->
          <div class="skin-wrap">
            <div v-if="lobbyStore.isLeader" class="slot-crown">
              <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
                <path d="M1 15L4.5 5.5L11 10L17.5 2L21 9.5V15H1Z" fill="#FFD700" stroke="#E8A800" stroke-width="1"/>
              </svg>
            </div>
            <HeroSkinViewer
              :skin-url="activeSkinUrl"
              :cape-url="activeCapeUrl"
              :model="activeSkinModel"
              animation="custom-idle"
              :zoom="0.75"
              :initial-rotation-y="0.524"
              :auto-rotate-speed="0"
            />
            <div v-if="account" class="skin-namebar">
              <span class="skin-you-tag">You</span>
              <span class="skin-username">{{ account.username }}</span>
            </div>
          </div>

          <!-- Right flanking member -->
          <div class="flank-slot flank-slot--right">
            <LobbySkinSlot :member="lobbySlots[1]" size="2xl" :initial-rotation-y="-0.524" @invite="openInvite" />
          </div>

          <!-- Voice controls (shown when party has ≥2 members or voice is active) -->
          <div class="voice-controls">
            <button
              class="voice-btn"
              :class="{ active: !voice.isMuted.value, muted: voice.isMuted.value }"
              :title="voice.isMuted.value ? 'Unmute' : 'Mute'"
              @click="voice.toggleMic()"
            >
              <svg v-if="!voice.isMuted.value" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button
              class="voice-btn"
              :class="{ active: !voice.isDeafened.value, muted: voice.isDeafened.value }"
              :title="voice.isDeafened.value ? 'Undeafen' : 'Deafen'"
              @click="voice.toggleDeafen()"
            >
              <svg v-if="!voice.isDeafened.value" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
              </svg>
            </button>
            <div v-if="lobbyStore.party" class="party-id">
              {{ lobbyStore.party.id }}
              <button
                class="party-id-refresh"
                title="Generate a new code"
                :disabled="lobbyStore.isCreating"
                @click="lobbyStore.regenerateParty()"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            </div>
            <button
              v-else
              class="voice-btn create-lobby-btn"
              title="Create a lobby and get a code"
              :disabled="lobbyStore.isCreating"
              @click="lobbyStore.createParty()"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Lobby
            </button>
            <button class="voice-btn join-party-btn" title="Join a party by code" @click="openJoin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Launch / Ready row -->
        <div class="hero-launch">
          <LaunchButton v-if="lobbyStore.isLeader || !lobbyStore.party" />
          <button v-else class="ready-btn" :class="{ 'ready-btn--ready': lobbyStore.isReady }" @click="lobbyStore.toggleReady()">
            <svg v-if="lobbyStore.isReady" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5 6.5-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ lobbyStore.isReady ? 'Ready' : 'Not Ready' }}
          </button>
        </div>
      </div>

      <div class="news-section">
        <h2 class="news-heading">{{ $t('home.news') }}</h2>
        <div class="news-grid">
          <div v-for="n in 6" :key="n" class="news-card" />
        </div>
      </div>

    </div>

    <!-- Friends panel -->
    <div class="friends-panel">
      <h2 class="friends-heading">{{ $t('home.friends') }}</h2>
      <div class="friends-card">
        <template v-if="friends.length">
          <div v-for="friend in friends" :key="friend.uuid" class="friend-row">
            <span class="friend-dot" :class="{ online: friend.online }" />
            <span class="friend-name">{{ friend.username }}</span>
          </div>
        </template>
        <p v-else class="friends-empty">{{ $t('home.noFriends') }}</p>
      </div>
    </div>

    <!-- Invite overlay -->
    <InviteOverlay :visible="inviteOpen" :initial-tab="inviteInitTab" @close="inviteOpen = false" />

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onActivated, onMounted, watch } from 'vue'
import { useFriendsStore }  from '../store/friendsStore'
import { useAccountStore }  from '../store/accountStore'
import { useLockerStore }   from '../store/lockerStore'
import { useLobbyStore }    from '../store/lobbyStore'
import { useLobbyVoice }    from '../composables/useLobbyVoice'
import LobbySkinSlot  from '../components/lobby/LobbySkinSlot.vue'
import InviteOverlay  from '../components/lobby/InviteOverlay.vue'
import HeroSkinViewer from '../components/skin/HeroSkinViewer.vue'
import LaunchButton   from '../components/home/LaunchButton.vue'

// ── Video ─────────────────────────────────────────────────────────────────────

const sceneVideo = ref('')
const videoRef   = ref<HTMLVideoElement | null>(null)

// ── Stores / composables ──────────────────────────────────────────────────────

const friendsStore = useFriendsStore()
const accountStore = useAccountStore()
const lobbyStore   = useLobbyStore()
const voice        = useLobbyVoice()

const lockerStore = useLockerStore()
const account     = computed(() => accountStore.selectedAccount)

const activeSkinUrl   = computed(() => lockerStore.skinUrl  ?? account.value?.skinUrl  ?? null)
const activeCapeUrl   = computed(() => lockerStore.capeUrl  ?? account.value?.capeUrl  ?? null)
const activeSkinModel = computed(() => lockerStore.model    ?? account.value?.skinModel ?? 'default')

const friends    = computed(() => friendsStore.friends)
const lobbySlots = computed(() => lobbyStore.slots)

// ── Invite overlay ────────────────────────────────────────────────────────────

const inviteOpen    = ref(false)
const inviteInitTab = ref<'invite' | 'join'>('invite')

async function openInvite() {
  // Clicking an empty slot to invite someone creates the lobby on demand,
  // rather than one existing silently for every user from page load.
  if (!lobbyStore.party) await lobbyStore.createParty()
  inviteInitTab.value = 'invite'
  inviteOpen.value = true
}
function openJoin() { inviteInitTab.value = 'join'; inviteOpen.value = true }

// ── Voice: wire IPC events → composable ──────────────────────────────────────

function initVoiceIpc(): void {
  window.api.lobby.onVoiceOffer(d  => voice.handleOffer(d  as any))
  window.api.lobby.onVoiceAnswer(d => voice.handleAnswer(d as any))
  window.api.lobby.onVoiceIce(d   => voice.handleIce(d    as any))
}

// When a new member joins, initiate a call to them (leader side)
watch(() => lobbyStore.party?.members.length, (next, prev) => {
  if (!next || !prev || next <= prev) return
  const newMember = lobbyStore.party?.members[next - 1]
  if (newMember && newMember.uuid !== accountStore.selectedAccount?.uuid) {
    voice.initiateCall(newMember.uuid)
  }
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  // Load background video
  try {
    sceneVideo.value = await (window as any).api.video.getScene()
  } catch {}

  // Init voice capture
  await voice.init()
  initVoiceIpc()
})

onActivated(() => { videoRef.value?.play() })

function onVideoError(e: Event) {
  const v = e.target as HTMLVideoElement
  console.error('[video] error code:', v.error?.code, 'src:', v.currentSrc)
}
</script>

<style lang="scss" scoped>
.home-page {
  height: 100%;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

// ── Main column ───────────────────────────────────────────────────────────────
.main-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 14px;
  gap: 14px;
}

// ── Hero section ──────────────────────────────────────────────────────────────
.hero-wrap {
  position: relative;
  flex-shrink: 0;
}

.hero-launch {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
}

// ── Video card ────────────────────────────────────────────────────────────────
@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.video-card {
  width: 100%;
  height: 56vh;
  border-radius: 10px;
  overflow: hidden;
  clip-path: inset(0 round 10px);
  flex-shrink: 0;
  position: relative;
  border: 2px solid transparent;
  background-image:
    linear-gradient(#111, #111),
    conic-gradient(
      from var(--border-angle),
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.55) 18%,
      rgba(255, 255, 255, 0.04) 36%,
      rgba(255, 255, 255, 0.04) 100%
    );
  background-origin: border-box;
  background-clip: padding-box, border-box;
  transition: --border-angle 2000ms cubic-bezier(0.2, 0, 0, 1);

  &:hover {
    --border-angle: 135deg;
  }
}

.scene-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: blur(5px);
  transform: scale(1.15);
}

// ── Center player (HeroSkinViewer, original positioning) ─────────────────────
.skin-wrap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  // width scales with vh (like height below) so the aspect ratio stays constant
  // across window sizes — a fixed px width against a vh-based height stretched
  // the viewer taller/narrower on bigger screens, clipping arms/shoulders.
  width: 36.8vh;
  height: calc(100% + 14vh);
  pointer-events: none;
  animation: skinFloat 3s ease-in-out infinite alternate;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.slot-crown {
  margin-top: 10px;
  margin-bottom: -4px;
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.65));
  animation: crown-float 3s ease-in-out infinite;
  z-index: 2;
}

@keyframes crown-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-3px); }
}

@keyframes skinFloat {
  from { transform: translateX(-50%) translateY(0px); }
  to   { transform: translateX(-50%) translateY(-14px); }
}

.skin-namebar {
  position: absolute;
  bottom: calc(14vh + 10px);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  pointer-events: none;
}

.skin-username {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.skin-you-tag {
  font-size: 10px;
  color: $accent;
  font-weight: 700;
  background: rgba(85, 178, 255, 0.18);
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.5px;
}

// ── Flanking lobby slots ──────────────────────────────────────────────────────
.flank-slot {
  position: absolute;
  top: 33%;
  animation: skinFloat 3s ease-in-out infinite alternate;

  &--left  { left: 20%; transform: translateX(-50%); animation-delay: -1.1s; }
  &--right { left: 80%; transform: translateX(-50%); animation-delay: -2.2s; }
}

// ── Voice controls ────────────────────────────────────────────────────────────
.voice-controls {
  position: absolute;
  bottom: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.voice-btn {
  width: 34px;
  height: 34px;
  border-radius: 0;
  border: 1px solid rgba(137, 137, 137, 0.5);
  background: #0d0d0d;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 80ms, color 80ms, border-color 80ms;

  &.active { color: rgba(255, 255, 255, 0.9); }
  &.muted  { color: #ff453a; border-color: rgba(255, 69, 58, 0.6); background: rgba(255, 69, 58, 0.12); }
  &:hover  { background: #1a1a1a; border-color: rgba(255, 255, 255, 0.61); }
}

.party-id {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.5);
  background: #0d0d0d;
  padding: 4px 6px 4px 8px;
  border-radius: 0;
  border: 1px solid rgba(137, 137, 137, 0.5);
  user-select: all;
}

.create-lobby-btn {
  width: auto;
  height: 34px;
  border-radius: 0;
  padding: 0 14px;
  gap: 6px;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.02em;
  white-space: nowrap;

  &:disabled { opacity: 0.5; cursor: default; }
}

.party-id-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  border-radius: 0;
  user-select: none;
  transition: color 150ms, background 150ms;

  &:hover:not(:disabled) { color: rgba(255, 255, 255, 0.9); background: rgba(255, 255, 255, 0.08); }
  &:disabled { opacity: 0.4; cursor: default; }
}

// ── Ready button (non-leader) ─────────────────────────────────────────────────
.ready-btn {
  height: 46px;
  padding: 0 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-family: $font-family;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 150ms, border-color 150ms, color 150ms;
  backdrop-filter: blur(8px);

  &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

  &--ready {
    background: rgba(52, 199, 89, 0.18);
    border-color: rgba(52, 199, 89, 0.5);
    color: #34c759;

    &:hover { background: rgba(52, 199, 89, 0.26); }
  }
}

// ── News ──────────────────────────────────────────────────────────────────────
.news-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.news-heading {
  font-size: 20px;
  font-weight: 800;
  color: $text-primary;
  margin: 0 0 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

@property --news-angle {
  syntax: '<angle>';
  initial-value: 45deg;
  inherits: false;
}

.news-card {
  height: 180px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: --news-angle 400ms cubic-bezier(0.2, 0, 0, 1);

  &:hover {
    --news-angle: 135deg;
  }
  background-image:
    linear-gradient($surface, $surface),
    conic-gradient(
      from var(--news-angle),
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.45) 8%,
      rgba(255, 255, 255, 0.04) 16%,
      rgba(255, 255, 255, 0.04) 46%,
      rgba(255, 255, 255, 0.45) 54%,
      rgba(255, 255, 255, 0.04) 62%,
      rgba(255, 255, 255, 0.04) 100%
    );
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

// ── Friends panel ─────────────────────────────────────────────────────────────
.friends-panel {
  width: 264px;
  flex-shrink: 0;
  padding: 14px 14px 14px 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.friends-heading {
  font-size: 20px;
  font-weight: 800;
  color: $text-primary;
  margin: 0 0 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

@property --friends-angle {
  syntax: '<angle>';
  initial-value: 45deg;
  inherits: false;
}

.friends-card {
  flex: 1;
  border-radius: 8px;
  padding: 14px;
  overflow-y: auto;
  scrollbar-width: none;
  border: 1px solid transparent;
  background-image:
    linear-gradient($surface, $surface),
    conic-gradient(
      from var(--friends-angle),
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.45) 8%,
      rgba(255, 255, 255, 0.04) 16%,
      rgba(255, 255, 255, 0.04) 46%,
      rgba(255, 255, 255, 0.45) 54%,
      rgba(255, 255, 255, 0.04) 62%,
      rgba(255, 255, 255, 0.04) 100%
    );
  background-origin: border-box;
  background-clip: padding-box, border-box;
  transition: --friends-angle 400ms cubic-bezier(0.2, 0, 0, 1);
  &::-webkit-scrollbar { display: none; }

  &:hover { --friends-angle: 135deg; }
}

.friends-empty {
  font-size: 12px;
  color: $text-muted;
  font-style: italic;
  margin: 0;
}

.friend-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  &:last-child { border-bottom: none; }
}

.friend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: $text-muted;
  flex-shrink: 0;
  &.online { background: #30d158; }
}

.friend-name {
  font-size: 13px;
  color: $text-secondary;
}

// ── Download overlay ──────────────────────────────────────────────────────────
.download-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.download-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.download-label {
  font-size: 12px;
  color: $text-muted;
  letter-spacing: 0.04em;
}
</style>
