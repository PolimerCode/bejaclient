<template>
  <div ref="containerRef" class="static-viewer">
    <canvas ref="canvasRef" class="viewer-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { SkinViewer, createOrbitControls } from 'skinview3d'

const props = withDefaults(defineProps<{
  skinUrl?:          string | null
  capeUrl?:          string | null
  model?:            'default' | 'slim' | 'auto-detect'
  zoom?:             number
  initialRotationY?: number
}>(), {
  model:            'auto-detect',
  zoom:             0.75,
  initialRotationY: 0,
})

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef    = ref<HTMLCanvasElement | null>(null)
let viewer: SkinViewer | null = null
let ro:     ResizeObserver | null = null

// Apply the custom-idle rest pose once, then freeze
function applyIdlePose() {
  if (!viewer) return
  viewer.animations.add((player: any) => {
    player.skin.head.rotation.x        = -0.05
    player.skin.rightArm.rotation.z    = -0.0873
    player.skin.leftArm.rotation.z     =  0.0873
    player.skin.rightLeg.rotation.z    = -0.0873
    player.skin.leftLeg.rotation.z     =  0.0873
    viewer!.animations.speed = 0
  })
  viewer.animations.speed = 1
}

onMounted(() => {
  const canvas    = canvasRef.value!
  const container = containerRef.value!

  viewer = new SkinViewer({
    canvas,
    width:  container.clientWidth  || 200,
    height: container.clientHeight || 300,
    alpha:  true,
    zoom:   props.zoom,
    fov:    40,
  })

  viewer.globalLight.intensity = 0.62
  viewer.cameraLight.intensity = 0.5

  const controls = createOrbitControls(viewer)
  controls.enableZoom   = false
  controls.enablePan    = false
  controls.enableRotate = false

  if (props.initialRotationY) {
    viewer.playerWrapper.rotation.y = props.initialRotationY
  }

  if (props.skinUrl) viewer.loadSkin(props.skinUrl, props.model)
  if (props.capeUrl) viewer.loadCape(props.capeUrl)

  applyIdlePose()

  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    if (width > 0 && height > 0) viewer?.setSize(width, height)
  })
  ro.observe(container)
})

watch([() => props.skinUrl, () => props.model], ([url, model]) => {
  if (!viewer) return
  if (url) viewer.loadSkin(url, model ?? 'auto-detect')
  else     viewer.resetSkin()
  applyIdlePose()
})

watch(() => props.capeUrl, url => {
  if (!viewer) return
  if (url) viewer.loadCape(url)
  else     viewer.resetCape()
})

onUnmounted(() => {
  ro?.disconnect()
  viewer?.dispose()
  viewer = null
})
</script>

<style scoped>
.static-viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
  pointer-events: none;
}
.viewer-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
