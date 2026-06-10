<template>
  <Teleport to="body">
    <Transition name="wizard-fade">
      <div v-if="store.wizardOpen" class="wizard-overlay" @click.self="maybeClose">
        <div class="wizard-modal">
        <!-- Wallpaper bg -->
        <div class="wizard-bg" />

        <!-- Close -->
        <button class="wizard-close-btn" :disabled="installing" @click="maybeClose">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Step bar -->
        <div class="wizard-stepbar">
          <div v-for="(s, i) in STEPS" :key="i" class="stepbar-item">
            <div class="step-circle" :class="{ active: step === i, done: step > i }">
              <img :src="s.icon" :alt="s.label" class="step-icon" />
            </div>
            <div v-if="i < STEPS.length - 1" class="step-line" :class="{ filled: step > i }" />
          </div>
        </div>

        <!-- ── Step 0: Name / Info ── -->
        <div v-if="step === 0 && !installing && !done" class="wizard-content">
          <div class="wiz-field-block">
            <div class="wiz-field-label-row">
              <img :src="iconName" class="field-icon" alt="" />
              <span class="field-label">Name:</span>
            </div>
            <div class="wiz-input-wrap">
              <input
                v-model="name"
                class="wiz-input"
                placeholder="My Instance"
                maxlength="32"
                autofocus
                @keydown.enter="name.trim() && step++"
              />
              <span class="input-counter">{{ name.length }}/32</span>
            </div>
          </div>

          <div class="wiz-field-block">
            <div class="wiz-field-label-row">
              <img :src="iconDesc" class="field-icon" alt="" />
              <span class="field-label">Describe it!</span>
            </div>
            <div class="wiz-textarea-wrap">
              <textarea
                v-model="description"
                class="wiz-textarea"
                placeholder="What's special about this instance…"
                maxlength="400"
                rows="4"
              />
              <span class="textarea-counter">{{ description.length }}/400</span>
            </div>
          </div>

          <div class="wiz-nav">
            <button class="wiz-btn-primary" :disabled="!name.trim()" @click="step++">
              Next
            </button>
          </div>
        </div>

        <!-- ── Step 1: Version ── -->
        <div v-if="step === 1 && !installing && !done" class="wizard-content">
          <div class="wiz-section-title">Minecraft Version</div>
          <div class="wiz-filter-row">
            <input v-model="versionSearch" class="wiz-input" placeholder="Search versions…" />
          </div>
          <div v-if="loadingVersions" class="wiz-loading">Loading versions…</div>
          <div v-else class="version-list">
            <button
              v-for="v in filteredVersions"
              :key="v.id"
              class="version-item"
              :class="{ selected: selectedVersion === v.id, installed: installedIds.includes(v.id) }"
              @click="selectedVersion = v.id"
            >
              <span class="version-id">{{ v.id }}</span>
              <span class="version-type type-release">release</span>
              <span v-if="installedIds.includes(v.id)" class="version-installed">installed</span>
            </button>
            <div v-if="filteredVersions.length === 0" class="wiz-empty">No versions match.</div>
          </div>

          <div v-if="selectedVersion" class="fabric-status">
            <span v-if="loadingFabric" class="wiz-loading">Fetching Fabric version…</span>
            <span v-else-if="loaderVersion" class="fabric-ok">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Fabric {{ loaderVersion }}
            </span>
            <span v-else class="fabric-warn">No Fabric loader found for this version</span>
          </div>

          <div class="wiz-nav">
            <button class="wiz-btn-secondary" @click="step--">Back</button>
            <button class="wiz-btn-primary" :disabled="!selectedVersion || loadingFabric || !loaderVersion" @click="step++">Next</button>
          </div>
        </div>

        <!-- ── Step 2: Mods ── -->
        <div v-if="step === 2 && !installing && !done" class="wizard-content">
          <div class="wiz-section-title">Add Mods</div>
          <p class="wiz-section-sub">
            {{ selectedVersion }} · Fabric {{ loaderVersion }} — select mods to install. You can add more later.
          </p>

          <div class="mod-grid">
            <button
              v-for="m in FABRIC_MODS"
              :key="m.id"
              class="mod-card"
              :class="{ selected: selectedMods.has(m.id) }"
              @click="toggleMod(m.id)"
            >
              <div class="mod-card-top">
                <span class="mod-name">{{ m.name }}</span>
                <span v-if="selectedMods.has(m.id)" class="mod-check-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              </div>
              <span class="mod-desc">{{ m.desc }}</span>
              <span class="mod-category-badge">{{ m.category }}</span>
            </button>
          </div>

          <div v-if="selectedMods.size > 0" class="mods-selected-summary">
            {{ selectedMods.size }} mod{{ selectedMods.size !== 1 ? 's' : '' }} selected
          </div>

          <div v-if="createError" class="wiz-error">{{ createError }}</div>

          <div class="wiz-nav">
            <button class="wiz-btn-secondary" @click="step--">Back</button>
            <button class="wiz-btn-primary" @click="create">
              {{ isInstalled ? 'Create Instance' : 'Download &amp; Create' }}
            </button>
          </div>
        </div>

        <!-- ── Installing ── -->
        <div v-if="installing" class="wizard-content wizard-installing">
          <div class="install-spinner" />
          <p class="install-task">{{ installTask }}</p>
          <div class="install-bar-wrap">
            <div class="install-bar" :style="{ width: installPct + '%' }" />
          </div>
          <span class="install-pct">{{ installPct }}%</span>
        </div>

        <!-- ── Done ── -->
        <div v-if="done" class="wizard-content wizard-done">
          <div class="done-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2>Instance Created!</h2>
          <p>{{ name }} is ready to play.</p>
          <button class="wiz-btn-primary" @click="finish">Close</button>
        </div>

        </div><!-- /.wizard-modal -->
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLauncherStore } from '../../store/launcherStore'
import { useSettingsStore } from '../../store/settingsStore'
import type { FabricLoaderVersion } from '../../types'

import iconInfo   from '../../assets/wizard/icons8-info-50.png'
import iconBook   from '../../assets/wizard/icons8-buch-50.png'
import iconPuzzle from '../../assets/wizard/icons8-puzzle-64.png'
import iconName   from '../../assets/wizard/icons8-name-50.png'
import iconDesc   from '../../assets/wizard/icons8-table-of-content-50.png'

const store    = useLauncherStore()
const settings = useSettingsStore()

const STEPS = [
  { label: 'Info',    icon: iconInfo },
  { label: 'Version', icon: iconBook },
  { label: 'Mods',    icon: iconPuzzle },
]

interface CuratedMod { id: string; name: string; desc: string; category: string }
const FABRIC_MODS: CuratedMod[] = [
  { id: 'AANobbMI', name: 'Sodium',        desc: 'High-performance rendering engine.',      category: 'Performance' },
  { id: 'YL57xq9U', name: 'Iris',          desc: 'Shader support built on Sodium.',         category: 'Graphics'    },
  { id: 'gvQqBUqZ', name: 'Lithium',       desc: 'Game logic & server-side optimizations.', category: 'Performance' },
  { id: 'mOgUt4GM', name: 'Mod Menu',      desc: 'In-game mod list with config buttons.',   category: 'Utility'     },
  { id: 'uXXizFIs', name: 'FerriteCore',   desc: 'Reduces memory usage significantly.',     category: 'Performance' },
  { id: 'NNAgCjsB', name: 'EntityCulling', desc: 'Skip rendering hidden entities.',         category: 'Performance' },
  { id: '8shC1gFX', name: 'BetterF3',      desc: 'Colourful, customisable debug screen.',   category: 'Utility'     },
]

// BejaClient-supported MC versions (adapters exist for these)
const BEJA_EXACT = new Set(['1.16.5', '1.18.2', '1.19.4'])
function isBejaSupported(id: string): boolean {
  if (BEJA_EXACT.has(id)) return true
  const parts = id.split('.').map(Number)
  if (parts[0] === 1 && parts[1] === 20) {
    const patch = parts[2] ?? 0
    return patch >= 1 && patch <= 6
  }
  if (parts[0] === 1 && parts[1] >= 21) return true
  return false
}

// Step 0
const step        = ref(0)
const name        = ref('')
const description = ref('')

// Step 1 – version
const allVersions     = ref<{ id: string; type: string }[]>([])
const installedIds    = ref<string[]>([])
const loadingVersions = ref(false)
const versionSearch   = ref('')
const selectedVersion = ref('')

// Fabric loader (always used, auto-fetched)
const loaderVersion  = ref('')
const loadingFabric  = ref(false)

// Step 2 – Mods
const selectedMods = ref(new Set<string>())

// RAM (defaults from settings)
const minRam = ref(settings.settings.game.minRam)
const maxRam = ref(settings.settings.game.maxRam)

// Install / done state
const installing  = ref(false)
const installTask = ref('')
const installPct  = ref(0)
const done        = ref(false)
const createError = ref('')

const filteredVersions = computed(() =>
  allVersions.value
    .filter(v => v.type === 'release' && isBejaSupported(v.id))
    .filter(v => !versionSearch.value || v.id.includes(versionSearch.value))
)

const isInstalled = computed(() => installedIds.value.includes(selectedVersion.value))

// Auto-fetch stable Fabric version when MC version is selected
watch(selectedVersion, async (ver) => {
  loaderVersion.value = ''
  if (!ver) return
  loadingFabric.value = true
  try {
    const list: FabricLoaderVersion[] = await window.api.versions.listFabricVersions(ver)
    const stable = list.find(v => v.loader.stable)
    loaderVersion.value = (stable ?? list[0])?.loader.version ?? ''
  } catch {
    loaderVersion.value = ''
  } finally {
    loadingFabric.value = false
  }
})

watch(() => store.wizardOpen, async open => {
  if (!open) return
  reset()
  loadingVersions.value = true
  try {
    const [manifest, installed] = await Promise.all([
      window.api.versions.listRemote(),
      window.api.versions.listInstalled(),
    ])
    allVersions.value  = manifest.versions
    installedIds.value = installed
  } finally {
    loadingVersions.value = false
  }
})

watch(() => store.installProgress, p => {
  if (!p) return
  installTask.value = p.task
  installPct.value  = p.total > 0 ? Math.round((p.progress / p.total) * 100) : 0
})

function toggleMod(id: string) {
  if (selectedMods.value.has(id)) selectedMods.value.delete(id)
  else selectedMods.value.add(id)
  selectedMods.value = new Set(selectedMods.value)
}

async function create() {
  createError.value = ''
  installing.value  = true
  installTask.value = 'Preparing…'
  installPct.value  = 0
  try {
    if (!isInstalled.value) {
      await window.api.versions.install(selectedVersion.value, 'fabric', loaderVersion.value || undefined)
    }
    const profile = await store.createProfile({
      name:          name.value.trim(),
      version:       selectedVersion.value,
      loader:        'fabric',
      loaderVersion: loaderVersion.value,
      minRam:        minRam.value,
      maxRam:        maxRam.value,
      gameDir:       '',
      javaPath:      '',
      jvmArgs:       '',
      resolution:    { width: 854, height: 480 },
      useBejaClient: true,
    })
    const modsToInstall = [...selectedMods.value]
    for (let i = 0; i < modsToInstall.length; i++) {
      installTask.value = `Installing mods… (${i + 1}/${modsToInstall.length})`
      installPct.value  = Math.round(((i + 1) / modsToInstall.length) * 100)
      try { await window.api.modrinth.installMod(modsToInstall[i], profile.id) } catch { /* skip failed mods */ }
    }
    installing.value = false
    done.value = true
  } catch (e) {
    installing.value = false
    createError.value = String(e)
  }
}

function finish() { store.wizardOpen = false }

function maybeClose() {
  if (installing.value) return
  store.wizardOpen = false
}

function reset() {
  step.value            = 0
  name.value            = ''
  description.value     = ''
  selectedVersion.value = ''
  loaderVersion.value   = ''
  versionSearch.value   = ''
  selectedMods.value    = new Set()
  minRam.value          = settings.settings.game.minRam
  maxRam.value          = settings.settings.game.maxRam
  installing.value      = false
  done.value            = false
  createError.value     = ''
  installPct.value      = 0
}
</script>

<style lang="scss" scoped>
// ── Overlay (backdrop) ───────────────────────────────────────────────────────
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
}

.wizard-bg {
  position: absolute;
  inset: 0;
  background: url('../../assets/wizard/wp8990100-minecraft-logo-4k-wallpapers.jpg') center/cover no-repeat;
  opacity: 0.15;
  pointer-events: none;
  border-radius: inherit;
}

// ── Modal box ─────────────────────────────────────────────────────────────────
.wizard-modal {
  position: relative;
  width: 820px;
  max-width: 96vw;
  max-height: 88vh;
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// ── Close button ─────────────────────────────────────────────────────────────
.wizard-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 50%;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  transition: all 150ms;
  &:hover:not(:disabled) { background: rgba(255,255,255,0.12); color: #fff; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

// ── Step bar ──────────────────────────────────────────────────────────────────
.wizard-stepbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 0 24px;
  gap: 0;
}

.stepbar-item {
  display: flex;
  align-items: center;
}

.step-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 200ms;

  &.active {
    background: #fff;
    border-color: #fff;
    .step-icon { filter: invert(1); opacity: 1; }
  }
  &.done {
    background: rgba(52,199,89,0.15);
    border-color: rgba(52,199,89,0.6);
    .step-icon { filter: none; opacity: 0.9; }
  }
}

.step-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.35;
  transition: opacity 200ms, filter 200ms;
}

.step-line {
  width: 80px;
  height: 2px;
  background: rgba(255,255,255,0.15);
  transition: background 200ms;
  &.filled { background: rgba(52,199,89,0.5); }
}

// ── Content area ──────────────────────────────────────────────────────────────
.wizard-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 24px;
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
}

// ── Step 0 fields ─────────────────────────────────────────────────────────────
.wiz-field-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wiz-field-label-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.field-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  opacity: 0.8;
}

.field-label {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  letter-spacing: 0.01em;
}

.wiz-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.wiz-textarea-wrap {
  position: relative;
}

.wiz-input {
  width: 100%;
  padding: 11px 48px 11px 14px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms;
  &:focus { border-color: rgba(255,255,255,0.4); }
  &::placeholder { color: rgba(255,255,255,0.3); }
}

.input-counter {
  position: absolute;
  right: 12px;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  pointer-events: none;
  white-space: nowrap;
}

.wiz-textarea {
  width: 100%;
  padding: 11px 14px 28px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  resize: none;
  min-height: 110px;
  transition: border-color 150ms;
  &:focus { border-color: rgba(255,255,255,0.4); }
  &::placeholder { color: rgba(255,255,255,0.3); }
}

.textarea-counter {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  pointer-events: none;
}

// ── Nav ──────────────────────────────────────────────────────────────────────
.wiz-nav {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-bottom: 32px;
  margin-top: 32px;
}

.wiz-btn-primary {
  padding: 11px 28px;
  background: #fff;
  color: #000;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms;
  &:hover:not(:disabled) { background: rgba(255,255,255,0.85); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

.wiz-btn-secondary {
  padding: 11px 24px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  &:hover { background: rgba(255,255,255,0.12); color: #fff; }
}

// ── Shared form styles ────────────────────────────────────────────────────────
.wiz-section-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.wiz-section-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  margin: -16px 0 0;
}

.wiz-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.wiz-loading { font-size: 12px; color: rgba(255,255,255,0.4); }
.wiz-empty   { font-size: 12px; color: rgba(255,255,255,0.4); padding: 16px 0; text-align: center; }

.wiz-error {
  font-size: 12px;
  color: #e05050;
  padding: 8px 12px;
  background: rgba(224,80,80,0.07);
  border: 1px solid rgba(224,80,80,0.2);
  border-radius: 8px;
}

// ── Version list ──────────────────────────────────────────────────────────────
.wiz-filter-row {
  display: flex;
  gap: 10px;
  align-items: center;
  .wiz-input { flex: 1; }
}

.version-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
}

.version-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 150ms;
  &:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.07); }
  &.selected { border-color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.08); }
}

.version-id { flex: 1; font-size: 13px; font-weight: 600; color: #fff; }

.version-type {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 5px;
  border-radius: 4px;
  &.type-release { color: #34c759; background: rgba(52,199,89,0.1); }
}

.version-installed { font-size: 10px; color: #0a84ff; font-weight: 600; }

// ── Fabric status ─────────────────────────────────────────────────────────────
.fabric-status {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fabric-ok {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #34c759;
  font-weight: 600;
}

.fabric-warn { color: #e05050; font-weight: 600; }

// ── Mods step ─────────────────────────────────────────────────────────────────
.mod-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 2px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
}

.mod-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 150ms;
  &:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.07); }
  &.selected {
    border-color: rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.09);
  }
}

.mod-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.mod-name { font-size: 13px; font-weight: 700; color: #fff; }
.mod-desc { font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.4; flex: 1; }

.mod-check-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(52,199,89,0.2);
  border: 1px solid rgba(52,199,89,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #34c759;
}

.mod-category-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.3);
  margin-top: 2px;
}

.mods-selected-summary {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  text-align: center;
}

// ── Installing ────────────────────────────────────────────────────────────────
.wizard-installing {
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.install-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.install-task {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  text-align: center;
  max-width: 320px;
}

.install-bar-wrap {
  width: 280px;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.install-bar {
  height: 100%;
  background: #fff;
  border-radius: 4px;
  transition: width 200ms ease;
}

.install-pct { font-size: 11px; color: rgba(255,255,255,0.35); }

// ── Done ──────────────────────────────────────────────────────────────────────
.wizard-done {
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}

.done-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(52,199,89,0.12);
  border: 1px solid rgba(52,199,89,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #34c759;
}

.wizard-done h2 { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }
.wizard-done p  { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0; }

// ── Transition ────────────────────────────────────────────────────────────────
.wizard-fade-enter-active, .wizard-fade-leave-active { transition: opacity 200ms ease; }
.wizard-fade-enter-from, .wizard-fade-leave-to { opacity: 0; }
</style>
