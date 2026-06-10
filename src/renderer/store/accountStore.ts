import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Account } from '../types'
import { useFriendsStore } from './friendsStore'

export const useAccountStore = defineStore('account', () => {
  const accounts = ref<Account[]>([])
  const loading = ref(false)
  // eslint-disable-next-line prefer-const
  let error = ref<string | null>(null)

  const selectedAccount = computed(() => accounts.value.find(a => a.selected) ?? null)
  const hasAccounts = computed(() => accounts.value.length > 0)

  async function loadAccounts() {
    loading.value = true
    error.value = null
    try {
      accounts.value = await window.api.auth.listAccounts()
      if (accounts.value.some(a => a.selected && a.bejaToken)) {
        await useFriendsStore().connect()
      }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function login(): Promise<Account | null> {
    loading.value = true
    error.value = null
    try {
      const account = await window.api.auth.login()
      await loadAccounts()
      if (!selectedAccount.value) {
        await selectAccount(account.id)
      }
      return account
    } catch (e) {
      error.value = String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function logout(id: string) {
    await window.api.auth.logout(id)
    await loadAccounts()
  }

  async function selectAccount(id: string) {
    accounts.value = await window.api.auth.selectAccount(id)
    useFriendsStore().connect()
  }

  async function refreshAccount(id: string) {
    const refreshed = await window.api.auth.refreshAccount(id)
    if (refreshed) {
      const idx = accounts.value.findIndex(a => a.id === id)
      if (idx >= 0) accounts.value[idx] = refreshed
    }
  }

  return {
    accounts,
    loading,
    error,
    selectedAccount,
    hasAccounts,
    loadAccounts,
    login,
    logout,
    selectAccount,
    refreshAccount,
  }
})
