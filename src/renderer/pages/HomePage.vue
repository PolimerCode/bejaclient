<template>
  <div class="home-page">

    <!-- Main scrollable column -->
    <div class="main-col">

      <div class="hero-wrap">
        <div class="video-card">
          <video ref="videoRef" class="scene-video" :src="sceneVideo" autoplay loop muted playsinline />
          <div v-if="activeSkinUrl" class="skin-wrap">
            <HeroSkinViewer
              :skin-url="activeSkinUrl"
              :cape-url="activeCapeUrl"
              :model="activeSkinModel"
              animation="custom-idle"
              :zoom="0.75"
              :initial-rotation-y="0.524"
              :auto-rotate-speed="0"
            />
          </div>
        </div>
        <div class="hero-launch">
          <LaunchButton />
        </div>
      </div>

      <div class="news-section">
        <h2 class="news-heading">NEWS:</h2>
        <div class="news-grid">
          <div v-for="n in 6" :key="n" class="news-card" />
        </div>
      </div>

    </div>

    <!-- Friends panel -->
    <div class="friends-panel">
      <h2 class="friends-heading">FRIENDS</h2>
      <div class="friends-card">
        <template v-if="friends.length">
          <div v-for="friend in friends" :key="friend.uuid" class="friend-row">
            <span class="friend-dot" :class="{ online: friend.online }" />
            <span class="friend-name">{{ friend.username }}</span>
          </div>
        </template>
        <p v-else class="friends-empty">no friends found...</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onActivated } from 'vue'
import { useFriendsStore }  from '../store/friendsStore'
import { useAccountStore }  from '../store/accountStore'
import { useLockerStore }   from '../store/lockerStore'
import HeroSkinViewer from '../components/skin/HeroSkinViewer.vue'
import LaunchButton   from '../components/home/LaunchButton.vue'
import sceneVideo from '../assets/mc-scene.mp4'

const friendsStore = useFriendsStore()
const accountStore = useAccountStore()
const lockerStore  = useLockerStore()
const friends  = computed(() => friendsStore.friends)
const account  = computed(() => accountStore.selectedAccount)
const videoRef = ref<HTMLVideoElement | null>(null)

const activeSkinUrl  = computed(() => lockerStore.skinUrl  ?? account.value?.skinUrl  ?? null)
const activeCapeUrl  = computed(() => lockerStore.capeUrl  ?? account.value?.capeUrl  ?? null)
const activeSkinModel = computed(() => lockerStore.model   ?? account.value?.skinModel ?? 'default')

onActivated(() => { videoRef.value?.play() })
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

.skin-wrap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  height: calc(100% + 14vh);
  pointer-events: none;
  animation: skinFloat 3s ease-in-out infinite alternate;
}

@keyframes skinFloat {
  from { transform: translateX(-50%) translateY(0px); }
  to   { transform: translateX(-50%) translateY(-14px); }
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
</style>
