<template>
  <div class="explore-page">

    <!-- Tabs -->
    <div class="tab-row">
      <button
        v-for="t in tabs"
        :key="t.label"
        class="tab-btn"
        :class="{ active: activeTab === t.label }"
        @click="switchTab(t.label)"
      >{{ t.label }}</button>
    </div>

    <!-- Search + filters (hidden on Servers tab) -->
    <div v-if="activeTab !== 'Servers'" class="controls-row">
      <div class="search-bar">
        <input
          v-model="searchInput"
          class="search-input"
          :placeholder="`Search ${activeTab.toLowerCase()}...`"
          @keyup.enter="triggerSearch"
        />
        <img :src="searchIcon" class="search-icon" alt="" />
      </div>

      <select v-model="filterVersion" class="filter-select" @change="doSearch">
        <option value="">All versions</option>
        <option v-for="v in releaseVersions" :key="v" :value="v">{{ v }}</option>
      </select>

      <select
        v-if="showLoaderFilter"
        v-model="filterLoader"
        class="filter-select"
        @change="doSearch"
      >
        <option value="">All loaders</option>
        <option value="fabric">Fabric</option>
        <option value="forge">Forge</option>
        <option value="neoforge">NeoForge</option>
        <option value="quilt">Quilt</option>
      </select>

      <button
        class="filter-select cat-btn"
        :class="{ active: filterCategories.length > 0 }"
        @click="catPanelOpen = !catPanelOpen"
      >
        Categories{{ filterCategories.length ? ` (${filterCategories.length})` : '' }}
      </button>
    </div>

    <!-- Active category chips -->
    <div v-if="filterCategories.length && activeTab !== 'Servers'" class="chip-row">
      <button v-for="c in filterCategories" :key="c" class="chip" @click="removeCategory(c)">{{ c }} ×</button>
      <button class="chip chip--clear" @click="clearCategories">clear all</button>
    </div>

    <!-- ── Servers tab ──────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'Servers'" class="servers-area">

      <!-- Top bar -->
      <div class="servers-topbar">
        <button class="server-action-btn" @click="showAddForm = !showAddForm">
          {{ showAddForm ? '− Cancel' : '+ Add Server' }}
        </button>
        <button class="server-action-btn" :disabled="serversLoading" @click="refreshServers">
          <span v-if="serversLoading" class="spinner sm" />
          <template v-else>↺ Refresh</template>
        </button>
      </div>

      <!-- Add server form -->
      <Transition name="add-form">
        <div v-if="showAddForm" class="add-server-form">
          <input
            v-model="newHost"
            class="server-input"
            placeholder="Server IP (e.g. play.example.com)"
            @keyup.enter="submitAddServer"
          />
          <input
            v-model.number="newPort"
            class="server-input server-input--port"
            type="number"
            placeholder="25565"
            min="1"
            max="65535"
          />
          <input
            v-model="newName"
            class="server-input"
            placeholder="Display name (optional)"
            @keyup.enter="submitAddServer"
          />
          <button class="server-add-confirm" :disabled="!newHost || addingServer" @click="submitAddServer">
            <span v-if="addingServer" class="spinner sm" />
            <template v-else>Add</template>
          </button>
        </div>
      </Transition>

      <!-- Server list -->
      <div v-if="serversLoading && !servers.length" class="state-area">
        <span class="spinner lg" />
      </div>

      <div v-else-if="serversError" class="state-area">
        <span class="state-text error-text">{{ serversError }}</span>
      </div>

      <div v-else class="server-list">
        <div
          v-for="s in servers"
          :key="s.id"
          class="server-card"
          :class="{ offline: !s.online }"
        >
          <!-- Favicon -->
          <div class="server-favicon-wrap">
            <img v-if="s.favicon" :src="s.favicon" class="server-favicon" :alt="s.name" />
            <div v-else class="server-favicon-fallback">{{ s.name[0] }}</div>
          </div>

          <!-- Info -->
          <div class="server-info">
            <div class="server-name-row">
              <span class="server-name">{{ s.name }}</span>
              <span v-if="s.featured" class="server-badge">FEATURED</span>
              <span v-if="!s.online && serversLoading" class="server-pinging-badge">PINGING…</span>
            <span v-else-if="!s.online" class="server-offline-badge">OFFLINE</span>
            </div>
            <p v-if="s.motd" class="server-motd">{{ s.motd }}</p>
            <span class="server-ip">{{ s.host }}{{ s.port !== 25565 ? `:${s.port}` : '' }}</span>
          </div>

          <!-- Stats -->
          <div class="server-stats">
            <div v-if="s.online" class="stat-row">
              <span class="stat-label">PING</span>
              <span class="stat-value" :class="pingClass(s.ping)">{{ s.ping }}ms</span>
            </div>
            <div v-if="s.online" class="stat-row">
              <span class="stat-label">PLAYERS</span>
              <span class="stat-value">{{ s.playersOnline }}/{{ s.playersMax }}</span>
            </div>
            <div v-if="s.online && s.version" class="stat-row">
              <span class="stat-label">VERSION</span>
              <span class="stat-value version-val">{{ s.version }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="server-actions">
            <button
              v-if="!s.featured"
              class="server-remove-btn"
              title="Remove server"
              @click="deleteServer(s.id)"
            >✕</button>
            <button
              v-if="s.online"
              class="install-btn"
              @click="openServerPicker(s, $event)"
            >ADD TO PROFILE</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Content list (non-server tabs) ─────────────────────────────────── -->
    <div v-else ref="listEl" class="content-list">

      <div v-if="loading && !results.length" class="state-area">
        <span class="spinner lg" />
      </div>

      <div v-else-if="error" class="state-area">
        <span class="state-text error-text">{{ error }}</span>
      </div>

      <div v-else-if="!loading && !results.length" class="state-area">
        <span class="state-text">No results</span>
      </div>

      <template v-else>
        <div v-for="hit in results" :key="`${hit.source}-${hit.id}`" class="mod-row">

          <div class="mod-icon-wrap">
            <img v-if="hit.iconUrl" :src="hit.iconUrl" class="mod-icon" :alt="hit.title" />
            <div v-else class="mod-icon-fallback">{{ hit.title[0] }}</div>
          </div>

          <div class="mod-info">
            <div class="mod-name-row">
              <span class="mod-name">{{ hit.title }}</span>
              <span class="mod-stat">{{ formatNum(hit.downloads) }} ↓</span>
            </div>
            <p class="mod-desc">{{ hit.description }}</p>
            <div class="mod-tags">
              <span v-for="c in hit.categories.slice(0, 4)" :key="c" class="mod-tag">{{ c }}</span>
            </div>
          </div>

          <div class="install-area">
            <Transition name="tick">
              <span v-if="installedMap.get(`${hit.source}-${hit.id}`)?.size" class="installed-tick">✓</span>
            </Transition>
            <button
              class="install-btn"
              :disabled="installingSet.has(`${hit.source}-${hit.id}`)"
              @click="openModPicker(hit, $event)"
            >
              <span v-if="installingSet.has(`${hit.source}-${hit.id}`)" class="spinner sm" />
              <template v-else>INSTALL</template>
            </button>
          </div>

        </div>

        <div v-if="hasMore" class="load-more-row">
          <button class="load-more-btn" :disabled="loading" @click="loadMore">
            <span v-if="loading" class="spinner sm" />
            <template v-else>LOAD MORE</template>
          </button>
        </div>
      </template>

    </div>

    <!-- Category panel -->
    <Transition name="cat">
      <div v-if="catPanelOpen" class="cat-panel">
        <p class="cat-panel-title">Categories</p>
        <div class="cat-grid">
          <button
            v-for="cat in visibleCategories"
            :key="cat.name"
            class="cat-chip"
            :class="{ active: filterCategories.includes(cat.name) }"
            @click="toggleCategory(cat.name)"
          >{{ cat.name }}</button>
        </div>
        <div class="cat-panel-footer">
          <button class="cat-close-btn" @click="catPanelOpen = false; doSearch()">Apply</button>
        </div>
      </div>
    </Transition>

    <!-- Progress toast -->
    <Transition name="toast">
      <div v-if="progressMsg" class="progress-toast">{{ progressMsg }}</div>
    </Transition>

  </div>

  <!-- ── Mod profile picker (portal) ────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="picker">
      <div v-if="pickerHit" class="picker-overlay" @click.self="closePicker">
        <div class="picker-panel" :style="pickerPos">

          <p class="picker-title">Install to profiles</p>
          <p class="picker-sub">{{ pickerHit.title }}</p>

          <div v-if="!profiles.length" class="picker-empty">No profiles found</div>

          <label
            v-for="p in profiles"
            :key="p.id"
            class="picker-row"
            :class="{
              checked:   pickerSelected.includes(p.id),
              installed: pickerHit && installedMap.get(`${pickerHit.source}-${pickerHit.id}`)?.has(p.id),
            }"
          >
            <template v-if="pickerHit && installedMap.get(`${pickerHit.source}-${pickerHit.id}`)?.has(p.id)">
              <span class="picker-already-tick">✓</span>
            </template>
            <template v-else>
              <input type="checkbox" :value="p.id" v-model="pickerSelected" class="picker-check" />
            </template>
            <div class="picker-profile-info">
              <span class="picker-profile-name">{{ p.name }}</span>
              <span class="picker-profile-meta">{{ p.version }} · {{ p.loader }}</span>
            </div>
            <span v-if="pickerHit && installedMap.get(`${pickerHit.source}-${pickerHit.id}`)?.has(p.id)" class="picker-installed-label">Installed</span>
          </label>

          <div class="picker-footer">
            <button class="picker-btn picker-btn--cancel" @click="closePicker">Cancel</button>
            <button
              class="picker-btn picker-btn--confirm"
              :disabled="!pickerSelected.length || pickerInstalling"
              @click="confirmModInstall"
            >
              <span v-if="pickerInstalling" class="spinner sm" />
              <template v-else>Install ({{ pickerSelected.length }})</template>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Server profile picker (portal) ─────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="picker">
      <div v-if="serverPickerServer" class="picker-overlay" @click.self="closeServerPicker">
        <div class="picker-panel" :style="pickerPos">

          <p class="picker-title">Add to profile</p>
          <p class="picker-sub">{{ serverPickerServer.name }}</p>

          <div v-if="!profiles.length" class="picker-empty">No profiles found</div>

          <label
            v-for="p in profiles"
            :key="p.id"
            class="picker-row"
            :class="{
              checked:   serverPickerSelected.includes(p.id),
              installed: serverPickerServer && serverAddedMap.get(serverKey(serverPickerServer))?.has(p.id),
            }"
          >
            <template v-if="serverPickerServer && serverAddedMap.get(serverKey(serverPickerServer))?.has(p.id)">
              <span class="picker-already-tick">✓</span>
            </template>
            <template v-else>
              <input type="checkbox" :value="p.id" v-model="serverPickerSelected" class="picker-check" />
            </template>
            <div class="picker-profile-info">
              <span class="picker-profile-name">{{ p.name }}</span>
              <span class="picker-profile-meta">{{ p.version }} · {{ p.loader }}</span>
            </div>
            <span v-if="serverPickerServer && serverAddedMap.get(serverKey(serverPickerServer))?.has(p.id)" class="picker-installed-label">Added</span>
          </label>

          <div class="picker-footer">
            <button class="picker-btn picker-btn--cancel" @click="closeServerPicker">Cancel</button>
            <button
              class="picker-btn picker-btn--confirm"
              :disabled="!serverPickerSelected.length || serverPickerInstalling"
              @click="confirmServerAdd"
            >
              <span v-if="serverPickerInstalling" class="spinner sm" />
              <template v-else>Add ({{ serverPickerSelected.length }})</template>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ExploreHit, ModrinthProjectType, LaunchProfile, ServerStatus } from '../types/index'
import searchIcon from '../assets/icons8-search-50.png'

// ── Tab config ────────────────────────────────────────────────────────────────

const tabs = [
  { label: 'Mods',          type: 'mod'         as ModrinthProjectType },
  { label: 'Modpacks',      type: 'modpack'      as ModrinthProjectType },
  { label: 'Shaders',       type: 'shader'       as ModrinthProjectType },
  { label: 'Resourcepacks', type: 'resourcepack' as ModrinthProjectType },
  { label: 'Servers',       type: null },
  { label: 'Data-packs',    type: 'datapack'     as ModrinthProjectType },
]

const activeTab  = ref<string>('Mods')
const activeType = computed(() => tabs.find(t => t.label === activeTab.value)?.type ?? null)

const showLoaderFilter = computed(() =>
  ['Mods', 'Modpacks', 'Data-packs'].includes(activeTab.value)
)

// ── Filters ───────────────────────────────────────────────────────────────────

const filterVersion    = ref('')
const filterLoader     = ref('')
const filterCategories = ref<string[]>([])

const releaseVersions     = ref<string[]>([])
const availableCategories = ref<{ name: string; project_type: string }[]>([])
const catPanelOpen        = ref(false)

const visibleCategories = computed(() => {
  const type = activeType.value
  if (!type) return []
  return availableCategories.value.filter(c => c.project_type === type)
})

function toggleCategory(name: string) {
  const idx = filterCategories.value.indexOf(name)
  if (idx === -1) filterCategories.value.push(name)
  else filterCategories.value.splice(idx, 1)
}

function removeCategory(name: string) {
  filterCategories.value = filterCategories.value.filter(c => c !== name)
  doSearch()
}

function clearCategories() {
  filterCategories.value = []
  doSearch()
}

async function loadVersions() {
  try {
    const manifest = await window.api.versions.listRemote()
    releaseVersions.value = manifest.versions
      .filter(v => v.type === 'release')
      .slice(0, 20)
      .map(v => v.id)
  } catch {}
}

async function loadCategories() {
  try {
    availableCategories.value = await window.api.modrinth.categories()
  } catch {}
}

// ── Search / results ──────────────────────────────────────────────────────────

const searchInput = ref('')
const results     = ref<ExploreHit[]>([])
const loading     = ref(false)
const error       = ref<string | null>(null)
const totalHits   = ref(0)
const offset      = ref(0)
const hasMore     = computed(() => results.value.length < totalHits.value)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function triggerSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  doSearch()
}

watch(searchInput, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(doSearch, 350)
})

async function doSearch() {
  const type = activeType.value
  if (!type) return
  catPanelOpen.value = false
  results.value   = []
  offset.value    = 0
  totalHits.value = 0
  error.value     = null
  loading.value   = true
  try {
    const cats = filterCategories.value.length ? filterCategories.value : undefined
    const res = await window.api.modrinth.exploreSearch(
      searchInput.value,
      type,
      'modrinth',
      filterVersion.value || undefined,
      filterLoader.value  || undefined,
      0,
      cats,
    )
    results.value   = res.hits
    totalHits.value = res.total
    offset.value    = res.hits.length
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  const type = activeType.value
  if (!type || loading.value) return
  loading.value = true
  try {
    const cats = filterCategories.value.length ? filterCategories.value : undefined
    const res = await window.api.modrinth.exploreSearch(
      searchInput.value,
      type,
      'modrinth',
      filterVersion.value || undefined,
      filterLoader.value  || undefined,
      offset.value,
      cats,
    )
    results.value.push(...res.hits)
    offset.value += res.hits.length
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

function switchTab(label: string) {
  if (activeTab.value === label) return
  activeTab.value        = label
  searchInput.value      = ''
  filterLoader.value     = ''
  filterCategories.value = []
  results.value          = []
  error.value            = null
  catPanelOpen.value     = false
  if (label === 'Servers') {
    refreshServers()
  } else {
    doSearch()
  }
}

// ── Install tracking ──────────────────────────────────────────────────────────

async function loadInstalls() {
  try {
    const data = await window.api.installs.get()
    // Populate installedMap from persisted records
    for (const [projectId, profileIds] of Object.entries(data.mods)) {
      installedMap.value.set(`modrinth-${projectId}`, new Set(profileIds))
    }
    installedMap.value = new Map(installedMap.value)
    // Populate serverAddedMap
    for (const [key, profileIds] of Object.entries(data.servers)) {
      serverAddedMap.value.set(key, new Set(profileIds))
    }
    serverAddedMap.value = new Map(serverAddedMap.value)
  } catch {}
}

// ── Profiles ──────────────────────────────────────────────────────────────────

const profiles        = ref<LaunchProfile[]>([])
const activeProfileId = ref<string | null>(null)

async function loadProfiles() {
  try {
    const [all, active] = await Promise.all([
      window.api.profiles.list(),
      window.api.profiles.getActive(),
    ])
    profiles.value        = all
    activeProfileId.value = active?.id ?? null
  } catch {}
}

// ── Mod install / picker ──────────────────────────────────────────────────────

const installingSet    = ref<Set<string>>(new Set())
const installedMap     = ref<Map<string, Set<string>>>(new Map())
const progressMsg      = ref<string | null>(null)
let progressTimer: ReturnType<typeof setTimeout> | null = null

const pickerHit        = ref<ExploreHit | null>(null)
const pickerSelected   = ref<string[]>([])
const pickerInstalling = ref(false)
const pickerPos        = ref<Record<string, string>>({})

function hitKey(hit: ExploreHit) { return `${hit.source}-${hit.id}` }

function openModPicker(hit: ExploreHit, event: MouseEvent) {
  const btn  = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  const panelW = 280
  let left = rect.right - panelW
  if (left < 8) left = 8
  pickerPos.value = { top: `${rect.bottom + 6}px`, left: `${left}px` }
  pickerHit.value = hit
  const already = installedMap.value.get(hitKey(hit)) ?? new Set<string>()
  const def = activeProfileId.value
  pickerSelected.value = def && !already.has(def) ? [def] : []
}

function closePicker() {
  pickerHit.value      = null
  pickerSelected.value = []
}

async function confirmModInstall() {
  const hit = pickerHit.value
  if (!hit || !pickerSelected.value.length || pickerInstalling.value) return

  const key = hitKey(hit)
  pickerInstalling.value = true
  installingSet.value = new Set([...installingSet.value, key])

  let anyError = false
  for (const profileId of pickerSelected.value) {
    try {
      await runModInstall(hit, profileId)
    } catch (e) {
      showProgress(`Error: ${String(e)}`)
      anyError = true
    }
  }

  installingSet.value.delete(key)
  installingSet.value = new Set(installingSet.value)

  if (!anyError) {
    const existing = installedMap.value.get(key) ?? new Set<string>()
    pickerSelected.value.forEach(pid => existing.add(pid))
    installedMap.value = new Map(installedMap.value).set(key, existing)
    const n = pickerSelected.value.length
    showProgress(`Installed to ${n} profile${n > 1 ? 's' : ''}`)
  }

  pickerInstalling.value = false
  closePicker()
}

async function runModInstall(hit: ExploreHit, profileId: string) {
  if (hit.projectType === 'mod')          await window.api.modrinth.installMod(hit.id, profileId)
  else if (hit.projectType === 'modpack') await window.api.modrinth.installModpack(hit.id, null)
  else if (hit.projectType === 'resourcepack') await window.api.modrinth.installResourcePack(hit.id, profileId)
  else if (hit.projectType === 'shader')  await window.api.modrinth.installShader(hit.id, profileId)
  else if (hit.projectType === 'datapack') await window.api.modrinth.installDatapack(hit.id, profileId)
}

// ── Servers ───────────────────────────────────────────────────────────────────

const servers       = ref<ServerStatus[]>([])
const serversLoading = ref(false)
const serversError  = ref<string | null>(null)

const showAddForm  = ref(false)
const newHost      = ref('')
const newPort      = ref(25565)
const newName      = ref('')
const addingServer = ref(false)

async function refreshServers() {
  serversLoading.value = true
  serversError.value   = null
  try {
    // Returns immediately with all servers in offline state
    servers.value = await window.api.servers.list()
  } catch (e) {
    serversError.value = String(e)
  } finally {
    serversLoading.value = false
  }
}

function applyPingResult(data: { id: string; online: boolean; favicon: string | null; version: string | null; playersOnline: number; playersMax: number; motd: string | null; ping: number }) {
  const idx = servers.value.findIndex(s => s.id === data.id)
  if (idx === -1) return
  servers.value[idx] = { ...servers.value[idx], ...data }
}

async function submitAddServer() {
  if (!newHost.value || addingServer.value) return
  const host = newHost.value.trim()
  const port = newPort.value || 25565
  const name = newName.value.trim() || host
  addingServer.value = true
  try {
    const id = await window.api.servers.add(host, port, name)
    showAddForm.value = false
    newHost.value = ''
    newPort.value = 25565
    newName.value = ''
    // Ping and add to list
    const status = await window.api.servers.ping(host, port)
    servers.value.push({
      id,
      name,
      host,
      port,
      featured:      false,
      online:        status !== null,
      favicon:       status?.favicon ?? null,
      version:       status?.version ?? null,
      playersOnline: status?.playersOnline ?? 0,
      playersMax:    status?.playersMax ?? 0,
      motd:          status?.motd ?? null,
      ping:          status?.ping ?? null,
    })
  } catch (e) {
    showProgress(`Error: ${String(e)}`)
  } finally {
    addingServer.value = false
  }
}

async function deleteServer(id: string) {
  await window.api.servers.remove(id)
  servers.value = servers.value.filter(s => s.id !== id)
}

function pingClass(ping: number | null): string {
  if (ping === null) return ''
  if (ping < 100)  return 'ping-green'
  if (ping < 200)  return 'ping-yellow'
  return 'ping-red'
}

// Server profile picker
// key: "host:port" → Set<profileId>
const serverAddedMap        = ref<Map<string, Set<string>>>(new Map())
const serverPickerServer    = ref<ServerStatus | null>(null)
const serverPickerSelected  = ref<string[]>([])
const serverPickerInstalling = ref(false)

function serverKey(s: ServerStatus) { return `${s.host}:${s.port}` }

function openServerPicker(s: ServerStatus, event: MouseEvent) {
  const btn  = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  const panelW = 280
  let left = rect.right - panelW
  if (left < 8) left = 8
  pickerPos.value = { top: `${rect.bottom + 6}px`, left: `${left}px` }
  serverPickerServer.value   = s
  const already = serverAddedMap.value.get(serverKey(s)) ?? new Set<string>()
  const def = activeProfileId.value
  serverPickerSelected.value = def && !already.has(def) ? [def] : []
}

function closeServerPicker() {
  serverPickerServer.value   = null
  serverPickerSelected.value = []
}

async function confirmServerAdd() {
  const s = serverPickerServer.value
  if (!s || !serverPickerSelected.value.length || serverPickerInstalling.value) return
  serverPickerInstalling.value = true
  let anyError = false
  const key = serverKey(s)
  for (const profileId of serverPickerSelected.value) {
    try {
      await window.api.servers.addToProfile(s.host, s.port, s.name, s.favicon, profileId)
      // Update in-memory map immediately
      const existing = serverAddedMap.value.get(key) ?? new Set<string>()
      existing.add(profileId)
      serverAddedMap.value = new Map(serverAddedMap.value).set(key, existing)
    } catch (e) {
      showProgress(`Error: ${String(e)}`)
      anyError = true
    }
  }
  serverPickerInstalling.value = false
  if (!anyError) {
    const n = serverPickerSelected.value.length
    showProgress(`Server added to ${n} profile${n > 1 ? 's' : ''}`)
  }
  closeServerPicker()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showProgress(msg: string) {
  progressMsg.value = msg
  if (progressTimer) clearTimeout(progressTimer)
  progressTimer = setTimeout(() => { progressMsg.value = null }, 3500)
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const listEl = ref<HTMLElement | null>(null)

onMounted(async () => {
  await Promise.all([loadProfiles(), loadVersions(), loadCategories(), loadInstalls()])
  window.api.modrinth.onProgress(msg => showProgress(msg))
  window.api.servers.onPingResult(data => applyPingResult(data as Parameters<typeof applyPingResult>[0]))
  doSearch()
})

onUnmounted(() => {
  if (searchTimer)   clearTimeout(searchTimer)
  if (progressTimer) clearTimeout(progressTimer)
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
.explore-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 8px;
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
  flex-wrap: wrap;
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
    border-color: rgba(255,255,255,0.61);
    box-shadow: inset 0 -2px 0 rgba(255,255,255,0.3);
  }
}

// ── Controls row ──────────────────────────────────────────────────────────────
.controls-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: wrap;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.61);
  height: 32px;
  padding: 0 10px;
  flex: 0 0 260px;
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
  width: 14px;
  height: 14px;
  opacity: 0.5;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.filter-select {
  height: 32px;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.5);
  color: #888;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.03em;
  padding: 0 8px;
  cursor: pointer;
  outline: none;
  appearance: none;
  border-radius: 0;
  transition: border-color 80ms, color 80ms;

  &:hover, &:focus { border-color: rgba(200,200,200,0.5); color: #bbb; }
  option { background: #111; color: #aaa; }
}

.cat-btn {
  cursor: pointer;
  background: #0a0a0b;
  &.active { border-color: rgba(255,255,255,0.55); color: #d9d9d9; }
}

// ── Chip row ──────────────────────────────────────────────────────────────────
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  flex-shrink: 0;
}

.chip {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #aaa;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.18);
  padding: 2px 8px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: background 60ms, color 60ms;

  &:hover { background: rgba(255,255,255,0.1); color: #ccc; }
  &--clear { color: #555; background: transparent; border-color: rgba(255,255,255,0.08); &:hover { color: #888; } }
}

// ── Servers tab ───────────────────────────────────────────────────────────────
.servers-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.servers-topbar {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.server-action-btn {
  padding: 6px 16px;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.5);
  color: #888;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  cursor: pointer;
  border-radius: 0;
  transition: background 80ms, border-color 80ms, color 80ms;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) { background: #111; border-color: rgba(200,200,200,0.5); color: #ccc; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

.add-server-form {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px 12px;
  background: rgba(10,10,11,0.85);
  border: 1px solid rgba(255,255,255,0.08);
}

.server-input {
  height: 30px;
  background: #0d0d0d;
  border: 1px solid rgba(118,119,120,0.5);
  color: #aaa;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.03em;
  padding: 0 8px;
  outline: none;
  border-radius: 0;
  flex: 1;
  min-width: 140px;

  &::placeholder { color: #444; }
  &:focus { border-color: rgba(200,200,200,0.5); color: #bbb; }
  &--port { flex: 0 0 70px; min-width: 70px; }
}

.server-add-confirm {
  height: 30px;
  padding: 0 16px;
  background: #111;
  border: 1px solid rgba(255,255,255,0.28);
  color: #ccc;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  cursor: pointer;
  border-radius: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  transition: background 80ms, border-color 80ms;

  &:hover:not(:disabled) { background: #1e1e1e; border-color: rgba(255,255,255,0.55); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

.server-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #333; }
}

.server-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 18px 20px;
  background: rgba(10,10,11,0.78);
  border: 1px solid rgba(255,255,255,0.05);
  transition: background 80ms, border-color 80ms;
  flex-shrink: 0;

  &:hover { background: rgba(20,20,22,0.9); border-color: rgba(255,255,255,0.1); }
  &.offline { opacity: 0.5; }
}

.server-favicon-wrap {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.server-favicon {
  width: 72px;
  height: 72px;
  object-fit: cover;
  image-rendering: pixelated;
  display: block;
}

.server-favicon-fallback {
  width: 72px;
  height: 72px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Mojangles', monospace;
  font-size: 30px;
  color: #444;
  text-transform: uppercase;
}

.server-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.server-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.server-name {
  font-family: 'Mojangles', monospace;
  font-size: 15px;
  color: #d9d9d9;
  letter-spacing: 0.02em;
}

.server-badge {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #7aad7a;
  background: rgba(76,175,80,0.1);
  border: 1px solid rgba(76,175,80,0.3);
  padding: 1px 5px;
  letter-spacing: 0.06em;
}

.server-pinging-badge {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #666;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 1px 5px;
  letter-spacing: 0.06em;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse { 0%, 100% { opacity: 0.4 } 50% { opacity: 1 } }

.server-offline-badge {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #8b3333;
  background: rgba(139,51,51,0.1);
  border: 1px solid rgba(139,51,51,0.3);
  padding: 1px 5px;
  letter-spacing: 0.06em;
}

.server-motd {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #666;
  letter-spacing: 0.02em;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server-ip {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #444;
  letter-spacing: 0.03em;
}

.server-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  min-width: 130px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #444;
  letter-spacing: 0.06em;
  min-width: 54px;
}

.stat-value {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #888;
  letter-spacing: 0.02em;
}

.version-val {
  font-size: 8px;
  color: #555;
}

.ping-green  { color: #4caf50; }
.ping-yellow { color: #ffc107; }
.ping-red    { color: #f44336; }

.server-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.server-remove-btn {
  background: none;
  border: none;
  color: #333;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 80ms;
  &:hover { color: #888; }
}

// ── Content list ──────────────────────────────────────────────────────────────
.content-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #333; }
}

.state-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-text {
  font-family: 'Mojangles', monospace;
  font-size: 12px;
  color: #333;
  letter-spacing: 0.12em;
}

.error-text { color: #8b3333; }

// ── Mod row ───────────────────────────────────────────────────────────────────
.mod-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 18px;
  background: rgba(10,10,11,0.72);
  border: 1px solid rgba(255,255,255,0.04);
  transition: background 80ms, border-color 80ms;
  flex-shrink: 0;

  &:hover { background: rgba(20,20,22,0.85); border-color: rgba(255,255,255,0.09); }
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.mod-tag {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #555;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 2px 7px;
  letter-spacing: 0.03em;
}

// ── Install area ──────────────────────────────────────────────────────────────
.install-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.installed-tick {
  font-family: 'Mojangles', monospace;
  font-size: 13px;
  color: #4caf50;
  line-height: 1;
  text-shadow: 0 0 8px rgba(76,175,80,0.5);
}

.install-btn {
  flex-shrink: 0;
  padding: 10px 22px;
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #ccc;
  background: #111;
  border: 1px solid rgba(255,255,255,0.25);
  cursor: pointer;
  letter-spacing: 0.06em;
  transition: background 80ms, border-color 80ms, color 80ms;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 72px;

  &:hover:not(:disabled) { background: #1e1e1e; border-color: rgba(255,255,255,0.55); color: #fff; }
  &:disabled { opacity: 0.28; cursor: not-allowed; }
}

// ── Load more ─────────────────────────────────────────────────────────────────
.load-more-row {
  display: flex;
  justify-content: center;
  padding: 14px 0;
  flex-shrink: 0;
}

.load-more-btn {
  padding: 8px 32px;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #888;
  background: #0d0d0d;
  border: 1px solid rgba(137,137,137,0.4);
  cursor: pointer;
  letter-spacing: 0.08em;
  transition: background 80ms, border-color 80ms, color 80ms;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) { background: #1a1a1a; border-color: rgba(200,200,200,0.4); color: #ccc; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

// ── Category panel ────────────────────────────────────────────────────────────
.cat-panel {
  position: absolute;
  top: 104px;
  left: 20px;
  right: 20px;
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 8px 32px rgba(0,0,0,0.85);
  z-index: 10;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
}

.cat-panel-title {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #aaa;
  letter-spacing: 0.06em;
  margin: 0;
  flex-shrink: 0;
}

.cat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}

.cat-chip {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #777;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 4px 10px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: background 60ms, color 60ms, border-color 60ms;
  border-radius: 0;

  &:hover { background: rgba(255,255,255,0.08); color: #bbb; }
  &.active { background: rgba(76,175,80,0.12); border-color: rgba(76,175,80,0.5); color: #81c784; }
}

.cat-panel-footer {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  padding-top: 4px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.cat-close-btn {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #ccc;
  background: #111;
  border: 1px solid rgba(255,255,255,0.3);
  padding: 6px 20px;
  cursor: pointer;
  letter-spacing: 0.06em;
  transition: background 80ms, border-color 80ms;

  &:hover { background: #1e1e1e; border-color: rgba(255,255,255,0.6); }
}

// ── Spinners ──────────────────────────────────────────────────────────────────
.spinner {
  border-radius: 50%;
  border-style: solid;
  border-top-color: #ccc;
  border-color: #444;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;

  &.sm { width: 11px; height: 11px; border-width: 1.5px; }
  &.lg { width: 24px; height: 24px; border-width: 2.5px; }
}

@keyframes spin { to { transform: rotate(360deg); } }

// ── Progress toast ────────────────────────────────────────────────────────────
.progress-toast {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  border: 1px solid rgba(255,255,255,0.18);
  padding: 8px 20px;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #ccc;
  letter-spacing: 0.04em;
  z-index: 50;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0,0,0,0.7);
}

// ── Transitions ───────────────────────────────────────────────────────────────
.toast-enter-active { transition: opacity 150ms, transform 150ms; }
.toast-leave-active { transition: opacity 200ms; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(8px); }
.toast-leave-to     { opacity: 0; }

.tick-enter-active { transition: opacity 250ms, transform 250ms; }
.tick-enter-from   { opacity: 0; transform: scale(0.5); }

.cat-enter-active { transition: opacity 120ms, transform 120ms; }
.cat-leave-active { transition: opacity 80ms; }
.cat-enter-from   { opacity: 0; transform: translateY(-4px); }
.cat-leave-to     { opacity: 0; }

.add-form-enter-active { transition: opacity 120ms, transform 120ms; }
.add-form-leave-active { transition: opacity 80ms; }
.add-form-enter-from   { opacity: 0; transform: translateY(-4px); }
.add-form-leave-to     { opacity: 0; }
</style>

<style lang="scss">
@font-face {
  font-family: 'Mojangles';
  src: url('../assets/fonts/mojangles.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.picker-overlay { position: fixed; inset: 0; z-index: 4000; }

.picker-panel {
  position: absolute;
  width: 280px;
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 8px 32px rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 380px;
}

.picker-title {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #d9d9d9;
  letter-spacing: 0.06em;
  margin: 0;
  padding: 12px 14px 4px;
}

.picker-sub {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #555;
  letter-spacing: 0.03em;
  margin: 0;
  padding: 0 14px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.picker-empty {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #444;
  padding: 14px;
  text-align: center;
  letter-spacing: 0.04em;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 60ms;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  overflow-y: auto;

  &:hover:not(.installed) { background: rgba(255,255,255,0.04); }
  &.checked    { background: rgba(255,255,255,0.05); }
  &.installed  { cursor: default; opacity: 0.55; }
}

.picker-check { width: 13px; height: 13px; accent-color: #4caf50; flex-shrink: 0; cursor: pointer; }

.picker-already-tick {
  font-family: 'Mojangles', monospace;
  font-size: 12px;
  color: #4caf50;
  flex-shrink: 0;
  width: 13px;
  text-align: center;
}

.picker-profile-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }

.picker-profile-name {
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  color: #ccc;
  letter-spacing: 0.03em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-profile-meta {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #555;
  letter-spacing: 0.02em;
}

.picker-installed-label {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #4caf50;
  letter-spacing: 0.04em;
  margin-left: auto;
  flex-shrink: 0;
}

.picker-footer {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  padding: 10px 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.picker-btn {
  padding: 6px 14px;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  cursor: pointer;
  letter-spacing: 0.04em;
  border: 1px solid;
  transition: background 80ms, border-color 80ms, color 80ms;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 0;

  &--cancel {
    background: transparent;
    color: #666;
    border-color: rgba(255,255,255,0.1);
    &:hover { color: #aaa; border-color: rgba(255,255,255,0.25); }
  }

  &--confirm {
    background: #111;
    color: #ccc;
    border-color: rgba(255,255,255,0.3);
    &:hover:not(:disabled) { background: #1e1e1e; border-color: rgba(255,255,255,0.6); color: #fff; }
    &:disabled { opacity: 0.28; cursor: not-allowed; }
  }
}

.picker-enter-active { transition: opacity 120ms, transform 120ms; }
.picker-leave-active { transition: opacity 80ms; }
.picker-enter-from   { opacity: 0; }
.picker-enter-from .picker-panel { transform: translateY(-4px); }
.picker-leave-to     { opacity: 0; }
</style>
