<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="store.conflictWarning" class="conflict-overlay" @click.self="store.dismissConflict()">
        <div class="conflict-modal">

          <div class="conflict-header">
            <div class="conflict-icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 class="conflict-title">{{ $t('conflict.title') }}</h2>
              <p class="conflict-subtitle">{{ $t('conflict.subtitle', { count: store.conflictWarning.conflicts.length }) }}</p>
            </div>
          </div>

          <div class="conflict-body">
            <div
              v-for="(c, i) in store.conflictWarning.conflicts"
              :key="i"
              class="conflict-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="conflict-dot">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ c }}</span>
            </div>
          </div>

          <div class="conflict-footer">
            <button class="btn-cancel" @click="store.dismissConflict()">{{ $t('conflict.fixFirst') }}</button>
            <button class="btn-autofix" @click="store.autoFixAndLaunch()">{{ $t('conflict.autoFix') }}</button>
            <button class="btn-force" @click="store.forceLaunch()">{{ $t('conflict.launchAnyway') }}</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLauncherStore } from '../../store/launcherStore'

const store = useLauncherStore()
const { t } = useI18n()
</script>

<style lang="scss" scoped>
@use "sass:color";

.conflict-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.conflict-modal {
  width: 440px;
  max-width: 92vw;
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-inset, $shadow-xl;
}

.conflict-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid $border;
  background: $surface-panel;
}

.conflict-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(232, 160, 48, 0.12);
  border: 1px solid rgba(232, 160, 48, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: $warning;
  flex-shrink: 0;
}

.conflict-title {
  font-size: 14px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 2px;
}

.conflict-subtitle {
  font-size: 11px;
  color: $muted;
  margin: 0;
}

.conflict-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: $border; border-radius: 3px; }
}

.conflict-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
  padding: 8px 10px;
  background: rgba(232, 160, 48, 0.05);
  border: 1px solid rgba(232, 160, 48, 0.15);
  border-radius: $radius;
}

.conflict-dot {
  color: $warning;
  flex-shrink: 0;
  margin-top: 1px;
}

.conflict-footer {
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid $border;
  background: $surface-panel;
}

.btn-cancel {
  flex: 1;
  padding: 8px 16px;
  background: $surface-elevated;
  color: $text-secondary;
  border: 1px solid $border;
  border-radius: $radius;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition;
  &:hover { background: $border; color: $text-primary; }
}

.btn-autofix {
  flex: 1;
  padding: 8px 16px;
  background: $accent;
  color: #fff;
  border: none;
  border-radius: $radius;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity $transition;
  &:hover { opacity: 0.85; }
}

.btn-force {
  flex: 1;
  padding: 8px 16px;
  background: $warning;
  color: #fff;
  border: none;
  border-radius: $radius;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background $transition;
  &:hover { background: color.adjust(#e8a030, $lightness: -8%); }
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 150ms ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
