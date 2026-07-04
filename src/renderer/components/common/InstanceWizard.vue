<template>
  <Teleport to="body">
    <Transition name="wizard-fade">
      <div v-if="store.wizardOpen" class="wizard-overlay" @click.self="maybeClose">
        <div class="wizard-modal" @click="closeMenus">

          <button class="wiz-close" :disabled="creating" @click="maybeClose">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
          </button>

          <!-- ══ Horizontal stepper ══ -->
          <div class="wiz-stepper">
            <template v-for="(s, i) in STEPS" :key="s.id">
              <div
                class="wiz-snode"
                :class="{ done: stepDone(i), active: step === i, clickable: i < step }"
                @click="i < step && (step = i)"
              >
                <div class="wiz-scircle">
                  <svg v-if="stepDone(i)" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <!-- info -->
                  <svg v-else-if="s.id === 'info'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <!-- puzzle -->
                  <svg v-else-if="s.id === 'version'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>
                  <!-- image -->
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <span class="wiz-slabel">{{ s.label }}</span>
              </div>
              <div v-if="i < STEPS.length - 1" class="wiz-sline" :class="{ filled: stepDone(i) }" />
            </template>
          </div>

          <div class="wiz-content">

            <!-- ── Step 0: Info ── -->
            <div v-if="step === 0" class="wiz-page">
              <h1 class="wiz-title">Your new profile</h1>
              <p class="wiz-subtitle">Name it and watch the card build itself — this is what you'll see on the launch grid.</p>

              <div class="wiz-page-body">
                <div class="wiz-info-layout">
                  <div class="wiz-info-fields">
                    <div>
                      <div class="wiz-field-head">
                        <span class="wiz-field-title">Name</span>
                        <span class="wiz-req">✱</span>
                      </div>
                      <input v-model="name" class="wiz-input" maxlength="32" autofocus />
                      <div class="wiz-counter-row"><span :class="{ warm: name.length >= 30 }">{{ name.length }}/32</span></div>
                    </div>

                    <div>
                      <div class="wiz-field-head">
                        <span class="wiz-field-title">Description</span>
                      </div>
                      <textarea v-model="description" class="wiz-textarea" maxlength="300" rows="4" placeholder="What's this setup for? PvP, modpacks, testing…" />
                      <div class="wiz-counter-row"><span :class="{ warm: description.length >= 290 }">{{ description.length }}/300</span></div>
                    </div>

                    <div class="wiz-isolate-row" @click="isolate = !isolate">
                      <span class="wiz-cbox" :class="{ checked: isolate }">
                        <svg v-if="isolate" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.7"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z"/></svg>
                      <span class="wiz-isolate-label">Isolate profile</span>
                      <span class="wiz-help">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span class="wiz-tooltip">Keeps this profile's worlds, mods and settings in its own folder, separate from other profiles.</span>
                      </span>
                    </div>
                  </div>

                  <div class="wiz-preview-col">
                    <span class="wiz-preview-label">Live preview</span>
                    <div class="wiz-pcard">
                      <div class="wiz-pcard-bg">
                        <img class="wiz-pcard-bgart" :src="bgPlaceholder" alt="" />
                        <div class="wiz-pcard-icon"><img class="ph" :src="bejaLogo" alt="" /></div>
                      </div>
                      <div class="wiz-pcard-info">
                        <span class="wiz-pcard-name" :class="{ empty: !name.trim() }">{{ name.trim() || 'Unnamed profile' }}</span>
                        <span class="wiz-pcard-desc">{{ description.trim() }}</span>
                        <span class="wiz-pcard-meta">{{ metaText || 'No version yet' }}</span>
                      </div>
                    </div>
                    <span class="wiz-preview-note">Icon and background come in the last step.</span>
                  </div>
                </div>
              </div>

              <div class="wiz-footer">
                <span class="wiz-req-note"><span class="wiz-req">✱</span> Required</span>
                <div class="wiz-footer-right">
                  <button class="wiz-primary-btn" :disabled="!name.trim()" @click="step = 1">Select Game Version →</button>
                </div>
              </div>
            </div>

            <!-- ── Step 1: Version ── -->
            <div v-if="step === 1" class="wiz-page">
              <h1 class="wiz-title">Select Game Version</h1>
              <p class="wiz-subtitle">Choose the Minecraft version and mod loader for your new profile!</p>

              <div class="wiz-toolbar">
                <div class="wiz-search-pill">
                  <div class="wiz-loader-dd" :class="{ disabled: bejaMode }" @click.stop="!bejaMode && (loaderMenuOpen = !loaderMenuOpen, sortMenuOpen = false)">
                    <img v-if="loaderIconSrc(effectiveLoader)" :src="loaderIconSrc(effectiveLoader)!" class="wiz-loader-dd-icon" />
                    <span>{{ loaderDisplayName }}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.5"><path d="M12 16l-6-8h12z"/></svg>
                    <Transition name="dd">
                      <div v-if="loaderMenuOpen" class="wiz-menu">
                        <button v-for="l in LOADERS" :key="l.id" class="wiz-menu-item" :class="{ sel: selectedLoader === l.id }" @click.stop="selectedLoader = l.id as LoaderType; loaderMenuOpen = false">
                          <img v-if="l.icon" :src="l.icon" class="wiz-menu-icon" />
                          <span v-else class="wiz-menu-icon-blank">◈</span>
                          {{ l.name }}
                        </button>
                      </div>
                    </Transition>
                  </div>
                  <div class="wiz-pill-sep" />
                  <input v-model="versionSearch" class="wiz-search-input" placeholder="Search" />
                </div>

                <div class="wiz-sort-dd" @click.stop="sortMenuOpen = !sortMenuOpen; loaderMenuOpen = false">
                  <span class="wiz-sort-label">Sort by:</span>
                  <span class="wiz-sort-value">{{ sortMode }}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.5"><path d="M12 16l-6-8h12z"/></svg>
                  <Transition name="dd">
                    <div v-if="sortMenuOpen" class="wiz-menu wiz-menu--right">
                      <button v-for="m in SORT_MODES" :key="m" class="wiz-menu-item" :class="{ sel: sortMode === m }" @click.stop="sortMode = m; sortMenuOpen = false">{{ m }}</button>
                    </div>
                  </Transition>
                </div>

                <div class="wiz-flavor-toggle">
                  <button class="wiz-flavor-btn" :class="{ on: bejaMode }" @click="bejaMode = true">
                    <img :src="bejaLogo" class="wiz-flavor-icon" />
                    Beja
                  </button>
                  <button class="wiz-flavor-btn" :class="{ on: !bejaMode }" @click="bejaMode = false">
                    <img :src="vanillaIcon" class="wiz-flavor-icon" />
                    Vanilla
                  </button>
                </div>
              </div>

              <div class="wiz-page-body wiz-vlist">
                <div v-if="loadingVersions" class="wiz-state">Loading versions…</div>
                <template v-else>
                  <div v-for="g in visibleGroups" :key="g.major" class="wiz-vgroup" :class="{ open: isExpanded(g.major) }">
                    <button class="wiz-vgroup-head" @click="toggleGroup(g.major)">
                      <img :src="g.icon" class="wiz-vgroup-icon" :class="{ pixel: g.pixelIcon }" />
                      <span class="wiz-vgroup-name">{{ bejaMode ? 'Beja ' + g.major : g.major }}</span>
                      <span v-if="selectedInGroup(g)" class="wiz-vgroup-sel">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {{ selectedVersion }}
                      </span>
                      <svg class="wiz-vgroup-chev" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16l-6-8h12z"/></svg>
                    </button>
                    <div class="wiz-vgroup-collapse" :class="{ open: isExpanded(g.major) }">
                      <div class="wiz-vgroup-clip">
                        <div class="wiz-vgroup-list">
                          <button
                            v-for="v in g.patches"
                            :key="v"
                            class="wiz-vpatch"
                            :class="{ selected: selectedVersion === v }"
                            :tabindex="isExpanded(g.major) ? 0 : -1"
                            @click="selectedVersion = v"
                          >
                            <span class="wiz-vradio" :class="{ on: selectedVersion === v }" />
                            {{ v }}
                            <span v-if="bejaMode" class="wiz-vtag">BejaClient</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="!visibleGroups.length" class="wiz-state">No versions match your search.</div>
                </template>
              </div>

              <div class="wiz-footer">
                <button class="wiz-ghost-btn" @click="step = 0">← Back</button>
                <div class="wiz-footer-right">
                  <button class="wiz-primary-btn" :disabled="!selectedVersion" @click="step = 2">Choose the Look →</button>
                </div>
              </div>
            </div>

            <!-- ── Step 2: Look ── -->
            <div v-if="step === 2" class="wiz-page">
              <h1 class="wiz-title">Make it yours</h1>
              <p class="wiz-subtitle">Click the card to set a background, click the icon to set an icon — or keep the defaults.</p>

              <div class="wiz-page-body">
                <div class="wiz-final-layout">
                  <div class="wiz-final-card">
                    <div class="wiz-final-bg" @click="bgInput?.click()">
                      <img :src="bgImage ?? bgPlaceholder" :class="{ set: !!bgImage }" alt="Profile background" />
                      <span class="wiz-hover-hint">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Upload background · 515×232
                      </span>
                      <div class="wiz-final-info">
                        <div class="wiz-final-icon" @click.stop="iconInput?.click()">
                          <img :src="iconImage ?? bejaLogo" :class="{ ph: !iconImage }" alt="Profile icon" />
                          <span class="wiz-hover-hint">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          </span>
                        </div>
                        <div class="wiz-final-text">
                          <span class="wiz-final-name">{{ name.trim() || 'Unnamed profile' }}</span>
                          <span class="wiz-final-meta">{{ metaText }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="wiz-final-actions">
                    <button class="wiz-chip-btn" @click="iconInput?.click()">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Icon · 128×128
                    </button>
                    <button class="wiz-chip-btn" @click="bgInput?.click()">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Background · 515×232
                    </button>
                    <button class="wiz-chip-btn" @click="iconImage = null; bgImage = null">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>
                      Reset both
                    </button>
                  </div>

                  <div class="wiz-file-note">
                    <span>Accepted: <b>.png</b> <b>.jpeg</b> <b>.webp</b></span>
                    <span class="wiz-note-sep" />
                    <span>Max size: <b>1MB</b></span>
                  </div>

                  <div v-if="imageError" class="wiz-error">{{ imageError }}</div>
                  <div v-if="createError" class="wiz-error">{{ createError }}</div>
                </div>
              </div>

              <input ref="iconInput" type="file" accept="image/png,image/jpeg,image/webp" style="display:none" @change="onIconSelected" />
              <input ref="bgInput" type="file" accept="image/png,image/jpeg,image/webp" style="display:none" @change="onBgSelected" />

              <div class="wiz-footer">
                <button class="wiz-ghost-btn" @click="step = 1">← Back</button>
                <div class="wiz-footer-right">
                  <button class="wiz-primary-btn" :disabled="creating" @click="createAndClose">
                    {{ creating ? 'Creating…' : 'Create Profile' }}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLauncherStore } from '../../store/launcherStore'
import { useSettingsStore } from '../../store/settingsStore'
import type { LoaderType } from '../../types'

import loaderFabric   from '../../assets/loaders/fabric.png'
import loaderForge    from '../../assets/loaders/forge.png'
import loaderQuilt    from '../../assets/loaders/quilt.webp'
import loaderNeoforge from '../../assets/loaders/neoforge.png'
import bejaLogo       from '../../assets/bc-logo-new.png'
import vanillaIcon    from '../../assets/wizard/vanilla.png'
import bgPlaceholder  from '../../assets/wizard/default-banner.jpg'
import cover121       from '../../assets/wizard/cover-1_21.jpg'
import cover119       from '../../assets/wizard/cover-1_19.jpg'
import cover26        from '../../assets/wizard/cover-26.jpg'

// Block textures cycled as placeholder icons for version rows
import texBookshelf from '../../assets/textures/bookshelf.png'
import texCrafting  from '../../assets/textures/crafting_table_front.png'
import texNoteblock from '../../assets/textures/note_block.png'
import texBricks    from '../../assets/textures/stone_bricks.png'
import texPlanks    from '../../assets/textures/oak_planks.png'
import texDirt      from '../../assets/textures/dirt.png'
import texLog       from '../../assets/textures/oak_log.png'
import texGravel    from '../../assets/textures/gravel.png'

const VERSION_ICONS = [texBookshelf, texCrafting, texNoteblock, texBricks, texPlanks, texDirt, texLog, texGravel]

// Real update art per major version; block textures fill the gaps
const MAJOR_COVERS: Record<string, string> = {
  '26':   cover26,
  '1.21': cover121,
  '1.19': cover119,
}

const store    = useLauncherStore()
const settings = useSettingsStore()

const STEPS = [
  { id: 'info',    label: 'Info' },
  { id: 'version', label: 'Version' },
  { id: 'look',    label: 'Look' },
]

const LOADERS = [
  { id: 'fabric',   name: 'Fabric',   icon: loaderFabric },
  { id: 'forge',    name: 'Forge',    icon: loaderForge },
  { id: 'quilt',    name: 'Quilt',    icon: loaderQuilt },
  { id: 'neoforge', name: 'NeoForge', icon: loaderNeoforge },
  { id: 'vanilla',  name: 'Vanilla',  icon: null },
]
const LOADER_ICON_MAP: Record<string, string> = {
  fabric: loaderFabric, forge: loaderForge, quilt: loaderQuilt, neoforge: loaderNeoforge,
}
function loaderIconSrc(l: string): string | null { return LOADER_ICON_MAP[l] ?? null }

const SORT_MODES = ['Popular', 'Oldest'] as const

const BEJA_EXACT = new Set(['1.16.5', '1.18.2', '1.19.4'])
function isBejaSupported(id: string): boolean {
  if (!id) return false
  if (BEJA_EXACT.has(id)) return true
  const parts = id.split('.').map(Number)
  if (parts[0] === 1 && parts[1] === 20) return (parts[2] ?? 0) >= 1 && (parts[2] ?? 0) <= 6
  if (parts[0] === 1 && parts[1] >= 21) return true
  return false
}

// ── State ─────────────────────────────────────────────────────────────────────
const step            = ref(0)
const creating        = ref(false)
const createError     = ref('')
const imageError      = ref('')

const name            = ref('')
const description     = ref('')
const isolate         = ref(true)

const allVersions     = ref<{ id: string; type: string }[]>([])
const loadingVersions = ref(false)
const versionSearch   = ref('')
const sortMode        = ref<(typeof SORT_MODES)[number]>('Popular')
const bejaMode        = ref(true)
const selectedLoader  = ref<LoaderType>('fabric')
const selectedVersion = ref('')
const expandedGroups  = ref<Set<string>>(new Set())
const loaderMenuOpen  = ref(false)
const sortMenuOpen    = ref(false)

const iconImage       = ref<string | null>(null)
const bgImage         = ref<string | null>(null)
const iconInput       = ref<HTMLInputElement | null>(null)
const bgInput         = ref<HTMLInputElement | null>(null)

// ── Stepper ───────────────────────────────────────────────────────────────────
function stepDone(i: number): boolean {
  if (i === 0) return name.value.trim().length > 0 && step.value > 0
  if (i === 1) return selectedVersion.value.length > 0 && step.value > 1
  return false
}

// ── Version grouping ──────────────────────────────────────────────────────────
interface VersionGroup { major: string; patches: string[]; icon: string; pixelIcon: boolean }

const releaseVersions = computed(() =>
  allVersions.value.filter(v => v.type === 'release').map(v => v.id)
)

const versionGroups = computed<VersionGroup[]>(() => {
  const map = new Map<string, string[]>()
  for (const id of releaseVersions.value) {
    const m = id.match(/^(\d+)\.(\d+)/)
    if (!m) continue
    // Classic ids ("1.21.4") group as "1.21"; year-based ids ("26.1") group as "26"
    const major = m[1] === '1' ? `1.${m[2]}` : m[1]
    if (!map.has(major)) map.set(major, [])
    map.get(major)!.push(id)
  }
  // Year-based majors sort above all classic 1.x majors, both newest-first
  const majorKey = (major: string) =>
    major.startsWith('1.') ? Number(major.split('.')[1]) : 1000 + Number(major)
  let majors = [...map.keys()].sort((a, b) => majorKey(b) - majorKey(a))
  if (sortMode.value === 'Oldest') majors = majors.reverse()
  return majors.map((major, i) => ({
    major,
    patches: map.get(major)!,
    icon: MAJOR_COVERS[major] ?? VERSION_ICONS[i % VERSION_ICONS.length],
    pixelIcon: !MAJOR_COVERS[major],
  }))
})

const visibleGroups = computed<VersionGroup[]>(() =>
  versionGroups.value
    .map(g => ({
      ...g,
      patches: g.patches
        .filter(p => !bejaMode.value || isBejaSupported(p))
        .filter(p => !versionSearch.value || p.includes(versionSearch.value.trim())),
    }))
    .filter(g => g.patches.length > 0)
)

function isExpanded(major: string): boolean {
  return versionSearch.value.length > 0 || expandedGroups.value.has(major)
}
function toggleGroup(major: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(major)) next.delete(major)
  else next.add(major)
  expandedGroups.value = next
}
function selectedInGroup(g: VersionGroup): boolean {
  return g.patches.includes(selectedVersion.value)
}

const effectiveLoader = computed<LoaderType>(() => bejaMode.value ? 'fabric' : selectedLoader.value)
const loaderDisplayName = computed(() => LOADERS.find(l => l.id === effectiveLoader.value)?.name ?? effectiveLoader.value)

const metaText = computed(() => {
  if (!selectedVersion.value) return ''
  return selectedVersion.value + (bejaMode.value ? ' · BejaClient' : ` · ${loaderDisplayName.value}`)
})

// Switching flavor invalidates a selection that isn't valid in the new mode
watch(bejaMode, beja => {
  if (beja && selectedVersion.value && !isBejaSupported(selectedVersion.value)) {
    selectedVersion.value = ''
  }
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────
watch(() => store.wizardOpen, async open => {
  if (!open) return
  reset()
  loadingVersions.value = true
  try {
    const manifest = await window.api.versions.listRemote()
    allVersions.value = manifest.versions
  } catch { /* non-fatal */ }
  finally { loadingVersions.value = false }
})

function closeMenus() { loaderMenuOpen.value = false; sortMenuOpen.value = false }

// ── Images ────────────────────────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function validateFile(file: File): boolean {
  imageError.value = ''
  if (!ACCEPTED_TYPES.includes(file.type)) {
    imageError.value = 'Unsupported file type — use .png, .jpeg or .webp.'
    return false
  }
  if (file.size > MAX_IMAGE_BYTES) {
    imageError.value = 'File is too large — maximum size is 1MB.'
    return false
  }
  return true
}

async function onIconSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !validateFile(file)) return
  iconImage.value = await resizeImage(file, 128, 128)
}

async function onBgSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !validateFile(file)) return
  bgImage.value = await resizeImage(file, 515, 232)
}

function resizeImage(file: File, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')!
      const scale = Math.max(width / img.width, height / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
      resolve(canvas.toDataURL('image/png', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
    img.src = url
  })
}

// ── Create ────────────────────────────────────────────────────────────────────
async function createAndClose() {
  createError.value = ''
  creating.value = true
  try {
    await store.createProfile({
      name:           name.value.trim(),
      description:    description.value.trim() || undefined,
      version:        selectedVersion.value,
      loader:         effectiveLoader.value,
      loaderVersion:  '',
      minRam:         settings.settings.game.minRam,
      maxRam:         settings.settings.game.maxRam,
      gameDir:        '',
      javaPath:       '',
      jvmArgs:        '',
      resolution:     { width: 854, height: 480 },
      useBejaClient:  bejaMode.value,
      imageUrl:       iconImage.value,
      backgroundUrl:  bgImage.value,
      isolateProfile: isolate.value,
    })
    store.wizardOpen = false
  } catch (e) {
    createError.value = String(e)
  } finally {
    creating.value = false
  }
}

function maybeClose() { if (!creating.value) store.wizardOpen = false }

function reset() {
  step.value            = 0
  creating.value        = false
  createError.value     = ''
  imageError.value      = ''
  name.value            = ''
  description.value     = ''
  isolate.value         = true
  versionSearch.value   = ''
  sortMode.value        = 'Popular'
  bejaMode.value        = true
  selectedLoader.value  = 'fabric'
  selectedVersion.value = ''
  expandedGroups.value  = new Set()
  loaderMenuOpen.value  = false
  sortMenuOpen.value    = false
  iconImage.value       = null
  bgImage.value         = null
}
</script>

<style lang="scss" scoped>
@font-face {
  font-family: 'Mojangles';
  src: url('../../assets/fonts/mojangles.ttf') format('truetype');
  font-weight: normal;
  font-display: swap;
}

$green: #34c759;
$red: #ef4444;

// ── Overlay ───────────────────────────────────────────────────────────────────
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
.wizard-modal {
  width: min(1020px, 96vw);
  height: min(660px, 90vh);
  min-height: 560px;
  background: #131417;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.75);
}

.wiz-close {
  position: absolute;
  top: 16px;
  right: 18px;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: color 120ms, background 120ms;
  &:hover:not(:disabled) { color: #fff; background: rgba(255, 255, 255, 0.06); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

// ── Stepper ───────────────────────────────────────────────────────────────────
.wiz-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 70px 4px;
  flex-shrink: 0;
}

.wiz-snode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  width: 92px;
  flex-shrink: 0;
  cursor: default;
  &.clickable { cursor: pointer; }
}

.wiz-scircle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #2a2d33;
  color: rgba(255, 255, 255, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  transition: background 180ms, color 180ms, border-color 180ms;

  .wiz-snode.active & { border-color: rgba(255, 255, 255, 0.85); color: #fff; background: #212329; }
  .wiz-snode.done   & { background: #fff; color: #0c0d0f; }
}

.wiz-slabel {
  font-family: 'Mojangles', monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.04em;

  .wiz-snode.active & { color: #fff; }
  .wiz-snode.done   & { color: rgba(255, 255, 255, 0.85); }
}

.wiz-sline {
  flex: 1;
  max-width: 130px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  margin-top: 16px;
  transition: background 180ms;
  &.filled { background: #fff; }
}

// ── Content / pages ───────────────────────────────────────────────────────────
.wiz-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 44px 20px;
}

.wiz-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.wiz-title {
  font-family: 'Mojangles', monospace;
  font-size: 26px;
  font-weight: 400;
  color: #fff;
  margin: 8px 0 6px;
  letter-spacing: 0.01em;
}

.wiz-subtitle {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 20px;
}

.wiz-page-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-right: 6px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.09); border-radius: 4px; }
}

// ── Step 1: fields + live preview ─────────────────────────────────────────────
.wiz-info-layout {
  display: flex;
  gap: 34px;
  align-items: flex-start;
  flex: 1;
  min-height: 0;
}

.wiz-info-fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.wiz-field-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  margin-bottom: 6px;
}

.wiz-field-title { font-size: 15px; font-weight: 700; }
.wiz-req { color: $red; font-size: 11px; }

.wiz-input {
  width: 100%;
  padding: 12px 14px;
  background: #212329;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms;
  &:focus { border-color: rgba(255, 255, 255, 0.35); }
}

.wiz-textarea {
  width: 100%;
  padding: 12px 14px;
  background: #212329;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
  transition: border-color 150ms;
  &:focus { border-color: rgba(255, 255, 255, 0.35); }
  &::placeholder { color: rgba(255, 255, 255, 0.22); }
}

.wiz-counter-row {
  display: flex;
  justify-content: flex-end;
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.38);
  margin-top: 5px;
  font-variant-numeric: tabular-nums;
  .warm { color: $red; }
}

.wiz-isolate-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  cursor: pointer;
  user-select: none;
  width: fit-content;
}

.wiz-cbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0c0d0f;
  flex-shrink: 0;
  transition: background 130ms, border-color 130ms;
  &.checked { background: #fff; border-color: #fff; }
}

.wiz-isolate-label { font-size: 14px; font-weight: 700; }

.wiz-help {
  position: relative;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  &:hover { color: rgba(255, 255, 255, 0.7); .wiz-tooltip { opacity: 1; visibility: visible; } }
}

.wiz-tooltip {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 240px;
  padding: 9px 12px;
  background: #26282e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.75);
  opacity: 0;
  visibility: hidden;
  transition: opacity 140ms;
  pointer-events: none;
  z-index: 10;
}

// Live preview card
.wiz-preview-col {
  width: 252px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.wiz-preview-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
}

.wiz-pcard {
  background: #212329;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  overflow: hidden;
}

.wiz-pcard-bg {
  position: relative;
  aspect-ratio: 515 / 232;
  background: #191a1f;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

// Gray treatment is baked into the default banner asset — no extra dimming needed
.wiz-pcard-bgart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
}

.wiz-pcard-icon {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 12px;
  background: #101114;
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);

  img { width: 100%; height: 100%; object-fit: cover; }
  img.ph { object-fit: contain; padding: 16%; opacity: 0.4; box-sizing: border-box; }
}

.wiz-pcard-info {
  padding: 12px 14px 13px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.wiz-pcard-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &.empty { color: rgba(255, 255, 255, 0.38); font-weight: 500; }
}

.wiz-pcard-desc {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 15px;
}

.wiz-pcard-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  margin-top: 3px;
}

.wiz-preview-note {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.5;
}

// ── Footer ────────────────────────────────────────────────────────────────────
.wiz-footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 16px;
  flex-shrink: 0;
}

.wiz-footer-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

.wiz-ghost-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.38);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 4px;
  transition: color 130ms;
  &:hover { color: #fff; }
}

.wiz-req-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: $red;
}

.wiz-primary-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 26px;
  background: #fff;
  border: none;
  border-radius: 10px;
  color: #0c0d0f;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 130ms, opacity 130ms;
  &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.86); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

// ── Step 2: toolbar ───────────────────────────────────────────────────────────
.wiz-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.wiz-search-pill {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background: #212329;
  border-radius: 12px;
  padding: 0 6px 0 14px;
  height: 46px;
}

.wiz-loader-dd {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  padding: 6px 4px;
  &.disabled { cursor: default; opacity: 0.75; }
}

.wiz-loader-dd-icon { width: 18px; height: 18px; object-fit: contain; border-radius: 4px; }

.wiz-pill-sep {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 12px;
  flex-shrink: 0;
}

.wiz-search-input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
}

.wiz-sort-dd {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 46px;
  padding: 0 16px;
  background: #212329;
  border-radius: 12px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.wiz-sort-label { font-size: 13px; color: rgba(255, 255, 255, 0.45); font-weight: 600; }
.wiz-sort-value { font-size: 13.5px; color: #fff; font-weight: 700; }

.wiz-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 150px;
  background: #26282e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 20;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5);
  &--right { left: auto; right: 0; }
}

.wiz-menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 11px;
  background: none;
  border: none;
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 110ms, color 110ms;
  &:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }
  &.sel   { color: #fff; background: rgba(255, 255, 255, 0.05); }
}

.wiz-menu-icon { width: 17px; height: 17px; object-fit: contain; border-radius: 4px; }
.wiz-menu-icon-blank { width: 17px; text-align: center; color: $green; font-size: 13px; }

.wiz-flavor-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #212329;
  border-radius: 12px;
  padding: 5px;
  height: 46px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.wiz-flavor-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  background: transparent;
  border: none;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 130ms, color 130ms;
  &:hover { color: rgba(255, 255, 255, 0.8); }
  &.on { background: #3a3d45; color: #fff; }
}

.wiz-flavor-icon { width: 18px; height: 18px; object-fit: contain; border-radius: 4px; }

// ── Version list ──────────────────────────────────────────────────────────────
.wiz-vlist { gap: 9px; }

.wiz-vgroup { flex-shrink: 0; }

.wiz-vgroup-head {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 9px 16px 9px 10px;
  background: #212329;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 120ms;
  &:hover { background: #26282f; }
}

.wiz-vgroup-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  // Only tiny block textures get nearest-neighbor; photo covers stay smooth
  &.pixel { image-rendering: pixelated; }
}

.wiz-vgroup-name {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  flex: 1;
}

.wiz-vgroup-sel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: $green;
}

.wiz-vgroup-chev {
  color: rgba(255, 255, 255, 0.4);
  transform: rotate(180deg);
  transition: transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
  flex-shrink: 0;
  .wiz-vgroup.open & { transform: rotate(0deg); }
}

// Expand/collapse: 0fr→1fr grid track animates to the content's natural
// height (height:auto can't be transitioned). The clip layer carries no
// padding so the closed state collapses to exactly 0px.
.wiz-vgroup-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 340ms cubic-bezier(0.25, 1, 0.5, 1);
  &.open { grid-template-rows: 1fr; }
}

.wiz-vgroup-clip {
  overflow: hidden;
  min-height: 0;
}

.wiz-vgroup-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 0 4px 22px;
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 220ms ease, transform 340ms cubic-bezier(0.25, 1, 0.5, 1);

  .wiz-vgroup-collapse.open & { opacity: 1; transform: none; }
}

.wiz-vpatch {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid transparent;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 110ms, border-color 110ms, color 110ms;

  &:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
  &.selected {
    background: rgba(52, 199, 89, 0.09);
    border-color: rgba(52, 199, 89, 0.4);
    color: #fff;
  }
}

.wiz-vradio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
  transition: border-color 120ms, background 120ms;
  &.on { border-color: $green; background: $green; box-shadow: inset 0 0 0 2.5px #131417; }
}

.wiz-vtag {
  margin-left: auto;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

// ── Step 3: Look ──────────────────────────────────────────────────────────────
.wiz-final-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  flex: 1;
  min-height: 0;
  justify-content: center;
}

.wiz-final-card {
  position: relative;
  width: min(560px, 100%);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #191a1f;
}

.wiz-final-bg {
  position: relative;
  aspect-ratio: 515 / 232;
  cursor: pointer;
  overflow: hidden;

  > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.9;
    transition: opacity 180ms;
    &.set { opacity: 1; }
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10, 11, 13, 0.85), transparent 55%);
    pointer-events: none;
  }
  &:hover > .wiz-hover-hint { opacity: 1; }
}

.wiz-hover-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  opacity: 0;
  transition: opacity 150ms;
  z-index: 2;
}

.wiz-final-info {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 3;
  pointer-events: none;
}

.wiz-final-icon {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: #101114;
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55);
  pointer-events: auto;

  img { width: 100%; height: 100%; object-fit: cover; }
  img.ph { object-fit: contain; padding: 16%; opacity: 0.45; box-sizing: border-box; }

  .wiz-hover-hint { font-size: 10px; gap: 4px; border-radius: 13px; }
  &:hover .wiz-hover-hint { opacity: 1; }
}

.wiz-final-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.wiz-final-name {
  font-family: 'Mojangles', monospace;
  font-size: 19px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}

.wiz-final-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 600;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
}

.wiz-final-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.wiz-chip-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  background: #212329;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms;
  &:hover { color: #fff; background: #2a2d34; }
}

.wiz-file-note {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  flex-wrap: wrap;
  justify-content: center;
  b { color: rgba(255, 255, 255, 0.7); font-weight: 700; }
}

.wiz-note-sep {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.12);
}

// ── Misc ──────────────────────────────────────────────────────────────────────
.wiz-state {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  padding: 26px 0;
}

.wiz-error {
  font-size: 12.5px;
  color: #ef6b6b;
  padding: 9px 13px;
  background: rgba(224, 80, 80, 0.07);
  border: 1px solid rgba(224, 80, 80, 0.22);
  border-radius: 9px;
  flex-shrink: 0;
}

// ── Transitions ───────────────────────────────────────────────────────────────
.wizard-fade-enter-active, .wizard-fade-leave-active { transition: opacity 180ms ease; }
.wizard-fade-enter-from, .wizard-fade-leave-to { opacity: 0; }

.dd-enter-active, .dd-leave-active { transition: opacity 120ms ease, transform 120ms ease; }
.dd-enter-from, .dd-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
