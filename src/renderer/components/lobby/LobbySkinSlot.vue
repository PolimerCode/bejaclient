<template>
  <div
    class="slot"
    :class="[`slot--${size}`, { 'slot--empty': !member }]"
    ref="wrapEl"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >

    <!-- ── Empty invite slot ──────────────────────────────────────────── -->
    <template v-if="!member">
      <button class="slot-invite" @click="$emit('invite')">
        <div class="invite-icon-wrap">
          <svg class="invite-plus" width="26" height="26" viewBox="0 0 26 26" fill="none">
            <line x1="13" y1="4" x2="13" y2="22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            <line x1="4"  y1="13" x2="22" y2="13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="slot-invite-label">Invite</span>
      </button>
    </template>

    <!-- ── Filled player slot ─────────────────────────────────────────── -->
    <template v-else>
      <div class="slot-player" :class="{ 'slot-player--entering': isEntering }">

        <!-- Crown -->
        <div v-if="member.isLeader" class="slot-crown">
          <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
            <path d="M1 15L4.5 5.5L11 10L17.5 2L21 9.5V15H1Z" fill="#FFD700" stroke="#E8A800" stroke-width="1"/>
          </svg>
        </div>

        <!-- Glow halo (speaking) — sits BEHIND the canvas -->
        <div class="slot-glow-wrap">
          <Transition name="glow-fade">
            <div v-if="member.isSpeaking" class="slot-speaking-glow" />
          </Transition>

          <!-- Shimmer skeleton shown while skin loads -->
          <div v-if="isLoadingSkin" class="slot-shimmer" :style="{ width: dims.w + 'px', height: dims.h + 'px' }" />

          <!-- 3D canvas — always rendered, opacity-hidden while loading -->
          <canvas
            ref="canvasEl"
            class="slot-canvas"
            :class="{ 'slot-canvas--ready': !isLoadingSkin }"
            :width="dims.w"
            :height="dims.h"
          />
        </div>

        <!-- Name strip -->
        <div class="slot-footer">
          <div class="slot-namebar" :class="{ 'slot-namebar--speaking': member.isSpeaking }">
            <span v-if="member.isSpeaking" class="speak-waves">
              <span /><span /><span />
            </span>
            <span class="slot-username">{{ member.username }}</span>
            <span v-if="isLocal" class="slot-you-tag">You</span>
          </div>
          <div class="slot-ready-badge" :class="{ 'ready': member.isReady }">
            <svg v-if="member.isReady" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ member.isReady ? 'Ready' : 'Not Ready' }}
          </div>
        </div>

      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { SkinViewer, IdleAnimation } from 'skinview3d'
import type { PartyMember } from '../../store/lobbyStore'

// Module-level texture cache — survives component remounts
const _skinTextureCache = new Map<string, string>() // skinUrl → data-url or same url

const props = defineProps<{
  member: PartyMember | null
  isLocal?: boolean
  size: 'xl' | 'lg' | 'md' | 'sm' | 'xs'
}>()

defineEmits<{ invite: [] }>()

const dims = computed(() => {
  const map: Record<string, { w: number; h: number }> = {
    xl: { w: 280, h: 420 },
    lg: { w: 230, h: 340 },
    md: { w: 195, h: 290 },
    sm: { w: 170, h: 255 },
    xs: { w: 150, h: 225 },
  }
  return map[props.size] ?? map.md
})

const canvasEl     = ref<HTMLCanvasElement | null>(null)
const wrapEl       = ref<HTMLElement | null>(null)
const isEntering   = ref(false)
const isLoadingSkin = ref(false)

let viewer: SkinViewer | null = null

// ── Lerp animation state ─────────────────────────────────────────────────────
let targetRotY  = -0.3
let currentRotY = -0.3
let breathPhase = Math.random() * Math.PI * 2 // randomise phase so not all bobs in sync
let rafId: number | null = null

function startRenderLoop(): void {
  function tick(): void {
    rafId = requestAnimationFrame(tick)
    if (!viewer || document.hidden) return

    // Lerp Y-rotation — smooth weighted follow
    currentRotY += (targetRotY - currentRotY) * 0.055
    viewer.playerWrapper.rotation.y = currentRotY

    // Breathing bob — subtle Y oscillation
    breathPhase += 0.016
    viewer.playerWrapper.position.y = Math.sin(breathPhase) * 0.022
  }
  tick()
}

function stopRenderLoop(): void {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
}

// ── Mouse tracking ────────────────────────────────────────────────────────────

function onMouseMove(e: MouseEvent): void {
  if (!wrapEl.value || !props.member) return
  const rect = wrapEl.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const dx = (e.clientX - cx) / (window.innerWidth * 0.5)
  targetRotY = -0.3 + Math.max(-0.75, Math.min(0.75, dx * 0.65))
}

function onMouseLeave(): void {
  targetRotY = -0.3 // spring back to neutral
}

// ── Viewer lifecycle ──────────────────────────────────────────────────────────

function buildViewer(): void {
  if (!canvasEl.value || !props.member) return
  viewer?.dispose()
  stopRenderLoop()

  viewer = new SkinViewer({
    canvas: canvasEl.value,
    width:  dims.value.w,
    height: dims.value.h,
  })

  viewer.renderer.setClearColor(0x000000, 0) // transparent bg
  viewer.zoom = 0.78

  viewer.animations.add(IdleAnimation)

  // Reset lerp state
  currentRotY = -0.3
  targetRotY  = -0.3
  viewer.playerWrapper.rotation.y = currentRotY

  startRenderLoop()
  loadSkin()
}

async function loadSkin(): Promise<void> {
  if (!viewer || !props.member) return
  const { skinUrl, skinModel, capeUrl } = props.member
  if (!skinUrl) { viewer.loadSkin(null); return }

  isLoadingSkin.value = true
  try {
    await viewer.loadSkin(skinUrl, skinModel === 'slim' ? 'slim' : 'default')
  } catch { /* non-fatal — use default Steve */ }
  isLoadingSkin.value = false

  if (capeUrl) {
    viewer.loadCape(capeUrl).catch(() => {})
  }
}

// ── Entrance animation ────────────────────────────────────────────────────────

function playEntrance(): void {
  isEntering.value = true
  setTimeout(() => { isEntering.value = false }, 700)
}

// ── Visibility — pause RAF when window hidden ────────────────────────────────

function onVisibilityChange(): void {
  if (!document.hidden && viewer && rafId === null) startRenderLoop()
}

// ── Mounted / unmounted ───────────────────────────────────────────────────────

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (props.member) {
    nextTick(() => {
      buildViewer()
      playEntrance()
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopRenderLoop()
  viewer?.dispose()
  viewer = null
})

// ── Watchers ──────────────────────────────────────────────────────────────────

watch(
  () => props.member,
  (next, prev) => {
    if (!next) {
      stopRenderLoop()
      viewer?.dispose()
      viewer = null
      return
    }
    if (!prev) {
      // New member appeared — build viewer + entrance anim
      nextTick(() => {
        buildViewer()
        playEntrance()
      })
    } else if (next.skinUrl !== prev.skinUrl || next.skinModel !== prev.skinModel) {
      loadSkin()
    }
  },
)

watch(dims, () => {
  if (!viewer || !props.member) return
  viewer.setSize(dims.value.w, dims.value.h)
})
</script>

<style lang="scss" scoped>
// ── Slot container ────────────────────────────────────────────────────────────
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  will-change: transform;
}

// ── Empty invite slot ─────────────────────────────────────────────────────────
.slot-invite {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border: 2px dashed rgba(255,255,255,0.13);
  border-radius: 18px;
  background: rgba(255,255,255,0.02);
  cursor: pointer;
  color: rgba(255,255,255,0.3);
  font-family: $font-family;
  transition:
    border-color 280ms cubic-bezier(0.4, 0, 0.2, 1),
    color        280ms cubic-bezier(0.4, 0, 0.2, 1),
    background   280ms cubic-bezier(0.4, 0, 0.2, 1),
    transform    280ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow   280ms cubic-bezier(0.4, 0, 0.2, 1);

  .slot--xl & { width: 200px; height: 310px; }
  .slot--lg & { width: 168px; height: 250px; }
  .slot--md & { width: 142px; height: 210px; }
  .slot--sm & { width: 125px; height: 186px; }
  .slot--xs & { width: 112px; height: 165px; }

  &:hover {
    border-color: rgba(85, 178, 255, 0.55);
    color: rgba(85, 178, 255, 0.9);
    background: rgba(85, 178, 255, 0.07);
    transform: scale(1.05);
    box-shadow: 0 0 28px rgba(85, 178, 255, 0.18), inset 0 0 20px rgba(85, 178, 255, 0.04);
  }
}

.invite-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1.5px dashed currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1);

  .slot-invite:hover & {
    transform: scale(1.12) rotate(90deg);
  }
}

.invite-plus {
  transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slot-invite-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

// ── Filled player slot ────────────────────────────────────────────────────────
.slot-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;

  // Entrance animation — drop + bounce
  &--entering {
    animation: slot-bounce-in 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
}

@keyframes slot-bounce-in {
  0%   { opacity: 0; transform: translateY(-48px) scale(0.8);  }
  55%  { opacity: 1; transform: translateY(10px) scale(1.04);  }
  75%  { transform: translateY(-5px) scale(0.98); }
  90%  { transform: translateY(3px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.slot-crown {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
  z-index: 2;
  animation: crown-float 3s ease-in-out infinite;
}

@keyframes crown-float {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%       { transform: translateX(-50%) translateY(-3px); }
}

// ── Glow wrap (speaking aura) ─────────────────────────────────────────────────
.slot-glow-wrap {
  position: relative;
  border-radius: 16px;
  overflow: visible;
}

.slot-speaking-glow {
  position: absolute;
  inset: -8px;
  border-radius: 22px;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.22) 0%, rgba(85, 200, 140, 0.12) 45%, transparent 70%);
  animation: speaker-pulse 0.95s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes speaker-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.55; transform: scale(1.06); }
}

.glow-fade-enter-active { transition: opacity 180ms ease; }
.glow-fade-leave-active { transition: opacity 280ms ease; }
.glow-fade-enter-from,
.glow-fade-leave-to     { opacity: 0; }

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
.slot-shimmer {
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    $surface-elevated 25%,
    rgba(255,255,255,0.07) 50%,
    $surface-elevated 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  position: absolute;
  inset: 0;
  z-index: 2;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ── Canvas ────────────────────────────────────────────────────────────────────
.slot-canvas {
  display: block;
  image-rendering: pixelated;
  background: transparent;
  position: relative;
  z-index: 1;
  opacity: 0;
  transition: opacity 350ms ease;

  &--ready { opacity: 1; }
}

// ── Footer / name strip ───────────────────────────────────────────────────────
.slot-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
}

.slot-namebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  transition: background 250ms cubic-bezier(0.4,0,0.2,1), border-color 250ms cubic-bezier(0.4,0,0.2,1);

  &--speaking {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.22);
  }
}

// Animated sound bars when speaking
.speak-waves {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 14px;

  span {
    display: block;
    width: 3px;
    border-radius: 2px;
    background: $success;
    animation: soundbar 0.7s ease-in-out infinite;

    &:nth-child(1) { height: 6px;  animation-delay: 0s; }
    &:nth-child(2) { height: 10px; animation-delay: 0.15s; }
    &:nth-child(3) { height: 6px;  animation-delay: 0.3s; }
  }
}

@keyframes soundbar {
  0%, 100% { transform: scaleY(0.5); }
  50%       { transform: scaleY(1.4); }
}

.slot-username {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: 0.2px;
}

.slot-you-tag {
  font-size: 10px;
  color: $accent;
  font-weight: 700;
  background: rgba(85, 178, 255, 0.18);
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.5px;
}

.slot-ready-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: $text-muted;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.04);
  transition: color 250ms cubic-bezier(0.4,0,0.2,1), background 250ms cubic-bezier(0.4,0,0.2,1);

  &.ready {
    color: $success;
    background: rgba(52, 199, 89, 0.13);
  }
}
</style>
