<template>
  <div class="settings-section">
    <div class="about-header">
      <div class="about-logo">
        <img src="/src/assets/logo.png" alt="BejaClient Logo" class="logo-img" />
      </div>
      <div class="about-title-group">
        <h1 class="app-name">BejaClient</h1>
        <span class="app-tagline">A Better Minecraft Launcher</span>
        <span class="app-version">Version {{ version }}</span>
      </div>
    </div>

    <div class="about-grid">
      <div class="about-card">
        <h3 class="card-title">Engine</h3>
        <p class="card-text">Built on <span class="highlight">BejaClient's own launcher core</span> — in-house version resolution, asset/library downloading, and game launching, with no third-party launcher library dependency.</p>
      </div>
      <div class="about-card">
        <h3 class="card-title">Technology</h3>
        <div class="tech-list">
          <span v-for="tech in techs" :key="tech" class="tech-badge">{{ tech }}</span>
        </div>
      </div>
    </div>

    <div class="about-links">
      <button class="link-btn" @click="open('https://portal.azure.com/')">
        Azure App Setup
      </button>
    </div>

    <div class="config-note">
      <span class="note-label">Azure Client ID</span>
      <span class="note-text">
        To enable Microsoft login, register an Azure app at portal.azure.com and set the
        <code>BEJACLIENT_AZURE_CLIENT_ID</code> environment variable (or replace the constant in
        <code>src/main/services/authService.ts</code>).
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const version = ref('…')
onMounted(async () => { version.value = await window.api.system.getVersion() })

const techs = ['Electron', 'Vue 3', 'TypeScript', 'skinview3d', 'Pinia', 'Vite']

function open(url: string) {
  window.api.system.openExternal(url)
}
</script>

<style lang="scss" scoped>
.settings-section {
  display: flex;
  flex-direction: column;
  gap: $sp-6;
  max-width: 640px;
}

.about-header {
  display: flex;
  align-items: center;
  gap: $sp-5;
  padding-bottom: $sp-6;
  border-bottom: 1px solid $border;
}

.about-logo {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.about-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-name {
  font-size: 28px;
  font-weight: 900;
  color: $text-primary;
  letter-spacing: -0.02em;
}

.app-tagline {
  font-size: 14px;
  color: $text-secondary;
}

.app-version {
  font-size: 12px;
  color: $muted;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-4;
}

.about-card {
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius;
  padding: $sp-4;
  display: flex;
  flex-direction: column;
  gap: $sp-3;
}

.card-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $muted;
}

.card-text {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.6;
}

.highlight {
  color: $primary;
  font-weight: 600;
}

.tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-2;
}

.tech-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px $sp-2;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius-sm;
  color: $text-secondary;
  letter-spacing: 0.04em;
}

.about-links {
  display: flex;
  gap: $sp-3;
}

.link-btn {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  background: $surface-elevated;
  border: 1px solid $border;
  border-radius: $radius;
  padding: $sp-2 $sp-4;
  cursor: pointer;
  transition: background $transition;

  &:hover {
    background: $border;
    color: $text-primary;
  }
}

.config-note {
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius;
  padding: $sp-4;
  display: flex;
  flex-direction: column;
  gap: $sp-2;
}

.note-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $warning;
}

.note-text {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.6;

  code {
    background: $surface-elevated;
    border: 1px solid $border;
    border-radius: 2px;
    padding: 1px 4px;
    font-size: 11px;
    color: $text-secondary;
  }
}
</style>
