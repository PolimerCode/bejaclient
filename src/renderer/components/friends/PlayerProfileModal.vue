<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue && player" class="modal-overlay" @click.self="close">
        <div class="modal">

          <button class="close-btn" @click="close">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div class="modal-body">

            <!-- Skin render -->
            <div class="skin-column">
              <div class="skin-wrap">
                <img v-if="bodyRenderUrl" :src="bodyRenderUrl" :alt="player.username" class="skin-render" />
                <div v-else-if="skinLoading" class="skin-placeholder">
                  <div class="skin-spinner" />
                </div>
                <div v-else class="skin-placeholder skin-placeholder--letter">
                  {{ player.username[0].toUpperCase() }}
                </div>
              </div>
            </div>

            <!-- Info column -->
            <div class="info-column">
              <h2 class="player-name">{{ player.username }}</h2>

              <div class="field">
                <span class="field-label">UUID</span>
                <div class="uuid-row">
                  <code class="uuid-val">{{ player.uuid }}</code>
                  <button class="mini-btn" @click="copyUuid">{{ copiedUuid ? 'Copied!' : 'Copy' }}</button>
                </div>
              </div>

              <div class="field">
                <span class="field-label">Skin model</span>
                <span class="field-val">{{ player.skinModel === 'slim' ? 'Slim (Alex)' : 'Classic (Steve)' }}</span>
              </div>

              <div class="field">
                <span class="field-label">Cape</span>
                <span class="field-val">{{ player.capeUrl ? 'Yes' : 'None' }}</span>
              </div>

              <div class="modal-actions">
                <button
                  class="btn-secondary"
                  :disabled="!player.skinUrl || saving"
                  @click="saveSkin"
                >{{ saveLabel }}</button>
                <button
                  class="btn-primary"
                  :disabled="requestSent"
                  @click="addFriend"
                >{{ requestSent ? 'Request Sent!' : 'Add Friend' }}</button>
              </div>

              <p v-if="saveResult" class="save-result">{{ saveResult }}</p>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PlayerProfile } from '../../types'
import { useFriendsStore } from '../../store/friendsStore'

const props = defineProps<{
  modelValue: boolean
  player: PlayerProfile | null
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const friendsStore = useFriendsStore()

const copiedUuid    = ref(false)
const requestSent   = ref(false)
const saving        = ref(false)
const saveLabel     = ref('Save Skin')
const saveResult    = ref('')
const bodyRenderUrl = ref('')
const skinLoading   = ref(false)

watch(() => props.player, async player => {
  copiedUuid.value    = false
  requestSent.value   = false
  saving.value        = false
  saveLabel.value     = 'Save Skin'
  saveResult.value    = ''
  bodyRenderUrl.value = ''
  if (!player) return
  skinLoading.value   = true
  bodyRenderUrl.value = await window.api.players.fetchImage(
    `https://mc-heads.net/body/${player.uuid}/200`
  )
  skinLoading.value = false
}, { immediate: true })

function close() { emit('update:modelValue', false) }

function copyUuid() {
  if (!props.player) return
  navigator.clipboard.writeText(props.player.uuid)
  copiedUuid.value = true
  setTimeout(() => { copiedUuid.value = false }, 2000)
}

async function saveSkin() {
  if (!props.player?.skinUrl || saving.value) return
  saving.value    = true
  saveLabel.value = 'Saving…'
  try {
    const dest = await window.api.players.saveSkin(props.player.skinUrl, props.player.username)
    saveResult.value = `Saved to ${dest}`
    saveLabel.value  = 'Saved!'
  } catch {
    saveResult.value = 'Save failed.'
    saveLabel.value  = 'Save Skin'
    saving.value     = false
  }
}

async function addFriend() {
  if (!props.player || requestSent.value) return
  await friendsStore.sendRequest(props.player.username)
  requestSent.value = true
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  position: relative;
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  width: 520px;
  max-width: 90vw;
  overflow: hidden;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: $text-secondary;
  transition: color $transition, background $transition;
  z-index: 1;
  &:hover { color: $text-primary; background: $border; }
}

.modal-body {
  display: flex;
  gap: 0;
}

// ── Skin column ───────────────────────────────────────────────────────────────
.skin-column {
  width: 160px;
  flex-shrink: 0;
  background: #0d0d0d;
  border-right: 1px solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  min-height: 280px;
}

.skin-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skin-render {
  image-rendering: pixelated;
  max-height: 200px;
  width: auto;
}

.skin-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 160px;
  &--letter { font-size: 48px; color: $muted; font-weight: 700; }
}

.skin-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid $border;
  border-top-color: $text-secondary;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

// ── Info column ───────────────────────────────────────────────────────────────
.info-column {
  flex: 1;
  padding: 28px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.player-name {
  font-size: 22px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: $muted;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field-val {
  font-size: 13px;
  color: $text-secondary;
}

.uuid-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.uuid-val {
  font-size: 11px;
  color: $text-secondary;
  font-family: monospace;
  word-break: break-all;
  flex: 1;
}

.mini-btn {
  flex-shrink: 0;
  padding: 3px 10px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  color: $text-secondary;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background $transition, color $transition;
  white-space: nowrap;
  &:hover { background: $border; color: $text-primary; }
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.btn-primary {
  flex: 1;
  padding: 9px 16px;
  background: $text-primary;
  color: $bg;
  border: none;
  border-radius: $radius;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background $transition;
  &:hover:not(:disabled) { background: $text-secondary; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
}

.btn-secondary {
  flex: 1;
  padding: 9px 16px;
  background: $surface-elevated;
  color: $text-primary;
  border: 1px solid $border;
  border-radius: $radius;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background $transition;
  &:hover:not(:disabled) { background: $border; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
}

.save-result {
  font-size: 11px;
  color: $muted;
  margin: 0;
  word-break: break-all;
}

// ── Transition ────────────────────────────────────────────────────────────────
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 150ms ease; }
.modal-fade-enter-from,  .modal-fade-leave-to      { opacity: 0; }
</style>
