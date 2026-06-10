<template>
  <div class="profiles-page">

    <!-- Tabs -->
    <div class="tab-row">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- Search bar -->
    <div class="search-bar">
      <input v-model="search" class="search-input" placeholder="Search profile..." />
      <img :src="searchIcon" class="search-icon" alt="" />
    </div>

    <!-- Profile list -->
    <div class="profile-list">

      <!-- Not-yet-implemented tabs -->
      <div v-if="activeTab !== 'all'" class="coming-state">
        <span class="coming-icon">{{ tabIcon(activeTab) }}</span>
        <span class="coming-title">{{ tabTitle(activeTab) }}</span>
        <span class="coming-sub">{{ tabSub(activeTab) }}</span>
      </div>

      <template v-else-if="!filteredProfiles.length">
        <div class="empty-state">
          <span class="empty-text">No profiles</span>
          <button class="new-btn" @click="openWizard">+ New Profile</button>
        </div>
      </template>

      <template v-else>
        <div
          v-for="p in filteredProfiles"
          :key="p.id"
          class="profile-card"
          :class="{ 'profile-card--active': p.id === activeProfileId }"
          :style="{ '--loader-color': loaderColor(p.loader) }"
        >
          <!-- Left accent -->
          <div class="card-accent" />

          <!-- Profile image / loader icon -->
          <div
            class="card-icon"
            :class="{ 'card-icon--has-img': !!p.imageUrl }"
            :style="p.imageUrl ? {} : { background: loaderBg(p.loader), borderColor: `color-mix(in srgb, ${loaderColor(p.loader)} 20%, transparent)` }"
            @click.stop="triggerUpload(p.id)"
            title="Change image"
          >
            <img v-if="p.imageUrl" :src="p.imageUrl" class="profile-img" :alt="p.name" />
            <img v-else-if="loaderIconUrl(p.loader)" :src="loaderIconUrl(p.loader)!" class="loader-svg" :alt="p.loader" />
            <component v-else :is="IconVanilla" class="loader-svg" />

            <!-- Upload overlay -->
            <div class="icon-overlay">
              <svg class="icon-overlay-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>

            <!-- Remove image button -->
            <button
              v-if="p.imageUrl"
              class="icon-remove-btn"
              title="Remove image"
              @click.stop="removeImage(p.id)"
            >✕</button>
          </div>

          <!-- Info -->
          <div class="card-info">
            <div class="card-name-row">
              <span class="card-name">{{ p.name }}</span>
              <span v-if="p.id === activeProfileId" class="badge badge--active">ACTIVE</span>
              <span v-if="p.useBejaClient" class="badge badge--bjc">BJC</span>
            </div>
            <div class="card-meta">
              <span class="meta-version">{{ p.version }}</span>
              <span class="meta-dot" />
              <span class="meta-loader" :style="{ color: loaderColor(p.loader) }">{{ p.loader.toUpperCase() }}</span>
              <template v-if="p.lastPlayed">
                <span class="meta-dot" />
                <span class="meta-played">{{ formatPlayed(p.lastPlayed) }}</span>
              </template>
            </div>
          </div>

          <!-- Playtime -->
          <div class="card-playtime">
            <span class="playtime-num">{{ formatPlaytime(p.playtimeMs) }}</span>
            <span class="playtime-lbl">PLAYED</span>
          </div>

          <!-- RAM -->
          <div class="card-ram">
            <span class="ram-num">{{ p.maxRam }}G</span>
            <span class="ram-lbl">RAM</span>
          </div>

          <!-- Actions -->
          <div class="card-actions">
            <button
              class="btn-select"
              :class="{ 'btn-select--on': p.id === activeProfileId }"
              @click="selectProfile(p.id)"
            >{{ p.id === activeProfileId ? 'SELECTED' : 'SELECT' }}</button>
            <button class="btn-delete" @click="deleteProfile(p.id)" title="Delete">✕</button>
          </div>
        </div>

        <!-- New profile row -->
        <div class="new-card" @click="openWizard">
          <span class="new-plus">+</span>
          <span class="new-label">New Profile</span>
        </div>
      </template>

    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      style="display: none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLauncherStore } from '../../store/launcherStore'
import type { LoaderType } from '../../types'
import searchIcon    from '../../assets/icons8-search-50.png'
import loaderFabric  from '../../assets/loaders/fabric.png'
import loaderForge   from '../../assets/loaders/forge.png'
import loaderQuilt   from '../../assets/loaders/quilt.webp'
import loaderNeoforge from '../../assets/loaders/neoforge.png'

const launcherStore   = useLauncherStore()
const activeTab       = ref('all')
const search          = ref('')
const activeProfileId = computed(() => launcherStore.activeProfile?.id ?? null)

const tabs = [
  { key: 'all',        label: 'All'        },
  { key: 'featured',   label: 'Featured'   },
  { key: 'per-server', label: 'per server' },
  { key: 'bjc',        label: 'BJC'        },
]

const filteredProfiles = computed(() => {
  if (activeTab.value !== 'all') return []
  let list = launcherStore.profiles
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.version.includes(q))
  return list
})

function tabIcon(key: string)  {
  return { featured: '★', 'per-server': '⬡', bjc: '◈' }[key] ?? ''
}
function tabTitle(key: string) {
  return { featured: 'Featured Profiles', 'per-server': 'Server Profiles', bjc: 'BejaClient Profiles' }[key] ?? ''
}
function tabSub(key: string) {
  return {
    featured:    'Curated profile of the month — coming soon',
    'per-server':'Server-specific profiles (Hypixel, Donut SMP…) — coming soon',
    bjc:         'Pre-installed BejaClient profiles — coming soon',
  }[key] ?? ''
}

function openWizard()            { launcherStore.wizardOpen = true }
async function selectProfile(id: string) { await launcherStore.setActiveProfile(id) }
async function deleteProfile(id: string) { await launcherStore.deleteProfile(id) }

// ── Profile image upload ──────────────────────────────────────────────────────
const fileInputRef   = ref<HTMLInputElement | null>(null)
let   pendingUploadId = ''

function triggerUpload(id: string) {
  pendingUploadId = id
  fileInputRef.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !pendingUploadId) return
  try {
    const dataUrl = await resizeImage(file, 128)
    await launcherStore.updateProfile(pendingUploadId, { imageUrl: dataUrl })
  } catch { /* non-fatal */ }
  ;(e.target as HTMLInputElement).value = ''
  pendingUploadId = ''
}

async function removeImage(id: string) {
  await launcherStore.updateProfile(id, { imageUrl: null })
}

function resizeImage(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width  * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/png', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Loader theming ────────────────────────────────────────────────────────────
const LOADER_COLORS: Record<string, string> = {
  vanilla:  '#4ade80',
  fabric:   '#c9a96e',
  forge:    '#f97316',
  neoforge: '#e879f9',
  quilt:    '#818cf8',
}
function loaderColor(l: string) { return LOADER_COLORS[l] ?? '#888' }
function loaderBg(l: string)    { return `${loaderColor(l)}12` }

// ── Loader icons ──────────────────────────────────────────────────────────────

const LOADER_ICON_URLS: Record<string, string> = {
  fabric:   loaderFabric,
  forge:    loaderForge,
  quilt:    loaderQuilt,
  neoforge: loaderNeoforge,
}

function loaderIconUrl(loader: string): string | null {
  return LOADER_ICON_URLS[loader] ?? null
}

// Vanilla fallback: pixelated grassblock SVG (no image provided)
import { h } from 'vue'
const IconVanilla = {
  render() {
    return h('svg', { viewBox: '0 0 32 32', fill: 'none' }, [
      h('rect', { x: 0, y: 0, width: 32, height: 12, fill: '#7ec850' }),
      h('rect', { x: 0, y: 10, width: 4, height: 5, fill: '#6abf46' }),
      h('rect', { x: 5, y: 9,  width: 3, height: 6, fill: '#6abf46' }),
      h('rect', { x: 9, y: 10, width: 4, height: 5, fill: '#6abf46' }),
      h('rect', { x: 14,y: 9,  width: 3, height: 6, fill: '#6abf46' }),
      h('rect', { x: 18,y: 10, width: 4, height: 5, fill: '#6abf46' }),
      h('rect', { x: 23,y: 9,  width: 3, height: 6, fill: '#6abf46' }),
      h('rect', { x: 27,y: 10, width: 5, height: 5, fill: '#6abf46' }),
      h('rect', { x: 0, y: 14, width: 32, height: 18, fill: '#9b6534' }),
      h('rect', { x: 3,  y: 17, width: 4, height: 3, fill: '#7d4e28', opacity: '0.65' }),
      h('rect', { x: 11, y: 22, width: 5, height: 3, fill: '#7d4e28', opacity: '0.65' }),
      h('rect', { x: 20, y: 19, width: 4, height: 4, fill: '#7d4e28', opacity: '0.65' }),
      h('rect', { x: 25, y: 25, width: 4, height: 3, fill: '#7d4e28', opacity: '0.65' }),
      h('rect', { x: 6,  y: 26, width: 3, height: 3, fill: '#7d4e28', opacity: '0.65' }),
    ])
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPlayed(iso: string): string {
  const d    = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 7)  return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}

function formatPlaytime(ms: number): string {
  if (!ms) return '0h'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h >= 1 ? `${h}h ${m}m` : `${m}m`
}
</script>

<style lang="scss" scoped>
@font-face {
  font-family: 'Mojangles';
  src: url('../../assets/fonts/mojangles.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.profiles-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 8px;
  overflow: hidden;
  background-image: url('../../assets/maze-bg.jpg');
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

// ── Tabs ──────────────────────────────────────────────────────────────────────
.tab-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tab-btn {
  padding: 8px 22px;
  background: #0d0d0d;
  border: 1px solid rgba(137, 137, 137, 0.61);
  color: #aaa;
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 80ms, color 80ms, border-color 80ms;
  border-radius: 0;

  &:hover { background: #1a1a1a; color: #ccc; border-color: rgba(180,180,180,0.61); }
  &.active {
    background: #111;
    color: #d9d9d9;
    border-color: rgba(255, 255, 255, 0.61);
    box-shadow: inset 0 -2px 0 rgba(255,255,255,0.3);
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
.search-bar {
  display: flex;
  align-items: center;
  background: #0a0a0b;
  border: 1px solid rgba(118, 119, 120, 0.61);
  height: 36px;
  padding: 0 10px;
  gap: 8px;
  flex-shrink: 0;
  max-width: 400px;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #cbcbcb;
  letter-spacing: 0.03em;
  &::placeholder { color: #cbcbcb; }
}

.search-icon {
  width: 14px;
  height: 14px;
  opacity: 0.5;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

// ── List ──────────────────────────────────────────────────────────────────────
.profile-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
  scrollbar-color: #282828 transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #282828; }
}

// ── Coming soon ───────────────────────────────────────────────────────────────
.coming-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.coming-icon {
  font-size: 28px;
  color: #2a2a2a;
  line-height: 1;
}

.coming-title {
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  color: #3a3a3a;
  letter-spacing: 0.06em;
}

.coming-sub {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #282828;
  letter-spacing: 0.04em;
  text-align: center;
  max-width: 300px;
  line-height: 1.6;
}

// ── Empty ─────────────────────────────────────────────────────────────────────
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.empty-text {
  font-family: 'Mojangles', monospace;
  font-size: 12px;
  color: #333;
  letter-spacing: 0.12em;
}

.new-btn {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #888;
  background: #0d0d0d;
  border: 1px solid rgba(137,137,137,0.5);
  padding: 8px 20px;
  cursor: pointer;
  letter-spacing: 0.06em;
  border-radius: 0;
  transition: background 80ms, border-color 80ms, color 80ms;
  &:hover { background: #1a1a1a; border-color: rgba(255,255,255,0.4); color: #ccc; }
}

// ── Profile card ──────────────────────────────────────────────────────────────
.profile-card {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(8, 8, 10, 0.78);
  border: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  transition: border-color 120ms, background 120ms;

  &:hover {
    background: rgba(14, 14, 18, 0.88);
    border-color: rgba(255,255,255,0.1);

    .card-accent  { opacity: 1; }
    .card-icon    { opacity: 1; }
    .loader-svg   { transform: scale(1.08); }
    .card-name    { color: #fff; }
    .icon-overlay { opacity: 1; }
    .icon-remove-btn { opacity: 1; }
  }

  &--active {
    border-color: color-mix(in srgb, var(--loader-color) 30%, transparent);
    background: rgba(12, 12, 16, 0.9);

    .card-accent { opacity: 1; width: 3px; }
  }
}

// left accent stripe
.card-accent {
  width: 2px;
  align-self: stretch;
  flex-shrink: 0;
  background: var(--loader-color);
  opacity: 0;
  transition: opacity 120ms, width 120ms;
  box-shadow: 0 0 12px 0 var(--loader-color);
}

// profile image / loader icon box
.card-icon {
  width: 62px;
  height: 62px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 16px 10px 14px;
  border: 1px solid color-mix(in srgb, var(--loader-color) 20%, transparent);
  opacity: 0.8;
  transition: opacity 120ms;
  cursor: pointer;
  position: relative;
  overflow: visible;

  &--has-img {
    border-color: rgba(255,255,255,0.1);
    background: transparent !important;
  }
}

.profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  image-rendering: pixelated;
}

.loader-svg {
  width: 114px;
  height: 114px;
  display: block;
  transition: transform 150ms cubic-bezier(0.2, 0, 0, 1);
  object-fit: contain;
  flex-shrink: 0;
}

// upload hover overlay
.icon-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 120ms;
}

.icon-overlay-svg {
  width: 20px;
  height: 20px;
  color: rgba(255,255,255,0.75);
}

// remove image button (top-right corner of icon)
.icon-remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: rgba(0,0,0,0.8);
  border: none;
  color: #aaa;
  font-size: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms, color 80ms;
  z-index: 2;
  padding: 0;
  line-height: 1;

  &:hover { color: #ff6666; }
}

// info block
.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-name {
  font-family: 'Mojangles', monospace;
  font-size: 14px;
  color: #d9d9d9;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 120ms;
}

.badge {
  font-family: 'Mojangles', monospace;
  font-size: 7px;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  flex-shrink: 0;
  border: 1px solid;

  &--active {
    color: #d9d9d9;
    border-color: rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.05);
  }

  &--bjc {
    color: #f97316;
    border-color: rgba(249,115,22,0.35);
    background: rgba(249,115,22,0.06);
  }
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-version {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #555;
  letter-spacing: 0.03em;
}

.meta-dot {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #333;
  flex-shrink: 0;
}

.meta-loader {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  letter-spacing: 0.06em;
  transition: color 120ms;
}

.meta-played {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #3a3a3a;
  letter-spacing: 0.02em;
}

// stat columns
.card-playtime,
.card-ram {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  padding-right: 20px;
}

.playtime-num,
.ram-num {
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  color: #4a4a4a;
  letter-spacing: 0.02em;
}

.playtime-lbl,
.ram-lbl {
  font-family: 'Mojangles', monospace;
  font-size: 7px;
  color: #2a2a2a;
  letter-spacing: 0.1em;
}

// actions
.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 16px;
  flex-shrink: 0;
}

.btn-select {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  letter-spacing: 0.07em;
  padding: 7px 16px;
  background: #0d0d0d;
  color: #777;
  border: 1px solid rgba(255,255,255,0.14);
  cursor: pointer;
  border-radius: 0;
  transition: background 80ms, border-color 80ms, color 80ms, box-shadow 80ms;

  &:hover {
    background: #1a1a1a;
    border-color: rgba(255,255,255,0.4);
    color: #ddd;
  }

  &--on {
    color: #d9d9d9;
    border-color: var(--loader-color);
    background: color-mix(in srgb, var(--loader-color) 8%, #0d0d0d);
    box-shadow: 0 0 10px 0 color-mix(in srgb, var(--loader-color) 25%, transparent);

    &:hover {
      background: color-mix(in srgb, var(--loader-color) 12%, #0d0d0d);
    }
  }
}

.btn-delete {
  background: transparent;
  border: 1px solid transparent;
  color: #2a2a2a;
  font-size: 10px;
  padding: 7px 9px;
  cursor: pointer;
  transition: color 80ms, border-color 80ms;

  &:hover { color: #666; border-color: rgba(255,255,255,0.12); }
}

// ── New profile row ───────────────────────────────────────────────────────────
.new-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: transparent;
  border: 1px dashed rgba(255,255,255,0.05);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 80ms, background 80ms;

  &:hover {
    border-color: rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.015);
    .new-plus, .new-label { color: #666; }
  }
}

.new-plus {
  width: 62px;
  text-align: center;
  font-family: 'Mojangles', monospace;
  font-size: 20px;
  color: #2a2a2a;
  transition: color 80ms;
  margin: 0 16px 0 14px;
}

.new-label {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #2a2a2a;
  letter-spacing: 0.06em;
  transition: color 80ms;
}
</style>
