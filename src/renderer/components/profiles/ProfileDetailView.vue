<template>
  <div class="profile-detail">
    <!-- Back -->
    <button class="back-btn" @click="$emit('back')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>

    <!-- Header ─────────────────────────────────────────────── -->
    <div class="detail-header">
      <div class="profile-thumb" title="Click to change image" @click="pickImage">
        <img v-if="localImageUrl" :src="localImageUrl" class="thumb-img" />
        <img v-else :src="iconBlocks" class="thumb-placeholder" />
        <div class="thumb-hover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      </div>
      <input ref="imageInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" @change="onImageSelected" />

      <div class="profile-info">
        <div class="profile-name">„{{ profile.name }}"</div>
        <div class="profile-meta">
          <span class="meta-primary">„{{ profile.loader }}" „{{ profile.version }}"</span>
          <span class="meta-sep" />
          <span class="meta-secondary">{{ playtimeLabel }}</span>
        </div>
      </div>

      <div class="header-actions">
        <button
          class="launch-btn"
          :disabled="store.isLaunching || store.isRunning"
          @click="launchProfile"
        >
          LAUNCH
          <img :src="iconPlay" class="launch-icon" />
        </button>
        <button class="action-sq-btn" title="Profile settings" @click="$emit('settings', profile.id)">
          <img :src="iconSettings" class="sq-icon" />
        </button>
        <div class="dots-btn-wrap" ref="dotsWrapRef">
          <button class="action-sq-btn dots-btn" @click="menuOpen = !menuOpen">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </button>
          <Transition name="menu-pop">
            <div v-if="menuOpen" class="context-menu">
              <button class="ctx-item" @click="openProfileFolder">Open folder</button>
              <button class="ctx-item" @click="exportPack">Export pack</button>
              <button class="ctx-item ctx-item--danger" @click="requestDelete">Delete profile</button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div class="detail-divider" />

    <!-- Content tabs ────────────────────────────────────────── -->
    <div class="content-tabs">
      <button class="content-tab active">
        CONTENT
        <img :src="iconPuzzle" class="tab-icon" />
      </button>
    </div>

    <!-- Controls Row: Search + Browse content + Upload files ── -->
    <div class="controls-row">
      <div class="search-bar">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          class="search-input"
          :placeholder="`Search ${mods.length} projects...`"
        />
      </div>

      <div class="action-buttons">
        <button class="browse-content-btn" @click="browseMods">
          <svg class="btn-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          BROWSE CONTENT
        </button>
        <button class="upload-files-btn" @click="importMod">
          <svg class="btn-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          UPLOAD FILES
        </button>
      </div>
    </div>

    <!-- Mods area ───────────────────────────────────────────── -->
    <div class="mods-area">
      <div v-if="modsLoading" class="mods-spinner">
        <div class="spinner" />
      </div>

      <template v-else-if="mods.length === 0">
        <div class="empty-state">
          <img :src="iconNotFound" class="empty-icon" />
          <p class="empty-text">No content installed yet...</p>
          <div class="empty-actions">
            <button class="import-btn" @click="importMod">
              <img :src="iconFile" class="btn-icon" />
              Import
            </button>
            <button class="browse-btn" @click="browseMods">
              Browse
              <img :src="iconModrinth" class="btn-icon btn-icon--modrinth" />
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="filteredMods.length === 0" class="no-results-state">
          <p class="empty-text">No mods match your search...</p>
        </div>
        <div v-else class="mods-list">
          <div
            v-for="mod in filteredMods"
            :key="mod.id"
            class="mod-row"
          >
            <div class="mod-icon-wrap">
              <img v-if="mod.iconDataUrl" :src="mod.iconDataUrl" class="mod-icon" :alt="mod.name" />
              <div v-else class="mod-icon-fallback">{{ mod.name[0] }}</div>
            </div>

            <div class="mod-info">
              <div class="mod-name-row">
                <span class="mod-name" :class="{ 'mod-name--disabled': !mod.enabled }">{{ mod.name }}</span>
                <span class="mod-stat">{{ formatSize(mod.fileSize) }}</span>
              </div>
              <p class="mod-desc">{{ mod.fileName }}</p>
            </div>

            <div class="mod-actions-cell">
              <!-- Switch Toggle -->
              <div
                class="toggle"
                :class="{ 'toggle--on': mod.enabled }"
                title="Enable/Disable mod"
                @click.stop="toggleMod(mod.id)"
              />
              
              <!-- Trash icon button -->
              <button class="delete-icon-btn" title="Remove" @click.stop="deleteMod(mod.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useLauncherStore } from '../../store/launcherStore'
import type { LaunchProfile, ModInfo } from '../../types'

import iconBlocks   from '../../assets/icons8-blocks-middle.png'
import iconPlay     from '../../assets/icons8-spielen-64.png'
import iconSettings from '../../assets/icons8-settings-50.png'
import iconPuzzle   from '../../assets/icons8-puzzle-64.png'
import iconNotFound from '../../assets/icons8-not-found-50.png'
import iconFile     from '../../assets/icons8-file-64.png'
import iconModrinth from '../../assets/modrinth.png'
import iconRemove   from '../../assets/icons8-remove-24.png'

const props = defineProps<{ profile: LaunchProfile }>()
const emit  = defineEmits<{
  back: []
  settings: [id: string]
  deleted: [id: string]
}>()

const store = useLauncherStore()
const router = useRouter()

const localImageUrl  = ref<string | null>(props.profile.imageUrl ?? null)
const imageInputRef  = ref<HTMLInputElement | null>(null)

function pickImage() { imageInputRef.value?.click() }

async function onImageSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  const resized = await resizeImage(file, 128)
  localImageUrl.value = resized
  await store.updateProfile(props.profile.id, { imageUrl: resized })
}

function resizeImage(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/png', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

const mods       = ref<ModInfo[]>([])
const modsLoading = ref(false)
const menuOpen   = ref(false)
const dotsWrapRef = ref<HTMLElement | null>(null)

const searchQuery = ref('')

const filteredMods = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return mods.value.filter(mod => {
    return !q || mod.name.toLowerCase().includes(q) || mod.fileName.toLowerCase().includes(q)
  })
})

const playtimeLabel = computed(() => {
  const ms = props.profile.playtimeMs ?? 0
  if (ms === 0) return 'never played'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m played` : `${m}m played`
})

function formatSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024)    return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

async function loadMods(): Promise<void> {
  modsLoading.value = true
  try {
    mods.value = await window.api.mods.list(props.profile.id)
  } finally {
    modsLoading.value = false
  }
}

async function launchProfile(): Promise<void> {
  await store.setActiveProfile(props.profile.id)
  await store.launch()
}

async function toggleMod(modId: string): Promise<void> {
  mods.value = await window.api.mods.toggle(props.profile.id, modId)
}

async function deleteMod(modId: string): Promise<void> {
  mods.value = await window.api.mods.delete(props.profile.id, modId)
}

async function importMod(): Promise<void> {
  mods.value = await window.api.mods.install(props.profile.id)
}

function browseMods(): void {
  menuOpen.value = false
  router.push('/mods')
}

async function openProfileFolder(): Promise<void> {
  menuOpen.value = false
  await window.api.mods.openFolder(props.profile.id)
}

async function exportPack(): Promise<void> {
  menuOpen.value = false
  await window.api.profiles.exportPack(props.profile.id)
}

function requestDelete(): void {
  menuOpen.value = false
  emit('deleted', props.profile.id)
}

function onClickOutside(e: MouseEvent): void {
  if (dotsWrapRef.value && !dotsWrapRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  loadMods()
  document.addEventListener('mousedown', onClickOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
onActivated(() => {
  loadMods()
})
</script>

<style lang="scss" scoped>
.profile-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

// ── Back ──────────────────────────────────────────────────────────────────────
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: $muted;
  font-size: 12px;
  cursor: pointer;
  padding: 0 0 10px;
  transition: color $transition;

  &:hover { color: $text-primary; }
}

// ── Header ────────────────────────────────────────────────────────────────────
.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.profile-thumb {
  width: 72px;
  height: 72px;
  background: #1c2127;
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  cursor: pointer;

  &:hover .thumb-hover { opacity: 1; }
}

.thumb-hover {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 150ms;
  color: rgba(255, 255, 255, 0.8);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-family: 'Mojangles', monospace;
  font-size: 14px;
  color: #fff;
  margin-bottom: 4px;
}

.profile-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-primary {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #8f8f8f;
}

.meta-sep {
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.12);
}

.meta-secondary {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #959595;
}

// ── Header actions ────────────────────────────────────────────────────────────
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.launch-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1c2127;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  color: #fff;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  padding: 9px 16px;
  cursor: pointer;
  transition: background $transition, border-color $transition, opacity $transition;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.75);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.launch-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.action-sq-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: #1c2127;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  cursor: pointer;
  transition: background $transition, border-color $transition;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.35);
  }
}

.sq-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.8;
}

.dots-btn-wrap {
  position: relative;
}

.dots-btn {
  gap: 3px;
  width: 48px;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

// ── Context menu ──────────────────────────────────────────────────────────────
.context-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: #1c2127;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  overflow: hidden;
  z-index: 100;
  min-width: 140px;
  box-shadow: $shadow-lg;
}

.ctx-item {
  display: block;
  width: 100%;
  padding: 9px 14px;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 12px;
  color: $text-primary;
  cursor: pointer;
  transition: background $transition;

  &:hover { background: rgba(255, 255, 255, 0.07); }

  &--danger {
    color: $error;
    &:hover { background: rgba(224, 80, 80, 0.1); }
  }
}

.menu-pop-enter-active,
.menu-pop-leave-active { transition: opacity 120ms ease, transform 120ms ease; }
.menu-pop-enter-from,
.menu-pop-leave-to { opacity: 0; transform: translateY(-4px); }

// ── Divider ───────────────────────────────────────────────────────────────────
.detail-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 14px 0;
  flex-shrink: 0;
}

// ── Content tabs ──────────────────────────────────────────────
.content-tabs {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 14px;
}

.content-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(48, 57, 68, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  color: #939393;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: background $transition, color $transition, border-color $transition;

  &.active {
    background: rgba(48, 57, 68, 0.9);
    border-color: rgba(255, 255, 255, 0.28);
    color: $text-primary;
  }

  &:hover:not(.active) {
    background: rgba(48, 57, 68, 0.8);
    color: $text-secondary;
  }
}

.tab-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: brightness(0) invert(0.6);
}

.content-tab.active .tab-icon {
  filter: brightness(0) invert(0.85);
}

// ── Controls Row ──────────────────────────────────────────────
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #111;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  height: 36px;
  padding: 0 12px;
  flex: 1;
  max-width: 480px;
  gap: 8px;
  transition: border-color $transition;

  &:focus-within {
    border-color: rgba(255, 255, 255, 0.32);
  }
}

.search-icon {
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #fff;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.browse-content-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1c2127;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  color: #46d66d;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  padding: 0 14px;
  height: 36px;
  cursor: pointer;
  transition: background $transition, border-color $transition, color $transition;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(70, 214, 109, 0.4);
  }
}

.upload-files-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1c2127;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  color: #ccc;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  padding: 0 14px;
  height: 36px;
  cursor: pointer;
  transition: background $transition, border-color $transition;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.35);
  }
}

.btn-svg {
  flex-shrink: 0;
}

// ── Mods area ─────────────────────────────────────────────────────────────────
.mods-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

// ── Empty state ───────────────────────────────────────────────────────────────
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  height: 100%;
}

.empty-icon {
  width: 60px;
  height: 60px;
  object-fit: contain;
  opacity: 0.55;
  filter: grayscale(1);
}

.empty-text {
  font-style: italic;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Inter', system-ui, sans-serif;
}

.empty-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: rgba(102, 102, 102, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  color: #d6d6d6;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: background $transition, border-color $transition;

  &:hover {
    background: rgba(102, 102, 102, 0.45);
    border-color: rgba(255, 255, 255, 0.32);
  }
}

.browse-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  color: #46d66d;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: background $transition, border-color $transition;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(70, 214, 109, 0.4);
  }
}

.btn-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: brightness(0) invert(0.85);

  &--modrinth {
    filter: none;
  }
}

// ── Mods list — same style as explore tab ─────────────────────────────────────
.mods-list {
  display: flex;
  flex-direction: column;
}

.mod-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 18px;
  background: rgba(10, 10, 11, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 80ms, border-color 80ms;
  flex-shrink: 0;

  &:hover { background: rgba(20, 20, 22, 0.85); border-color: rgba(255, 255, 255, 0.09); }
}

.mod-icon-wrap { width: 72px; height: 72px; flex-shrink: 0; }

.mod-icon {
  width: 72px;
  height: 72px;
  object-fit: cover;
  image-rendering: pixelated;
  display: block;
}

.mod-icon-fallback {
  width: 72px;
  height: 72px;
  background: #1a1a1a;
  border: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Mojangles', monospace;
  font-size: 26px;
  color: #555;
  text-transform: uppercase;
}

.mod-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mod-name-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.mod-name {
  font-family: 'Mojangles', monospace;
  font-size: 15px;
  color: #d9d9d9;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.mod-name--disabled {
  opacity: 0.5;
  color: #8f8f8f;
}

.mod-stat {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #555;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.mod-desc {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #666;
  letter-spacing: 0.02em;
  line-height: 1.6;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// ── Mod Actions & Toggle ──────────────────────────────────────
.mod-actions-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.delete-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.toggle {
  width: 36px;
  height: 20px;
  background: #1e2124;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    background: #555;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 150ms cubic-bezier(0.2,0,0,1), background 150ms;
  }

  &--on {
    background: color-mix(in srgb, #1bd96a 18%, #111);
    border-color: color-mix(in srgb, #1bd96a 60%, transparent);

    &::after {
      background: #1bd96a;
      transform: translateX(16px);
    }
  }
}

.no-results-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  height: 100%;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
.mods-spinner {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
