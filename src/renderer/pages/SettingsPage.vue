<template>
  <div class="settings-page">

    <!-- Left section nav -->
    <nav class="section-nav">
      <button
        v-for="s in sections"
        :key="s.key"
        class="section-btn"
        :class="{ active: activeSection === s.key }"
        :data-label="s.label"
        @click="activeSection = s.key"
      >
        <component :is="s.icon" class="section-icon" />
      </button>
    </nav>

    <!-- Content -->
    <div class="section-content">

      <div class="section-heading">
        <span class="section-title">{{ currentSection?.label }}</span>
        <span class="section-divider" />
      </div>

      <!-- ── GAME ──────────────────────────────────────────────────────────── -->
      <template v-if="activeSection === 'game'">

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Game Directory</span>
              <span class="setting-desc">Where Minecraft data lives (.minecraft)</span>
            </div>
            <div class="setting-control path-control">
              <span class="path-text">{{ s.game.defaultGameDir || 'Default' }}</span>
              <button class="browse-btn" @click="pickGameDir">BROWSE</button>
              <button v-if="s.game.defaultGameDir" class="clear-btn" @click="clearGameDir">✕</button>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Java Executable</span>
              <span class="setting-desc">Leave blank to use auto-detected Java</span>
            </div>
            <div class="setting-control path-control">
              <span class="path-text">{{ s.game.defaultJavaPath || 'Auto' }}</span>
              <button class="browse-btn" @click="pickJava">BROWSE</button>
              <button v-if="s.game.defaultJavaPath" class="clear-btn" @click="clearJava">✕</button>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Minimum RAM</span>
              <span class="setting-desc">{{ s.game.minRam }} MB</span>
            </div>
            <div class="setting-control slider-control">
              <span class="slider-val">{{ s.game.minRam }}M</span>
              <input
                type="range" class="slider" min="512" max="4096" step="256"
                :value="s.game.minRam"
                @input="s.game.minRam = +($event.target as HTMLInputElement).value; save()"
              />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Maximum RAM</span>
              <span class="setting-desc">{{ s.game.maxRam }} MB</span>
            </div>
            <div class="setting-control slider-control">
              <span class="slider-val">{{ (s.game.maxRam / 1024).toFixed(1) }}G</span>
              <input
                type="range" class="slider" min="1024" max="16384" step="512"
                :value="s.game.maxRam"
                @input="s.game.maxRam = +($event.target as HTMLInputElement).value; save()"
              />
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Resolution</span>
              <span class="setting-desc">Window size on launch</span>
            </div>
            <div class="setting-control res-control">
              <input
                type="number" class="num-input" placeholder="W"
                :value="s.game.resolution.width"
                @change="s.game.resolution.width = +($event.target as HTMLInputElement).value; save()"
              />
              <span class="res-x">×</span>
              <input
                type="number" class="num-input" placeholder="H"
                :value="s.game.resolution.height"
                @change="s.game.resolution.height = +($event.target as HTMLInputElement).value; save()"
              />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Fullscreen</span>
              <span class="setting-desc">Launch in fullscreen mode</span>
            </div>
            <div class="setting-control">
              <div class="toggle" :class="{ 'toggle--on': s.game.fullscreen }" @click="s.game.fullscreen = !s.game.fullscreen; save()" />
            </div>
          </div>

          <div class="setting-row setting-row--tall">
            <div class="setting-info">
              <span class="setting-label">JVM Arguments</span>
              <span class="setting-desc">Extra flags passed to Java</span>
            </div>
            <div class="setting-control">
              <input
                type="text" class="text-input wide-input"
                placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=50"
                :value="s.game.jvmArgs"
                @change="s.game.jvmArgs = ($event.target as HTMLInputElement).value; save()"
              />
            </div>
          </div>
        </div>

      </template>

      <!-- ── LAUNCHER ──────────────────────────────────────────────────────── -->
      <template v-else-if="activeSection === 'launcher'">

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Close on Launch</span>
              <span class="setting-desc">Hide launcher when Minecraft starts</span>
            </div>
            <div class="setting-control">
              <div class="toggle" :class="{ 'toggle--on': s.launcher.closeOnLaunch }" @click="s.launcher.closeOnLaunch = !s.launcher.closeOnLaunch; save()" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Keep Launcher Open</span>
              <span class="setting-desc">Don't exit after game closes</span>
            </div>
            <div class="setting-control">
              <div class="toggle" :class="{ 'toggle--on': s.launcher.keepLauncherOpen }" @click="s.launcher.keepLauncherOpen = !s.launcher.keepLauncherOpen; save()" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Auto-Update Launcher</span>
              <span class="setting-desc">Download launcher updates automatically</span>
            </div>
            <div class="setting-control">
              <div class="toggle" :class="{ 'toggle--on': s.launcher.autoUpdate }" @click="s.launcher.autoUpdate = !s.launcher.autoUpdate; save()" />
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Concurrent Downloads</span>
              <span class="setting-desc">Parallel file downloads</span>
            </div>
            <div class="setting-control slider-control">
              <span class="slider-val">{{ s.launcher.concurrentDownloads }}</span>
              <input
                type="range" class="slider" min="1" max="32" step="1"
                :value="s.launcher.concurrentDownloads"
                @input="s.launcher.concurrentDownloads = +($event.target as HTMLInputElement).value; save()"
              />
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">UI Sounds</span>
              <span class="setting-desc">Click and hover sound effects</span>
            </div>
            <div class="setting-control">
              <div class="toggle" :class="{ 'toggle--on': s.launcher.soundEnabled }" @click="s.launcher.soundEnabled = !s.launcher.soundEnabled; save()" />
            </div>
          </div>

          <div class="setting-row" :class="{ 'setting-row--muted': !s.launcher.soundEnabled }">
            <div class="setting-info">
              <span class="setting-label">Volume</span>
              <span class="setting-desc">{{ s.launcher.soundVolume }}%</span>
            </div>
            <div class="setting-control slider-control">
              <span class="slider-val">{{ s.launcher.soundVolume }}%</span>
              <input
                type="range" class="slider" min="0" max="100" step="5"
                :value="s.launcher.soundVolume"
                :disabled="!s.launcher.soundEnabled"
                @input="s.launcher.soundVolume = +($event.target as HTMLInputElement).value; save()"
              />
            </div>
          </div>

          <div class="setting-row" :class="{ 'setting-row--muted': !s.launcher.soundEnabled }">
            <div class="setting-info">
              <span class="setting-label">Sound Style</span>
              <span class="setting-desc">Choose click feel</span>
            </div>
            <div class="setting-control">
              <div class="seg-control">
                <button
                  class="seg-btn"
                  :class="{ active: s.launcher.soundStyle === 'soft' }"
                  :disabled="!s.launcher.soundEnabled"
                  @click="s.launcher.soundStyle = 'soft'; save()"
                >SOFT</button>
                <button
                  class="seg-btn"
                  :class="{ active: s.launcher.soundStyle === 'clicky' }"
                  :disabled="!s.launcher.soundEnabled"
                  @click="s.launcher.soundStyle = 'clicky'; save()"
                >CLICKY</button>
              </div>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-row setting-row--tall">
            <div class="setting-info">
              <span class="setting-label">CurseForge API Key</span>
              <span class="setting-desc">Required for CurseForge mod downloads</span>
            </div>
            <div class="setting-control">
              <input
                type="password" class="text-input wide-input"
                placeholder="••••••••••••••••••••"
                :value="s.launcher.curseforgeApiKey"
                @change="s.launcher.curseforgeApiKey = ($event.target as HTMLInputElement).value; save()"
              />
            </div>
          </div>
        </div>

      </template>

      <!-- ── APPEARANCE ────────────────────────────────────────────────────── -->
      <template v-else-if="activeSection === 'appearance'">

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Accent Color</span>
              <span class="setting-desc">Primary highlight color across the UI</span>
            </div>
            <div class="setting-control accent-control">
              <div class="color-swatches">
                <button
                  v-for="c in accentPresets"
                  :key="c"
                  class="color-swatch"
                  :class="{ active: s.appearance.accentColor === c }"
                  :style="{ background: c }"
                  @click="s.appearance.accentColor = c; save()"
                />
              </div>
              <label class="color-custom" title="Custom color">
                <input
                  type="color"
                  class="color-input"
                  :value="s.appearance.accentColor"
                  @input="s.appearance.accentColor = ($event.target as HTMLInputElement).value; save()"
                />
                <span class="color-hex">{{ s.appearance.accentColor }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Language</span>
              <span class="setting-desc">UI display language</span>
            </div>
            <div class="setting-control">
              <select
                class="select-input"
                :value="s.appearance.language"
                @change="s.appearance.language = ($event.target as HTMLSelectElement).value; save()"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>
        </div>

      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useSettingsStore } from '../store/settingsStore'

const settingsStore = useSettingsStore()
const s = computed(() => settingsStore.settings)

async function save() { await settingsStore.save() }
async function pickGameDir() { await settingsStore.chooseGameDir() }
async function pickJava()    { await settingsStore.chooseJava() }
function clearGameDir() { s.value.game.defaultGameDir = ''; save() }
function clearJava()    { s.value.game.defaultJavaPath = ''; save() }

const accentPresets = ['#27ade0', '#f97316', '#30d158', '#e879f9', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa']

// ── Section icons (inline SVG components) ─────────────────────────────────────
const IconGame = {
  render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }),
    h('line', { x1: 8, y1: 21, x2: 16, y2: 21 }),
    h('line', { x1: 12, y1: 17, x2: 12, y2: 21 }),
  ])
}

const IconLauncher = {
  render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
    h('path', { d: 'M2 17l10 5 10-5' }),
    h('path', { d: 'M2 12l10 5 10-5' }),
  ])
}

const IconAppearance = {
  render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('circle', { cx: 12, cy: 12, r: 10 }),
    h('path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 10 10 0 0 0 0-20' }),
  ])
}

const sections = [
  { key: 'game',       label: 'Game',       icon: IconGame       },
  { key: 'launcher',   label: 'Launcher',   icon: IconLauncher   },
  { key: 'appearance', label: 'Appearance', icon: IconAppearance },
]

const activeSection = ref('game')
const currentSection = computed(() => sections.find(s => s.key === activeSection.value))
</script>

<style lang="scss" scoped>
@font-face {
  font-family: 'Mojangles';
  src: url('../assets/fonts/mojangles.ttf') format('truetype');
}

// ── Page shell ────────────────────────────────────────────────────────────────
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: row;
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

// ── Left section nav ──────────────────────────────────────────────────────────
.section-nav {
  width: 56px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 4px;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.3);
}

.section-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  position: relative;
  transition: background 80ms, border-color 80ms;

  // tooltip
  &::after {
    content: attr(data-label);
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    background: #111;
    color: #ccc;
    font-family: 'Mojangles', monospace;
    font-size: 10px;
    letter-spacing: 0.04em;
    padding: 4px 10px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    border: 1px solid rgba(255,255,255,0.1);
    transition: opacity 100ms, transform 100ms;
    transition-delay: 0s;
    z-index: 50;
  }

  &:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.08);

    &::after {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
      transition-delay: 180ms;
    }
  }

  &.active {
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.15);
    box-shadow: inset 2px 0 0 var(--accent, #27ade0);
  }
}

.section-icon {
  width: 18px;
  height: 18px;
  color: #555;
  transition: color 80ms;

  .section-btn:hover &  { color: #aaa; }
  .section-btn.active & { color: #ccc; }
}

// ── Section content ───────────────────────────────────────────────────────────
.section-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  scrollbar-width: thin;
  scrollbar-color: #282828 transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #282828; }
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.section-title {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #555;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}

.section-divider {
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.06);
}

// ── Setting group ─────────────────────────────────────────────────────────────
.setting-group {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(8,8,10,0.6);
  overflow: hidden;
}

// ── Setting row ───────────────────────────────────────────────────────────────
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  min-height: 56px;
  transition: background 80ms;

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.02); }
  &--tall { align-items: flex-start; padding-top: 16px; padding-bottom: 16px; }
  &--muted { opacity: 0.4; pointer-events: none; }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex-shrink: 0;
  max-width: 55%;
}

.setting-label {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #d9d9d9;
  letter-spacing: 0.02em;
}

.setting-desc {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  color: #444;
  letter-spacing: 0.03em;
  line-height: 1.5;
}

// ── Setting control wrapper ───────────────────────────────────────────────────
.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
.toggle {
  width: 38px;
  height: 22px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 11px;
  position: relative;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    background: #444;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 150ms cubic-bezier(0.2,0,0,1), background 150ms;
  }

  &--on {
    background: color-mix(in srgb, var(--accent, #27ade0) 18%, #0d0d0d);
    border-color: color-mix(in srgb, var(--accent, #27ade0) 60%, transparent);

    &::after {
      background: var(--accent, #27ade0);
      transform: translateX(16px);
    }
  }
}

// ── Slider ────────────────────────────────────────────────────────────────────
.slider-control {
  gap: 10px;
}

.slider-val {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #555;
  letter-spacing: 0.04em;
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.slider {
  width: 140px;
  height: 3px;
  -webkit-appearance: none;
  background: #2a2a2a;
  border-radius: 2px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 13px;
    height: 13px;
    background: var(--accent, #27ade0);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 100ms;
    &:hover { transform: scale(1.2); }
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    &::-webkit-slider-thumb { cursor: not-allowed; }
  }
}

// ── Text input ────────────────────────────────────────────────────────────────
.text-input {
  height: 32px;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.5);
  color: #aaa;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.02em;
  padding: 0 10px;
  outline: none;
  transition: border-color 100ms;
  width: 200px;

  &:focus { border-color: rgba(255,255,255,0.35); color: #ccc; }
  &::placeholder { color: #333; }

  &.wide-input { width: 260px; }
}

// ── Number input ──────────────────────────────────────────────────────────────
.num-input {
  width: 64px;
  height: 32px;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.5);
  color: #aaa;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.02em;
  padding: 0 8px;
  outline: none;
  text-align: center;
  transition: border-color 100ms;

  &:focus { border-color: rgba(255,255,255,0.35); color: #ccc; }
  &::-webkit-inner-spin-button { -webkit-appearance: none; }
}

.res-control { gap: 6px; }
.res-x {
  font-family: 'Mojangles', monospace;
  font-size: 11px;
  color: #333;
}

// ── Path control ──────────────────────────────────────────────────────────────
.path-control {
  max-width: 380px;
  gap: 6px;
}

.path-text {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #555;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  flex-shrink: 1;
  min-width: 0;
}

.browse-btn {
  font-family: 'Mojangles', monospace;
  font-size: 8px;
  letter-spacing: 0.08em;
  padding: 5px 12px;
  background: #0d0d0d;
  border: 1px solid rgba(137,137,137,0.5);
  color: #888;
  cursor: pointer;
  transition: background 80ms, border-color 80ms, color 80ms;
  flex-shrink: 0;

  &:hover { background: #1a1a1a; border-color: rgba(255,255,255,0.4); color: #ccc; }
}

.clear-btn {
  width: 22px;
  height: 22px;
  background: transparent;
  border: 1px solid transparent;
  color: #333;
  font-size: 9px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 80ms, border-color 80ms;

  &:hover { color: #888; border-color: rgba(255,255,255,0.1); }
}

// ── Select ────────────────────────────────────────────────────────────────────
.select-input {
  height: 32px;
  background: #0a0a0b;
  border: 1px solid rgba(118,119,120,0.5);
  color: #aaa;
  font-family: 'Mojangles', monospace;
  font-size: 10px;
  letter-spacing: 0.03em;
  padding: 0 8px;
  outline: none;
  cursor: pointer;
  appearance: none;
  min-width: 120px;
  transition: border-color 100ms;

  &:focus { border-color: rgba(255,255,255,0.35); }
  option { background: #111; }
}

// ── Segmented control ─────────────────────────────────────────────────────────
.seg-control {
  display: flex;
  border: 1px solid rgba(118,119,120,0.5);
  overflow: hidden;
}

.seg-btn {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  letter-spacing: 0.07em;
  padding: 6px 14px;
  background: #0a0a0b;
  border: none;
  color: #555;
  cursor: pointer;
  transition: background 80ms, color 80ms;

  & + & { border-left: 1px solid rgba(118,119,120,0.5); }
  &:hover:not(:disabled) { background: #1a1a1a; color: #aaa; }
  &.active { background: rgba(255,255,255,0.07); color: #d9d9d9; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

// ── Accent color picker ───────────────────────────────────────────────────────
.accent-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-swatches {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  max-width: 160px;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 100ms, border-color 100ms;
  flex-shrink: 0;

  &:hover { transform: scale(1.15); }
  &.active { border-color: #fff; }
}

.color-custom {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  border: 1px solid rgba(118,119,120,0.5);
  padding: 4px 8px;
  background: #0a0a0b;
  transition: border-color 100ms;

  &:hover { border-color: rgba(255,255,255,0.35); }
}

.color-input {
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  flex-shrink: 0;
}

.color-hex {
  font-family: 'Mojangles', monospace;
  font-size: 9px;
  color: #666;
  letter-spacing: 0.04em;
}
</style>
