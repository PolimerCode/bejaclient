import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLockerStore = defineStore('locker', () => {
  const skinUrl  = ref<string | null>(null)
  const capeUrl  = ref<string | null>(null)
  const model    = ref<'default' | 'slim'>('default')

  function selectSkin(s: { skinUrl: string | null; capeUrl?: string | null; model?: 'default' | 'slim' }) {
    skinUrl.value = s.skinUrl
    capeUrl.value = s.capeUrl ?? null
    model.value   = s.model   ?? 'default'
  }

  return { skinUrl, capeUrl, model, selectSkin }
})
