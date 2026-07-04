<template>
  <Transition name="beta-slide">
    <div v-if="show" class="beta-toast">
      <svg class="beta-icon" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L2 17h16L10 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M10 8v4M10 14.5v.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <div class="beta-text">
        <span class="beta-title">Beta version</span>
        <span class="beta-body">Features may not work as expected. Report issues on our
          <a href="https://discord.gg/bejaclient" target="_blank" rel="noopener" class="beta-link">Discord</a>.
        </span>
      </div>
      <button class="beta-close" @click="dismiss" aria-label="Dismiss">
        <svg viewBox="0 0 14 14" fill="none" width="10" height="10">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'beja_beta_seen'
const show = ref(false)

onMounted(() => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    setTimeout(() => { show.value = true }, 800)
  }
})

function dismiss() {
  show.value = false
  localStorage.setItem(STORAGE_KEY, '1')
}
</script>

<style lang="scss" scoped>
.beta-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 600;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: $surface-elevated;
  border: 1px solid rgba(232, 160, 48, 0.3);
  border-radius: 8px;
  padding: 12px 14px;
  max-width: 420px;
  width: max-content;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.beta-icon {
  width: 18px;
  height: 18px;
  color: $warning;
  flex-shrink: 0;
  margin-top: 1px;
}

.beta-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.beta-title {
  font-size: 12px;
  font-weight: 700;
  color: $warning;
  font-family: 'Plus Jakarta Sans', sans-serif;
  letter-spacing: 0.02em;
}

.beta-body {
  font-size: 11px;
  color: $text-secondary;
  line-height: 1.5;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.beta-link {
  color: $accent;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.beta-close {
  background: none;
  border: none;
  color: $text-secondary;
  cursor: pointer;
  padding: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: color 100ms, background 100ms;
  margin-left: 4px;

  &:hover { color: $text-primary; background: rgba(255,255,255,0.06); }
}

.beta-slide-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.beta-slide-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.beta-slide-enter-from   { opacity: 0; transform: translateX(-50%) translateY(10px); }
.beta-slide-leave-to     { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
