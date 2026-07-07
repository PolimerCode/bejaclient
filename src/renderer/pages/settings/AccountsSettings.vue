<template>
  <div class="settings-section">
    <h2 class="section-heading">{{ $t('accounts.heading') }}</h2>
    <p class="section-desc">{{ $t('accounts.desc') }}</p>

    <div class="accounts-list">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="account-card"
        :class="{ selected: account.selected }"
      >
        <div class="account-avatar">
          <SkinPreview :skin-url="account.skinUrl" :username="account.username" :size="40" :animate="false" />
        </div>
        <div class="account-details">
          <span class="account-name">{{ account.username }}</span>
          <span class="account-uuid">{{ formatUuid(account.uuid) }}</span>
          <span class="account-status" :class="{ expired: isExpired(account) }">
            {{ isExpired(account) ? $t('accounts.expired') : $t('accounts.active') }}
          </span>
        </div>
        <div class="account-actions">
          <button v-if="!account.selected" class="action-btn select-btn" @click="selectAccount(account.id)">{{ $t('accounts.select') }}</button>
          <span v-else class="selected-badge">{{ $t('accounts.active') }}</span>
          <button class="action-btn refresh-btn" @click="refreshAccount(account.id)">
            <span v-if="refreshing === account.id" class="mini-spinner" />
            <span v-else>{{ $t('accounts.refresh') }}</span>
          </button>
          <button class="action-btn remove-btn" @click="removeAccount(account.id)">{{ $t('accounts.remove') }}</button>
        </div>
      </div>
      <div v-if="accounts.length === 0" class="no-accounts">{{ $t('accounts.empty') }}</div>
    </div>

    <div class="add-account">
      <Button variant="primary" :loading="accountStore.loading" @click="addAccount">
        <template #icon>
          <svg width="12" height="12" viewBox="0 0 12 12"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </template>
        {{ $t('accounts.add') }}
      </Button>
      <Button variant="secondary" :loading="accountStore.loading" @click="importFromLauncher">
        {{ $t('accounts.import') }}
      </Button>
      <span class="add-hint">{{ $t('accounts.hint') }}</span>
    </div>

    <div v-if="accountStore.error" class="error-msg">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><line x1="7" y1="4" x2="7" y2="7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="7" cy="9.5" r="0.7" fill="currentColor"/></svg>
      {{ accountStore.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from '../../components/common/Button.vue'
import SkinPreview from '../../components/skin/SkinPreview.vue'
import { useAccountStore } from '../../store/accountStore'
import type { Account } from '../../types'

const { t } = useI18n()
const accountStore = useAccountStore()
const accounts = computed(() => accountStore.accounts)
const refreshing = ref<string | null>(null)

async function addAccount() { await accountStore.login() }
async function importFromLauncher() { await accountStore.importFromLauncher() }
async function selectAccount(id: string) { await accountStore.selectAccount(id) }
async function refreshAccount(id: string) {
  refreshing.value = id
  await accountStore.refreshAccount(id)
  refreshing.value = null
}
async function removeAccount(id: string) { await accountStore.logout(id) }
function isExpired(a: Account) { return a.tokenExpiry < Date.now() }
function formatUuid(uuid: string) {
  const c = uuid.replace(/-/g, '')
  if (c.length !== 32) return uuid
  return `${c.slice(0,8)}-${c.slice(8,12)}-${c.slice(12,16)}-${c.slice(16,20)}-${c.slice(20)}`
}
</script>

<style lang="scss" scoped>
.settings-section { display: flex; flex-direction: column; gap: $sp-6; max-width: 640px; }
.section-heading { font-size: 18px; font-weight: 800; color: $text-primary; }
.section-desc { font-size: 13px; color: $muted; margin-top: -$sp-4; }
.accounts-list { display: flex; flex-direction: column; gap: $sp-2; }
.account-card {
  display: flex; align-items: center; gap: $sp-3; padding: $sp-4;
  background: $surface; border: 1px solid $border; border-radius: $radius;
  &.selected { border-color: $border-strong; background: $surface-elevated; }
}
.account-avatar { width: 40px; height: 40px; overflow: hidden; border-radius: $radius; flex-shrink: 0; }
.account-details { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.account-name { font-size: 14px; font-weight: 700; color: $text-primary; }
.account-uuid { font-size: 10px; color: $muted; }
.account-status { font-size: 11px; color: $success; font-weight: 600; &.expired { color: $error; } }
.account-actions { display: flex; align-items: center; gap: $sp-2; flex-shrink: 0; }
.action-btn {
  padding: 4px $sp-3; font-size: 11px; font-weight: 600; border-radius: $radius;
  cursor: pointer; border: 1px solid $border; background: $surface-elevated; color: $text-secondary;
  transition: all $transition; display: flex; align-items: center; gap: $sp-1;
  &.select-btn:hover { background: $text-primary; border-color: $text-primary; color: $bg; }
  &.refresh-btn:hover { border-color: $border-strong; color: $text-primary; }
  &.remove-btn { color: $text-secondary; border-color: $border; background: $surface-elevated;
    &:hover { background: $border; color: $text-primary; } }
}
.selected-badge { font-size: 11px; font-weight: 700; color: $text-primary; padding: 4px $sp-3; }
.mini-spinner {
  width: 10px; height: 10px; border: 1.5px solid rgba(255,255,255,0.2);
  border-top-color: $text-primary; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.no-accounts { padding: $sp-8; text-align: center; font-size: 13px; color: $muted; }
.add-account { display: flex; flex-direction: column; gap: $sp-2; }
.add-hint { font-size: 11px; color: $muted; }
.error-msg {
  display: flex; align-items: center; gap: $sp-2; padding: $sp-3;
  background: $surface-elevated; border: 1px solid $border;
  border-radius: $radius; font-size: 12px; color: $text-secondary;
}
</style>
