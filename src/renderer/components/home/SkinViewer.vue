<template>
  <div class="skin-viewer-wrap" ref="wrapEl">
    <canvas ref="canvasEl" class="skin-canvas" :class="{ dragging: isDragging }" />
    <div class="skin-hint">
      <span>Drag to rotate</span>
      <span class="hint-divider">·</span>
      <span><kbd>B</kbd> to walk</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { SkinViewer, WalkingAnimation, IdleAnimation } from 'skinview3d'
import type { SubAnimationHandle } from 'skinview3d'

const props = defineProps<{
  skinUrl: string | null
  slim?: boolean
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const wrapEl = ref<HTMLElement | null>(null)
const isDragging = ref(false)

const ORIGINAL_ROT_Y = -0.36

let viewer: SkinViewer | null = null
let idleHandle: SubAnimationHandle | null = null
let walkHandle: SubAnimationHandle | null = null
let dragLastX = 0
let snapRaf: number | null = null

onMounted(() => {
  if (!canvasEl.value) return

  viewer = new SkinViewer({
    canvas: canvasEl.value,
    width: 340,
    height: 460,
    zoom: 0.72,
  })

  viewer.playerWrapper.rotation.y = ORIGINAL_ROT_Y
  idleHandle = viewer.animations.add(IdleAnimation)

  applySkin()

  canvasEl.value.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('keydown', onKeyDown)
})

// ── Walk toggle (B key) ───────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'b' && e.key !== 'B') return
  if (!viewer) return
  if (walkHandle) {
    walkHandle.remove()
    walkHandle = null
    idleHandle = viewer.animations.add(IdleAnimation)
  } else {
    idleHandle?.remove()
    idleHandle = null
    walkHandle = viewer.animations.add(WalkingAnimation)
  }
}

// ── Mouse drag rotation ───────────────────────────────────────────────────────

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (snapRaf !== null) { cancelAnimationFrame(snapRaf); snapRaf = null }
  isDragging.value = true
  dragLastX = e.clientX
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !viewer) return
  const delta = e.clientX - dragLastX
  viewer.playerWrapper.rotation.y += delta * 0.013
  dragLastX = e.clientX
}

function onMouseUp() {
  isDragging.value = false
  if (snapRaf !== null) { cancelAnimationFrame(snapRaf); snapRaf = null }
  snapBack()
}

function snapBack() {
  if (!viewer) return
  const diff = ORIGINAL_ROT_Y - viewer.playerWrapper.rotation.y
  if (Math.abs(diff) < 0.001) {
    viewer.playerWrapper.rotation.y = ORIGINAL_ROT_Y
    snapRaf = null
    return
  }
  viewer.playerWrapper.rotation.y += diff * 0.12
  snapRaf = requestAnimationFrame(snapBack)
}

// ── Skin loading ──────────────────────────────────────────────────────────────

function applySkin() {
  if (!viewer) return
  if (props.skinUrl) {
    viewer.loadSkin(props.skinUrl, props.slim ? 'slim' : 'default')
  } else {
    viewer.loadSkin(null)
  }
}

watch(() => props.skinUrl, applySkin)

onUnmounted(() => {
  if (snapRaf !== null) cancelAnimationFrame(snapRaf)
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  viewer?.dispose()
  viewer = null
})
</script>

<style scoped>
.skin-viewer-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.skin-canvas {
  display: block;
  cursor: grab;
  image-rendering: pixelated;

  &.dragging {
    cursor: grabbing;
  }
}

.skin-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: $muted;
  pointer-events: none;
}

.hint-divider {
  opacity: 0.4;
}

kbd {
  font-family: inherit;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: $surface-elevated;
  border: 1px solid $border;
  color: $muted;
}
</style>
