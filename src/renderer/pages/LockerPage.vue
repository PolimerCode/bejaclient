<template>
  <div class="locker-page">

    <!-- Tabs -->
    <div class="tab-row">
      <button
        v-for="t in tabs"
        :key="t"
        class="tab-btn"
        :class="{ active: activeTab === t }"
        @click="activeTab = t"
      >{{ $t(`locker.tabs.${t.toLowerCase()}`) }}</button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <input
        v-model="search"
        class="search-input"
        :placeholder="searchPlaceholder"
      />
      <img :src="searchIcon" class="search-icon" alt="" />
    </div>

    <!-- ── Skins tab ──────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'Skins'" class="skin-grid">

      <!-- Add new skin card -->
      <button class="skin-card skin-card--add" @click="addModalOpen = true">
        <!-- ghost bg skin -->
        <div v-if="account?.skinUrl" class="add-card-ghost">
          <StaticSkinViewer
            :skin-url="account.skinUrl"
            :cape-url="account.capeUrl"
            :model="account.skinModel"
            :zoom="0.75"
            :initial-rotation-y="0.65"
          />
        </div>
        <div class="add-card-content">
           <img :src="addIcon" class="add-icon-img" alt="" />
           <span class="add-title">{{ $t('locker.skins.addTitle') }}</span>
           <span class="add-sub">{{ $t('locker.skins.importOrSearch') }}</span>
         </div>
       </button>

       <!-- Saved skin cards -->
       <div
         v-for="skin in filteredSkins"
         :key="skin.uuid"
         class="skin-card"
         :class="{ 'skin-card--active': skin.uuid === selectedUuid }"
         @click="equipSkin(skin)"
       >
         <button class="skin-del-btn" @click.stop="removeSkin(skin.uuid)" :title="$t('locker.skins.remove')">
           <img :src="removeIcon" alt="" />
         </button>

        <!-- 3D viewer for all cards with a skin URL -->
        <template v-if="resolvedSkinUrl(skin)">
          <div class="skin-viewer-wrap">
            <StaticSkinViewer
              :skin-url="resolvedSkinUrl(skin)"
              :cape-url="resolvedCapeUrl(skin)"
              :model="skin.uuid === account?.uuid ? (account.skinModel ?? 'auto-detect') : (skin.model ?? 'auto-detect')"
              :zoom="0.75"
              :initial-rotation-y="0.65"
            />
          </div>
        </template>
        <!-- Fallback: 2D body image -->
        <template v-else>
          <div class="skin-body-wrap">
            <img
              class="skin-body-img"
              :src="`https://mc-heads.net/player/${skin.uuid}/120`"
              :alt="skin.username"
            />
          </div>
        </template>

        <div class="skin-label-row">
          <span class="skin-username">{{ skin.username }}</span>
          <span class="skin-model-tag">{{ skin.model }}</span>
        </div>
      </div>
    </div>

    <!-- ── Capes tab ──────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'Capes'" class="skin-grid">

      <!-- No cape card -->
      <div
        class="skin-card"
         :class="{ 'skin-card--active': selectedCapeUuid === null }"
         @click="equipNoCape"
       >
         <div class="no-cape-wrap">
           <span class="no-cape-label">{{ $t('locker.capes.none') }}</span>
         </div>
       </div>

       <div v-if="capesLoading" class="empty-tab">
         <span class="btn-spinner" style="width:18px;height:18px;border-width:2px" />
       </div>

       <div
         v-for="cape in filteredCapes"
         :key="cape.id"
         class="skin-card"
         :class="{ 'skin-card--active': cape.id === selectedCapeUuid }"
         @click="equipCape(cape)"
       >
         <span v-if="cape.builtin" class="cape-builtin-badge">BEJA</span>
         <div class="cape-front-wrap">
           <div class="cape-front" :style="capeFrontStyle(cape.url)" />
         </div>
         <div class="skin-label-row">
           <span class="skin-username">{{ cape.alias }}</span>
           <span class="skin-model-tag">cape</span>
         </div>
       </div>

       <div v-if="!capesLoading && capesError" class="empty-tab" style="width:100%">
         <span class="empty-tab-text" style="color:#c05050">{{ capesError }}</span>
       </div>
       <div v-else-if="!capesLoading && !filteredCapes.length" class="empty-tab" style="width:100%">
         <span class="empty-tab-text">{{ $t('locker.capes.noCapes') }}</span>
       </div>
     </div>

     <!-- ── Cosmetics tab ──────────────────────────────────────────────── -->
     <div v-else-if="activeTab === 'Cosmetics'" class="cosmetics-grid">
       <div v-if="cosmeticsLoading" class="empty-tab">
         <span class="btn-spinner" style="width:18px;height:18px;border-width:2px" />
       </div>

       <div v-else-if="!ownedCosmetics.length" class="empty-tab" style="width:100%">
         <span class="empty-tab-text">{{ $t('locker.cosmetics.noCosmetics') }}</span>
       </div>

      <div
        v-for="cos in filteredCosmetics"
        :key="cos.id"
        class="cosmetic-card"
        :class="{ 'cosmetic-card--equipped': cos.equipped }"
        :style="cosmeticCardStyle(cos.rarity)"
        @click="toggleEquip(cos)"
      >
        <div class="cosmetic-viewer">
          <CosmeticModelViewer
            :model-url="cos.model_url"
            :rarity="cos.rarity"
          />
        </div>
        <div class="cosmetic-label-row">
          <span class="cosmetic-name">{{ cos.name || '???' }}</span>
          <span class="cosmetic-rarity" :style="{ color: RARITIES[cos.rarity]?.color }">
            {{ RARITIES[cos.rarity]?.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Add skin modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="addModalOpen" class="modal-overlay" @click.self="closeModal">
          <div class="add-modal">
            <p class="modal-title">{{ $t('locker.skins.addTitle') }}</p>
            <div class="modal-input-wrap" :class="{ focused: modalInputFocused }">
              <input
                ref="modalInputRef"
                v-model="usernameInput"
                class="modal-input"
                :placeholder="$t('locker.skins.placeholder')"
                @focus="modalInputFocused = true"
                @blur="modalInputFocused = false"
                @keyup.enter="lookupSkin"
              />
            </div>
            <Transition name="fade">
              <p v-if="lookupError" class="modal-error">{{ lookupError }}</p>
            </Transition>
            <div class="modal-footer">
              <button class="modal-btn modal-btn--cancel" @click="closeModal">{{ $t('locker.skins.cancel') }}</button>
              <button class="modal-btn modal-btn--confirm" :disabled="!usernameInput.trim() || lookingUp" @click="lookupSkin">
                <span v-if="lookingUp" class="btn-spinner" />
                <template v-else>{{ $t('locker.skins.search') }}</template>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '../store/accountStore'

const { t } = useI18n()

import addIcon    from '../assets/icons8-add-64.png'
import removeIcon from '../assets/icons8-remove-24.png'
import searchIcon from '../assets/icons8-search-50.png'
import StaticSkinViewer from '../components/skin/StaticSkinViewer.vue'
import CosmeticModelViewer from '../components/cosmetics/CosmeticModelViewer.vue'
import { useLockerStore } from '../store/lockerStore'
import type { Rarity, PlayerCosmetic } from '../types/cosmetics'
import { RARITIES } from '../types/cosmetics'

const lockerStore = useLockerStore()

const accountStore = useAccountStore()
const account = computed(() => accountStore.selectedAccount)

// ── Cosmetics ─────────────────────────────────────────────────────────────────
const ownedCosmetics  = ref<PlayerCosmetic[]>([])
const cosmeticsLoading = ref(false)

const filteredCosmetics = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return ownedCosmetics.value
  return ownedCosmetics.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.rarity.toLowerCase().includes(q)
  )
})

function cosmeticCardStyle(rarity: Rarity) {
  const r = RARITIES[rarity]
  if (!r) return {}
  return {
    background:   r.bg,
    borderColor:  r.color + '50',
    boxShadow:    `0 0 12px ${r.glow}`,
  }
}

async function toggleEquip(cos: PlayerCosmetic) {
  cos.equipped = !cos.equipped
  const equipped = ownedCosmetics.value.filter(c => c.equipped).map(c => c.id)
  try { await window.api.cosmetics.update({ equipped }) } catch { /* non-fatal */ }
}

async function loadCosmetics() {
  if (!account.value?.uuid) return
  cosmeticsLoading.value = true
  try {
    const inv = await (window as any).api.cosmetics.inventory(account.value.uuid) as PlayerCosmetic[] | null
    ownedCosmetics.value = inv ?? []
  } catch {
    ownedCosmetics.value = []
  } finally {
    cosmeticsLoading.value = false
  }
}

const tabs        = ['Skins', 'Capes', 'Cosmetics'] as const
type Tab          = typeof tabs[number]
const activeTab   = ref<Tab>('Skins')
const search      = ref('')

const searchPlaceholder = computed(() => {
  return t('locker.searchPlaceholder', { tab: t(`locker.tabs.${activeTab.value.toLowerCase()}`).toLowerCase() })
})

interface SkinEntry {
  uuid: string
  username: string
  model: 'default' | 'slim'
  skinUrl?: string | null
  capeUrl?: string | null
}

const skins       = ref<SkinEntry[]>([])
const selectedUuid = ref<string | null>(null)

const filteredSkins = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return skins.value
  return skins.value.filter(s => s.username.toLowerCase().includes(q))
})

interface CapeEntry {
  id: string
  url: string
  alias: string
  state: 'ACTIVE' | 'INACTIVE'
  builtin?: boolean
}

const BEJA_ORIGINAL_ID  = 'beja-original'
const BEJA_ORIGINAL_URL = 'http://127.0.0.1:25588/beja-default.png'

const ownedCapes    = ref<CapeEntry[]>([])
const capesLoading  = ref(false)
const selectedCapeUuid = ref<string | null>(null)

const filteredCapes = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return ownedCapes.value
  return ownedCapes.value.filter(c => c.alias.toLowerCase().includes(q))
})

const capesError = ref<string | null>(null)

async function loadOwnedCapes() {
  capesLoading.value = true
  capesError.value   = null
  const collected: CapeEntry[] = []
  let   bejaActiveUrl: string | null = null
  const debugLines: string[] = []

  // 1. BejaClient cosmetics (primary); fall back to localStorage when API is down
  if (account.value?.uuid) {
    try {
      const cos = await window.api.cosmetics.get(account.value.uuid) as Record<string, unknown> | null
      debugLines.push(`beja cosmetics: ${JSON.stringify(cos).slice(0, 80)}`)
      if (cos && typeof cos.cape_url === 'string' && cos.cape_url) bejaActiveUrl = cos.cape_url
    } catch (e) {
      debugLines.push(`beja cosmetics error: ${e}`)
    }
    if (!bejaActiveUrl) {
      const local = loadLocalCapeUrl()
      if (local) { bejaActiveUrl = local; debugLines.push('cape_url from local fallback') }
    }
  } else {
    debugLines.push('no uuid on account')
  }

  // 2. Mojang profile capes (secondary)
  if (account.value?.accessToken) {
    try {
      let data = await window.api.players.mcProfile(account.value.accessToken) as Record<string, unknown>
      debugLines.push(`mojang profile: ${JSON.stringify(data)}`)
      if (!data || data.error || !data.id) {
        debugLines.push(`token invalid/expired, refreshing...`)
        await accountStore.refreshAccount(account.value.id)
        if (account.value?.accessToken) {
          data = await window.api.players.mcProfile(account.value.accessToken) as Record<string, unknown>
          debugLines.push(`mojang profile after refresh: ${JSON.stringify(data)}`)
        }
      }
      if (data && !data.error && data.id) {
        const rawCapes = (data.capes ?? []) as { id: string; url: string; alias?: string; state: string }[]
        debugLines.push(`mojang capes count: ${rawCapes.length}`)
        rawCapes.forEach(c => collected.push({
          id:    c.id,
          url:   c.url,
          alias: c.alias ?? 'Mojang Cape',
          state: c.state as 'ACTIVE' | 'INACTIVE',
        }))
      }
    } catch (e) {
      debugLines.push(`mojang error: ${e}`)
    }
  } else {
    debugLines.push('no accessToken on account')
  }

  // 3. If BejaClient cape URL isn't already in the list, add it
  if (bejaActiveUrl && bejaActiveUrl !== BEJA_ORIGINAL_URL && !collected.some(c => c.url === bejaActiveUrl)) {
    collected.unshift({
      id:    bejaActiveUrl,
      url:   bejaActiveUrl,
      alias: 'BejaClient Cape',
      state: 'ACTIVE',
    })
  }

  // 4. Always prepend the built-in BejaClient Original cape
  if (!collected.some(c => c.id === BEJA_ORIGINAL_ID)) {
    collected.unshift({
      id:      BEJA_ORIGINAL_ID,
      url:     BEJA_ORIGINAL_URL,
      alias:   'BejaClient Original',
      state:   'ACTIVE',
      builtin: true,
    })
  }

  ownedCapes.value = collected
  if (bejaActiveUrl) {
    selectedCapeUuid.value = collected.find(c => c.url === bejaActiveUrl)?.id ?? null
    lockerStore.selectSkin({ skinUrl: lockerStore.skinUrl, capeUrl: bejaActiveUrl, model: lockerStore.model })
  } else {
    selectedCapeUuid.value = collected.find(c => c.state === 'ACTIVE')?.id ?? null
  }

  console.log('[Capes]', debugLines.join(' | '))
  if (!collected.length) capesError.value = debugLines.join(' | ')

  capesLoading.value = false
}

function capeFrontStyle(url: string | null) {
  if (!url) return {}
  const s = 20
  return {
    backgroundImage:    `url(${url})`,
    backgroundSize:     `${64 * s}px ${32 * s}px`,
    backgroundPosition: `-${s}px -${s}px`,
    width:              `${10 * s}px`,
    height:             `${16 * s}px`,
    imageRendering:     'pixelated' as const,
  }
}

function saveLocalCapeUrl(url: string | null) {
  if (url) localStorage.setItem('beja_local_cape_url', url)
  else     localStorage.removeItem('beja_local_cape_url')
}

function loadLocalCapeUrl(): string | null {
  return localStorage.getItem('beja_local_cape_url')
}

async function equipNoCape() {
  selectedCapeUuid.value = null
  saveLocalCapeUrl(null)
  lockerStore.selectSkin({ skinUrl: lockerStore.skinUrl, capeUrl: null, model: lockerStore.model })
  try { await window.api.cosmetics.update({ cape_url: null }) } catch { /* non-fatal */ }
}

async function equipCape(cape: CapeEntry) {
  selectedCapeUuid.value = cape.id
  saveLocalCapeUrl(cape.url)
  lockerStore.selectSkin({ skinUrl: lockerStore.skinUrl, capeUrl: cape.url, model: lockerStore.model })
  try { await window.api.cosmetics.update({ cape_url: cape.url }) } catch { /* non-fatal */ }
}

// ── Persist to localStorage ───────────────────────────────────────────────────
function saveSkins() {
  localStorage.setItem('beja_locker_skins', JSON.stringify(skins.value))
}

function loadSkins() {
  try {
    const raw = localStorage.getItem('beja_locker_skins')
    if (raw) skins.value = JSON.parse(raw)
  } catch { /* ignore */ }

  // seed current account if not already in list
  if (account.value?.uuid && !skins.value.some(s => s.uuid === account.value!.uuid)) {
    skins.value.push({
      uuid:    account.value.uuid,
      username: account.value.username,
      model:   account.value.skinModel ?? 'default',
      skinUrl: account.value.skinUrl,
      capeUrl: account.value.capeUrl,
    })
    saveSkins()
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function resolvedSkinUrl(skin: SkinEntry): string | null {
  if (skin.uuid === account.value?.uuid) return account.value.skinUrl ?? skin.skinUrl ?? null
  return skin.skinUrl ?? null
}

function resolvedCapeUrl(skin: SkinEntry): string | null {
  if (skin.uuid === account.value?.uuid) return account.value.capeUrl ?? skin.capeUrl ?? null
  return skin.capeUrl ?? null
}

function removeSkin(uuid: string) {
  skins.value = skins.value.filter(s => s.uuid !== uuid)
  saveSkins()
}

function equipSkin(skin: SkinEntry) {
  selectedUuid.value = skin.uuid
  lockerStore.selectSkin({
    skinUrl: resolvedSkinUrl(skin),
    capeUrl: resolvedCapeUrl(skin),
    model:   skin.uuid === account.value?.uuid
               ? (account.value.skinModel ?? 'default')
               : (skin.model ?? 'default'),
  })
}

// ── Add skin modal ────────────────────────────────────────────────────────────
const addModalOpen      = ref(false)
const usernameInput     = ref('')
const lookingUp         = ref(false)
const lookupError       = ref('')
const modalInputFocused = ref(false)
const modalInputRef     = ref<HTMLInputElement | null>(null)

function closeModal() {
  addModalOpen.value  = false
  usernameInput.value = ''
  lookupError.value   = ''
}

async function lookupSkin() {
  const name = usernameInput.value.trim()
  if (!name || lookingUp.value) return
  lookingUp.value  = true
  lookupError.value = ''
  try {
    const profile = await window.api.players.lookup(name)
    if (!profile) { lookupError.value = t('locker.skins.notFound', { name }); return }
    if (!skins.value.some(s => s.uuid === profile.uuid)) {
      skins.value.push({
        uuid:     profile.uuid,
        username: profile.username,
        model:    profile.skinModel ?? 'default',
        skinUrl:  profile.skinUrl,
        capeUrl:  profile.capeUrl,
      })
      saveSkins()
    }
    closeModal()
  } catch {
    lookupError.value = t('locker.skins.lookupFailed')
  } finally {
    lookingUp.value = false
  }
}

// focus input when modal opens
import { watch } from 'vue'
watch(activeTab, async (tab) => {
  if (tab === 'Capes' && ownedCapes.value.length === 0 && !capesLoading.value) {
    await loadOwnedCapes()
  }
  if (tab === 'Cosmetics' && !cosmeticsLoading.value) {
    await loadCosmetics()
  }
})
watch(addModalOpen, async (v) => {
  if (v) { await nextTick(); modalInputRef.value?.focus() }
})

onMounted(() => {
  loadSkins()
  selectedUuid.value = account.value?.uuid ?? null
  if (account.value?.skinUrl) {
    const savedCapeUrl = loadLocalCapeUrl()
    lockerStore.selectSkin({
      skinUrl: account.value.skinUrl,
      capeUrl: savedCapeUrl ?? account.value.capeUrl,
      model:   account.value.skinModel ?? 'default',
    })
  }
})
</script>

<style lang="scss" scoped>
@font-face {
  font-family: 'Mojangles';
  src: url('../assets/fonts/mojangles.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

// ── Page shell ────────────────────────────────────────────────────────────────
.locker-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 12px;
  overflow: hidden;
  background-image: url('../assets/maze-bg.jpg');
  background-size: cover;
  background-position: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.82);
    pointer-events: none;
  }
  > * { position: relative; z-index: 1; }
}

// ── Tab row ───────────────────────────────────────────────────────────────────
.tab-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tab-btn {
  padding: 8px 22px;
  background: #0d0d0d;
  border: 1px solid #555;
  color: #aaa;
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 80ms, color 80ms, border-color 80ms;
  border-radius: 0;

  &:hover { background: #1a1a1a; color: #ccc; border-color: #888; }

  &.active {
    background: #111;
    color: #d0d0d0;
    border-color: #888;
    box-shadow: inset 0 -2px 0 #888;
  }
}

// ── Search bar ────────────────────────────────────────────────────────────────
.search-bar {
  display: flex;
  align-items: center;
  background: #0d0d0d;
  border: 1px solid #3a3a3a;
  height: 36px;
  padding: 0 10px;
  flex-shrink: 0;
  max-width: 360px;
  gap: 8px;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #aaa;
  letter-spacing: 0.03em;
  &::placeholder { color: #555; }
}

.search-icon {
  width: 16px;
  height: 16px;
  opacity: 0.5;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

// ── Skin grid ─────────────────────────────────────────────────────────────────
.skin-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  align-content: flex-start;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #333; }
}

// ── Base card ─────────────────────────────────────────────────────────────────
@property --sc-angle {
  syntax: '<angle>';
  initial-value: 45deg;
  inherits: false;
}

.skin-card {
  width: 320px;
  height: 460px;
  border: 1px solid transparent;
  background-image:
    linear-gradient(#111, #111),
    conic-gradient(
      from var(--sc-angle),
      rgba(255,255,255,.04) 0%,
      rgba(255,255,255,.55) 18%,
      rgba(255,255,255,.04) 36%,
      rgba(255,255,255,.04) 100%
    );
  background-origin: border-box;
  background-clip: padding-box, border-box;
  transition: --sc-angle 600ms cubic-bezier(.2,0,0,1), transform 400ms cubic-bezier(.2,0,0,1), box-shadow 400ms cubic-bezier(.2,0,0,1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;

  &:hover {
    --sc-angle: 135deg;
    transform: perspective(900px) rotateY(-7deg) rotateX(4deg) translateZ(6px);
    box-shadow: 8px 16px 40px rgba(0,0,0,0.7);
  }

  &--active {
    --sc-angle: 135deg;
    transform: perspective(900px) rotateY(-4deg) rotateX(2deg) translateZ(3px);
    box-shadow: 6px 12px 30px rgba(0,0,0,0.6);
    background-image:
      linear-gradient(#151515, #151515),
      conic-gradient(
        from var(--sc-angle),
        rgba(255,255,255,.08) 0%,
        rgba(255,255,255,.75) 18%,
        rgba(255,255,255,.08) 36%,
        rgba(255,255,255,.08) 100%
      );
  }

  &--add {
    justify-content: center;
    background-image:
      linear-gradient(#0d0d0d, #0d0d0d),
      conic-gradient(
        from var(--sc-angle),
        rgba(255,255,255,.02) 0%,
        rgba(255,255,255,.35) 18%,
        rgba(255,255,255,.02) 36%,
        rgba(255,255,255,.02) 100%
      );
    &:hover { --sc-angle: 135deg; }
  }
}

// ── Add card ghost bg ─────────────────────────────────────────────────────────
.add-card-ghost {
  position: absolute;
  inset: 0;
  filter: saturate(0.15);
  opacity: 0.22;
  pointer-events: none;
}

.add-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

// ── 3D viewer inside active card ──────────────────────────────────────────────
.skin-viewer-wrap {
  flex: 1;
  width: 100%;
  min-height: 0;
  transition: transform 400ms cubic-bezier(.2,0,0,1);
}

.skin-card:hover .skin-viewer-wrap {
  transform: perspective(700px) rotateY(-6deg) rotateX(3deg) scale(1.04);
}

.skin-card--active .skin-viewer-wrap {
  transform: perspective(700px) rotateY(-3deg) rotateX(2deg) scale(1.02);
}

// ── Add card innards ──────────────────────────────────────────────────────────
.add-icon-img {
  width: 32px;
  height: 32px;
  opacity: 0.4;
  filter: brightness(0) invert(1);
}

.add-title {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #777;
  text-align: center;
  letter-spacing: 0.03em;
}

.add-sub {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #444;
  text-align: center;
  letter-spacing: 0.02em;
  padding: 0 8px;
  line-height: 1.4;
}

// ── Skin card innards ─────────────────────────────────────────────────────────
.skin-del-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 22px;
  height: 22px;
  background: rgba(0,0,0,0.7);
  border: 1px solid #444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms, background 100ms;
  z-index: 2;
  img {
    width: 12px;
    height: 12px;
    filter: brightness(0) invert(1);
    opacity: 0.7;
  }
  &:hover { background: rgba(180,40,40,0.5); img { opacity: 1; } }
}
.skin-card:hover .skin-del-btn { opacity: 1; }

.skin-body-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 10px;
}

.skin-body-img {
  max-height: 148px;
  image-rendering: pixelated;
  display: block;
}

.skin-label-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 7px;
  background: rgba(0,0,0,0.5);
  flex-shrink: 0;
}

.skin-username {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.skin-model-tag {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #555;
  flex-shrink: 0;
  margin-left: 4px;
}

// ── Built-in cape badge ───────────────────────────────────────────────────────
.cape-builtin-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  font-family: 'Mojangles', monospace;
  font-size: 7px;
  letter-spacing: 0.1em;
  color: #fff;
  background: rgba(74,255,224,0.18);
  border: 1px solid rgba(74,255,224,0.55);
  padding: 2px 6px;
  pointer-events: none;
  z-index: 2;
}

// ── No-cape card ─────────────────────────────────────────────────────────────
.no-cape-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-cape-label {
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  color: #555;
  letter-spacing: 0.06em;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
    background: #444;
  }
}

// ── Cape display ─────────────────────────────────────────────────────────────
.cape-front-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 600px;
}

.cape-front {
  display: block;
  flex-shrink: 0;
  transform: rotateY(-22deg) rotateX(6deg);
  transform-origin: center center;
  transition: transform 400ms cubic-bezier(.2,0,0,1);
  filter:
    drop-shadow(4px 10px 20px rgba(0,0,0,0.85))
    drop-shadow(-2px 0px 6px rgba(0,0,0,0.5));
}

.skin-card:hover .cape-front {
  transform: rotateY(-10deg) rotateX(3deg);
}

.skin-card--active .cape-front {
  transform: rotateY(-10deg) rotateX(3deg);
}

// ── Cosmetics grid ────────────────────────────────────────────────────────────
.cosmetics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  align-content: flex-start;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #333; }
}

.cosmetic-card {
  width: 160px;
  height: 200px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: transform 250ms cubic-bezier(.2,0,0,1), box-shadow 250ms;

  &:hover { transform: translateY(-3px); }

  &--equipped {
    &::after {
      content: 'EQUIPPED';
      position: absolute;
      top: 6px;
      left: 6px;
      font-family: 'Mojangles', monospace;
      font-size: 7px;
      color: #fff;
      background: rgba(74,255,224,0.25);
      border: 1px solid rgba(74,255,224,0.6);
      padding: 2px 5px;
      letter-spacing: 0.08em;
      pointer-events: none;
    }
  }
}

.cosmetic-viewer {
  flex: 1;
  position: relative;
  min-height: 0;
}

.cosmetic-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 7px;
  background: rgba(0,0,0,0.55);
  flex-shrink: 0;
}

.cosmetic-name {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.cosmetic-rarity {
  font-family: 'Mojangles', monospace;
  font-size: 7px;
  flex-shrink: 0;
  margin-left: 4px;
  letter-spacing: 0.05em;
}

// ── Empty tabs ────────────────────────────────────────────────────────────────
.empty-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-tab-text {
  font-family: 'Mojangles', monospace;
  font-size: 12px;
  color: #444;
  letter-spacing: 0.04em;
}

// ── Add skin modal ────────────────────────────────────────────────────────────
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(3px);
}

.add-modal {
  background: #111;
  border: 1px solid #444;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 300px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.8);
}

.modal-title {
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  color: #ccc;
  margin: 0;
  letter-spacing: 0.04em;
}

.modal-input-wrap {
  display: flex;
  align-items: center;
  background: #0d0d0d;
  border: 1px solid #3a3a3a;
  height: 36px;
  padding: 0 10px;
  transition: border-color 100ms;
  &.focused { border-color: #777; }
}

.modal-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #ccc;
  &::placeholder { color: #444; }
}

.modal-error {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #c05050;
  margin: 0;
  letter-spacing: 0.03em;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 7px 18px;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid #444;
  letter-spacing: 0.04em;
  transition: background 80ms, border-color 80ms;
  display: flex;
  align-items: center;
  gap: 6px;

  &--cancel {
    background: #0d0d0d;
    color: #777;
    &:hover { background: #1a1a1a; color: #aaa; }
  }

  &--confirm {
    background: #222;
    color: #ccc;
    border-color: #666;
    &:hover:not(:disabled) { background: #2a2a2a; border-color: #999; }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
  }
}

.btn-spinner {
  width: 11px;
  height: 11px;
  border: 1.5px solid #444;
  border-top-color: #ccc;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

// ── Transitions ───────────────────────────────────────────────────────────────
.modal-enter-active { transition: opacity 150ms ease, transform 150ms ease; }
.modal-leave-active { transition: opacity 100ms ease; }
.modal-enter-from   { opacity: 0; transform: scale(0.97); }
.modal-leave-to     { opacity: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 150ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
