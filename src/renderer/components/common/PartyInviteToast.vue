<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite">
      <TransitionGroup name="toast-pop">
        <div v-if="invite" :key="invite.partyId + invite.fromUuid" class="toast-card">
          <!-- Avatar -->
          <div class="toast-avatar">{{ invite.fromUsername[0].toUpperCase() }}</div>

          <!-- Info -->
          <div class="toast-info">
            <div class="toast-eyebrow">Lobby Invite</div>
            <div class="toast-name">{{ invite.fromUsername }} invited you</div>
          </div>

          <!-- Buttons -->
          <div class="toast-btns">
            <button class="toast-accept" @click="accept">Join</button>
            <button class="toast-decline" @click="lobbyStore.declineInvite()">✕</button>
          </div>

          <!-- Progress bar auto-dismiss indicator -->
          <div class="toast-bar" :style="{ animationDuration: TOAST_MS + 'ms' }" />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useLobbyStore } from '../../store/lobbyStore'

const TOAST_MS = 10000

const lobbyStore = useLobbyStore()
const invite = computed(() => lobbyStore.pendingInvite)

let dismissTimer: ReturnType<typeof setTimeout> | null = null

watch(invite, (next) => {
  if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null }
  if (next) dismissTimer = setTimeout(() => lobbyStore.declineInvite(), TOAST_MS)
})

async function accept(): Promise<void> {
  if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null }
  await lobbyStore.acceptInvite()
}
</script>

<style lang="scss" scoped>
.toast-stack {
  position: fixed;
  bottom: 24px;
  right: 80px; // clears the right panel
  z-index: 9000;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  pointer-events: none;
}

.toast-card {
  pointer-events: all;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 320px;
  padding: 13px 14px 16px; // extra bottom for progress bar
  background: $surface-elevated;
  border: 1px solid $border-strong;
  border-radius: $radius-lg;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.55),
    0 2px 8px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
}

.toast-avatar {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: $surface;
  border: 1px solid $border-strong;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: $text-primary;
  flex-shrink: 0;
}

.toast-info {
  flex: 1;
  min-width: 0;
}

.toast-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: $accent;
  margin-bottom: 2px;
}

.toast-name {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-btns {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.toast-accept {
  padding: 5px 12px;
  border-radius: $radius-sm;
  border: none;
  background: $accent;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: $font-family;
  transition: background $transition;

  &:hover { background: $primary-hover; }
}

.toast-decline {
  width: 28px;
  height: 28px;
  border-radius: $radius-sm;
  border: 1px solid $border-strong;
  background: transparent;
  color: $text-muted;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color $transition, background $transition;

  &:hover { color: $text-primary; background: rgba(255,255,255,0.08); }
}

// Shrinking progress bar at bottom
.toast-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: $accent;
  transform-origin: left;
  animation: shrink linear forwards;
  opacity: 0.7;
}

@keyframes shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

// ── Transition ───────────────────────────────────────────────────────────────
.toast-pop-enter-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.toast-pop-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.toast-pop-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.toast-pop-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
