<template>
  <Transition name="login-fade">
    <div v-if="show" class="login-backdrop">
      <div class="login-card">
        <img :src="logoUrl" class="login-logo" alt="BC" />
        <div class="login-brand">
          <span class="login-brand-beja">Beja</span><span class="login-brand-client">Client</span>
        </div>
        <p class="login-sub">Sign in with your Minecraft account to continue.</p>

        <button class="login-btn" :disabled="accountStore.loading" @click="handleLogin">
          <span v-if="accountStore.loading && !accountStore.loginStatus" class="login-spinner" />
          <svg v-else class="login-ms-icon" viewBox="0 0 21 21" fill="none">
            <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
            <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          Sign in with Microsoft
        </button>

        <p v-if="accountStore.loginStatus" class="login-status">
          {{ accountStore.loginStatus }}
        </p>
        <p v-if="accountStore.error && !accountStore.loading" class="login-error">
          {{ loginErrorMessage }}
        </p>

        <button class="login-import" @click="handleImport" :disabled="accountStore.loading">
          Import from Minecraft Launcher
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import logoUrl from '../../assets/bc-logo-new.png'
import { useAccountStore } from '../../store/accountStore'

const props = defineProps<{ show: boolean }>()
const accountStore = useAccountStore()

const loginErrorMessage = computed(() => {
  const raw = accountStore.error
  if (!raw) return ''
  const msg = raw.replace(/^Error:\s*/i, '').trim()
  if (/cancel/i.test(msg)) return 'Sign-in cancelled.'
  if (/timed?\s*out/i.test(msg)) return 'Sign-in timed out. Try again.'
  if (/does not own minecraft/i.test(msg)) return 'This account does not own Minecraft Java Edition.'
  if (/no xbox profile/i.test(msg)) return 'No Xbox profile on this account. Set one up at xbox.com.'
  if (/not available in your country/i.test(msg)) return 'Xbox Live is not available in your region.'
  if (/no auth code/i.test(msg)) return 'Authorisation denied. Try again.'
  return msg || 'Sign-in failed. Try again.'
})

async function handleLogin() {
  await accountStore.login()
}

async function handleImport() {
  await accountStore.importFromLauncher()
}
</script>

<style lang="scss" scoped>
.login-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 16, 16, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.login-card {
  width: 320px;
  background: $surface;
  border: 1px solid $border-strong;
  border-radius: 0;
  padding: 36px 32px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
}

.login-logo {
  width: 40px;
  height: 40px;
  filter: brightness(0) invert(1);
  margin-bottom: 14px;
}

.login-brand {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 10px;
}

.login-brand-beja   { font-weight: 800; color: $text-primary; font-family: 'Plus Jakarta Sans', sans-serif; }
.login-brand-client { font-weight: 300; color: $text-primary; font-family: 'Plus Jakarta Sans', sans-serif; }

.login-sub {
  font-size: 12px;
  color: $text-secondary;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 24px;
  max-width: 220px;
}

.login-btn {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: 0;
  color: $text-primary;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, border-color 120ms;
  margin-bottom: 10px;

  &:hover:not(:disabled) {
    background: $border;
    border-color: $border-strong;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.login-ms-icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.login-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: $accent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

.login-status {
  font-size: 11px;
  color: $accent;
  text-align: center;
  margin-bottom: 6px;
}

.login-error {
  font-size: 11px;
  color: $error;
  text-align: center;
  margin-bottom: 6px;
}

.login-import {
  margin-top: 14px;
  background: none;
  border: none;
  color: $text-secondary;
  font-size: 11px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  padding: 4px 0;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 120ms;

  &:hover:not(:disabled) { color: $text-primary; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.login-fade-enter-active { transition: opacity 0.25s ease; }
.login-fade-leave-active { transition: opacity 0.2s ease; }
.login-fade-enter-from, .login-fade-leave-to { opacity: 0; }
</style>
