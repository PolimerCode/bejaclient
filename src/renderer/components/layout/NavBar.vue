<template>
  <aside class="sidebar">

    <!-- Logo -->
    <div class="sidebar-logo">
      <img :src="logoUrl" class="logo-img" alt="BC" />
    </div>

    <div class="sidebar-divider" />

    <!-- Nav items -->
    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path, item.exact) }"
        :data-label="item.label"
        @mouseenter="playHover"
      >
        <img class="nav-icon-img" :src="item.icon" :alt="item.label" />
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        <span v-if="item.wip" class="nav-wip">
          <svg class="wip-clock" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/>
            <line class="clock-min" x1="7" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="7" y1="7" x2="7" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </span>
      </RouterLink>
    </nav>

    <!-- Drag spacer -->
    <div class="sidebar-spacer" />

    <div class="sidebar-divider" />

    <!-- Footer links -->
    <div class="sidebar-footer">
      <button class="footer-link" @click="openExternal('https://bejaclient.com/terms')">{{ $t('nav.footer.terms') }}</button>
      <button class="footer-link" @click="openExternal('https://bejaclient.com/privacy')">{{ $t('nav.footer.privacy') }}</button>
      <button class="footer-link" @click="openExternal('https://bejaclient.com/support')">{{ $t('nav.footer.support') }}</button>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLauncherStore } from '../../store/launcherStore'
import { useFriendsStore }  from '../../store/friendsStore'
import { playHover }        from '../../composables/useSounds'

import logoUrl       from '../../assets/bc-logo-new.png'
import iconPlay      from '../../assets/icons8-spielen-64.png'
import iconLocker    from '../../assets/icons8-kimono-64.png'
import iconExplore   from '../../assets/icons8-kompass-48.png'
import iconProfiles  from '../../assets/icons8-name-50.png'
import iconFriends   from '../../assets/icons8-freunde-64.png'
import iconQuests    from '../../assets/icons8-aufgabe-50.png'
import iconPass      from '../../assets/icons8-passieren-50.png'
import iconCrates    from '../../assets/icons8-package-50.png'
import iconShop      from '../../assets/icons8-rakete-50.png'
import iconSettings  from '../../assets/icons8-settings-50.png'

const route         = useRoute()
const launcherStore = useLauncherStore()
const friendsStore  = useFriendsStore()
const { t } = useI18n()

const navItems = computed(() => [
  { label: t('nav.hub'),        path: '/',          exact: true,  icon: iconPlay,     badge: null },
  { label: t('nav.locker'),     path: '/cosmetics', exact: false, icon: iconLocker,   badge: null },
  { label: t('nav.explore'),    path: '/mods',      exact: false, icon: iconExplore,  badge: null },
  { label: t('nav.profiles'),   path: '/profiles',  exact: false, icon: iconProfiles, badge: null },
  { label: t('nav.friends'),    path: '/friends',   exact: false, icon: iconFriends,  badge: friendsStore.pendingCount || null },
  { label: t('nav.clientPass'), path: '/pass',      exact: false, icon: iconPass,     badge: null, wip: true },
  { label: 'Crates',           path: '/crates',    exact: false, icon: iconCrates,   badge: null, wip: true },
  { label: 'Shop',             path: '/shop',      exact: false, icon: iconShop,     badge: null, wip: true },
  { label: t('nav.quests'),    path: '/quests',    exact: false, icon: iconQuests,   badge: null, wip: true },
  { label: t('nav.settings'),   path: '/settings',  exact: false, icon: iconSettings, badge: null },
])

function isActive(path: string, exact: boolean) {
  return exact ? route.path === path : route.path.startsWith(path)
}

function openExternal(url: string) {
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 88px;
  height: 100vh;
  background: #1a1c1e;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  z-index: 100;
  overflow: visible;
  position: relative;
  -webkit-app-region: drag;
}

// ── Right-border sweep ────────────────────────────────────────────────────────
.sidebar::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 1px;
  height: 240px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.55) 40%,
    rgba(255, 255, 255, 0.9) 50%,
    rgba(255, 255, 255, 0.55) 60%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 101;
  will-change: transform;
  animation: border-sweep 20s linear infinite;
}

@keyframes border-sweep {
  0%  { transform: translateY(100vh); opacity: 0; animation-timing-function: cubic-bezier(0.4, 0, 0.15, 1); }
  1%  { opacity: 1; }
  47% { opacity: 1; }
  49% { transform: translateY(-240px); opacity: 0; }
  50% { transform: translateY(-240px); opacity: 0; animation-timing-function: cubic-bezier(0.85, 0, 0.55, 1); }
  51% { opacity: 1; }
  98% { opacity: 1; }
  99% { transform: translateY(100vh); opacity: 0; }
  100% { transform: translateY(100vh); opacity: 0; }
}

// ── Logo ──────────────────────────────────────────────────────────────────────
.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 0 16px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.logo-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.85;
}

// ── Divider ───────────────────────────────────────────────────────────────────
.sidebar-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 0 16px;
  flex-shrink: 0;
}

// ── Nav items ─────────────────────────────────────────────────────────────────
.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 0;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  transition: background $transition-fast;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    border-radius: 11px;
    padding: 2px;
    background: linear-gradient(160deg, #354B74, #1e3050, #111B29);
    background-size: 200% 200%;
    background-position: 0% 0%;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 150ms ease;
    animation: none;
    pointer-events: none;
  }

  &::after {
    content: attr(data-label);
    position: absolute;
    left: calc(100% + 14px);
    top: 50%;
    transform: translateY(-50%) translateX(-6px);
    background: $surface-elevated;
    color: $text-primary;
    font-size: 12px;
    font-weight: 500;
    padding: 5px 11px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transition: opacity 60ms ease, transform 60ms ease;
    transition-delay: 0s;
    z-index: 200;
  }

  &:hover::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
    // enter: delay so it only shows if you actually pause
    transition: opacity 120ms ease, transform 120ms ease;
    transition-delay: 200ms;
  }

  &:hover {
    background: transparent;
  }

  &.active {
    background: transparent;

    &::before {
      opacity: 1;
      animation: gradient-shift 4s ease infinite;
    }
  }
}

.nav-icon-img {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  object-fit: contain;
  opacity: 0.40;
  filter: brightness(0) invert(1);
  transition: opacity 60ms ease, transform 80ms ease-in;
  position: relative;
  z-index: 1;
}

.nav-item:hover .nav-icon-img {
  opacity: 0.70;
  transform: scale(1.14) translateZ(0);
  // enter: smooth ease-out, no overshoot
  transition: opacity 100ms ease, transform 160ms cubic-bezier(0.2, 0, 0, 1);
}

.nav-item.active .nav-icon-img {
  opacity: 1;
  filter: brightness(0) invert(1) drop-shadow(0 0 10px rgba(255, 255, 255, 0.6));
}

.nav-item:nth-child(2) .nav-icon-img {
  width: 46px;
  height: 46px;
}

.nav-item:nth-child(5) .nav-icon-img {
  width: 40px;
  height: 40px;
}

.nav-badge {
  position: absolute;
  top: 9px;
  right: 12px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: var(--accent, #3eb8ff);
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-wip {
  position: absolute;
  top: 8px;
  right: 11px;
  width: 15px;
  height: 15px;
  background: rgba(18, 20, 24, 0.85);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
}

.wip-clock {
  width: 11px;
  height: 11px;
  color: #e03535;
}

.clock-min {
  transform-origin: 7px 7px;
  animation: clock-tick 4s linear infinite;
}

@keyframes clock-tick {
  0%   { transform: rotate(0deg);   animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
  20%  { transform: rotate(90deg); }
  25%  { transform: rotate(90deg);  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
  45%  { transform: rotate(180deg); }
  50%  { transform: rotate(180deg); animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
  70%  { transform: rotate(270deg); }
  75%  { transform: rotate(270deg); animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
  95%  { transform: rotate(360deg); }
  100% { transform: rotate(360deg); }
}

// ── Spacer ────────────────────────────────────────────────────────────────────
.sidebar-spacer {
  flex: 1;
  -webkit-app-region: drag;
}

@keyframes gradient-shift {
  0%   { background-position: 0% 0%; }
  50%  { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}

// ── Footer links ──────────────────────────────────────────────────────────────
.sidebar-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 0 20px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.footer-link {
  background: none;
  border: none;
  padding: 3px 0;
  cursor: pointer;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  transition: color $transition-fast;
  font-family: 'Plus Jakarta Sans', sans-serif;

  &:hover { color: rgba(255, 255, 255, 0.55); }
}
</style>
