<template>
  <div ref="containerRef" class="hero-viewer">
    <canvas ref="canvasRef" class="viewer-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { SkinViewer, WalkingAnimation, IdleAnimation, createOrbitControls } from 'skinview3d'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Object3D } from 'three'
import { AnimationMixer, Clock } from 'three'

import wingsGltfRaw from '../../assets/cosmetics/wings.gltf?raw'

const props = withDefaults(defineProps<{
  skinUrl?:          string | null
  capeUrl?:          string | null
  model?:            'default' | 'slim' | 'auto-detect'
  animation?:        'walk' | 'idle' | 'custom-idle'
  zoom?:             number
  initialRotationY?: number
  showWings?:        boolean
  autoRotateSpeed?:  number
}>(), {
  model:            'auto-detect',
  animation:        'walk',
  zoom:             0.9,
  initialRotationY: 0,
  showWings:        false,
  autoRotateSpeed:  0,
})

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef    = ref<HTMLCanvasElement | null>(null)
const isDragging   = ref(false)
let viewer:      SkinViewer    | null = null
let controls:    OrbitControls | null = null
let ro:          ResizeObserver | null = null
let wingsObject:  Object3D       | null = null
let wingsMixer:   AnimationMixer | null = null
let wingsRafId:   number         | null = null
let rotateRafId:  number         | null = null
let snapRafId:    number         | null = null
let dragLastX = 0
let wingsLoading = false
const wingsClock = new Clock()


// Custom idle — values extracted exactly from still_test GLB keyframes
// period = 2s, env = smooth 0→1→0 envelope that repeats
const customIdleAnimation = (player: any, time: number) => {
  const s = player.skin
  const env = (1 - Math.cos(Math.PI * time)) / 2  // 0→1→0, period 2s, always ≥0

  // Head: X nod forward (0 → -10° → 0)
  s.head.rotation.x = -0.1745 * env

  // Arms: Z splay oscillates from 5° base to 10° peak and back
  const armZ = 0.0873 + 0.0873 * env
  s.rightArm.rotation.z = -armZ
  s.leftArm.rotation.z  =  armZ

  // Legs: X forward tilt (0 → -5° → 0) + constant 5° outward Z spread
  s.rightLeg.rotation.x = -0.0873 * env
  s.leftLeg.rotation.x  = -0.0873 * env
  s.rightLeg.rotation.z = -0.0873
  s.leftLeg.rotation.z  =  0.0873
}

function loadCustomIdle() {
  if (!viewer) return
  ;(viewer.animations as any).handles.clear()
  viewer.animations.add(customIdleAnimation)
  viewer.animations.speed = 1
}

function loadWings() {
  if (!viewer || wingsLoading) return
  wingsLoading = true
  const loader = new GLTFLoader()
  loader.parse(wingsGltfRaw, '', gltf => {
    wingsLoading = false
    if (!viewer) return
    wingsObject = gltf.scene
    wingsObject.scale.setScalar(16)
    wingsObject.position.set(0, -14, 0)
    wingsObject.rotation.y = Math.PI
    viewer.playerObject.add(wingsObject)

    if (gltf.animations.length > 0) {
      wingsMixer = new AnimationMixer(wingsObject)
      gltf.animations.forEach(clip => wingsMixer!.clipAction(clip).play())
      wingsClock.start()
      const tick = () => {
        wingsRafId = requestAnimationFrame(tick)
        wingsMixer?.update(wingsClock.getDelta())
      }
      tick()
    }
  }, err => {
    wingsLoading = false
    console.error('[Wings] parse error:', err)
  })
}

function removeWings() {
  if (wingsRafId !== null) { cancelAnimationFrame(wingsRafId); wingsRafId = null }
  wingsMixer?.stopAllAction()
  wingsMixer = null
  if (!wingsObject) return
  if (viewer) viewer.playerObject.remove(wingsObject)
  wingsObject.traverse(obj => {
    const mesh = obj as any
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach((m: any) => m.dispose())
    else mesh.material?.dispose()
  })
  wingsObject = null
}

onMounted(() => {
  const canvas    = canvasRef.value!
  const container = containerRef.value!

  viewer = new SkinViewer({
    canvas,
    width:  container.clientWidth  || 300,
    height: container.clientHeight || 500,
    alpha:  true,
    zoom:   props.zoom,
    fov:    40,
  })

  if (props.initialRotationY) {
    viewer.playerWrapper.rotation.y = props.initialRotationY
  }

  if (props.animation === 'custom-idle') {
    loadCustomIdle()
  } else {
    viewer.animations.add(props.animation === 'walk' ? WalkingAnimation : IdleAnimation)
    viewer.animations.speed = 0.7
  }

  viewer.globalLight.intensity = 0.62
  viewer.cameraLight.intensity = 0.5

  controls = createOrbitControls(viewer)
  controls.enableZoom   = false
  controls.enablePan    = false
  controls.enableRotate = false

  canvas.addEventListener('mousedown', onDragStart)
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)

  if (props.skinUrl) viewer.loadSkin(props.skinUrl, props.model)
  if (props.capeUrl) viewer.loadCape(props.capeUrl)
  if (props.showWings) loadWings()

  if (props.autoRotateSpeed > 0) {
    let last = performance.now()
    const rotateTick = (now: number) => {
      rotateRafId = requestAnimationFrame(rotateTick)
      const dt = (now - last) / 1000
      last = now
      if (viewer) viewer.playerWrapper.rotation.y += props.autoRotateSpeed * dt
    }
    rotateRafId = requestAnimationFrame(rotateTick)
  }

  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    if (width > 0 && height > 0) viewer?.setSize(width, height)
  })
  ro.observe(container)
})

function onDragStart(e: MouseEvent) {
  if (e.button !== 0) return
  if (snapRafId !== null) { cancelAnimationFrame(snapRafId); snapRafId = null }
  isDragging.value = true
  dragLastX = e.clientX
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value || !viewer) return
  viewer.playerWrapper.rotation.y += (e.clientX - dragLastX) * 0.013
  dragLastX = e.clientX
}

function onDragEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  snapToOrigin()
}

function snapToOrigin() {
  if (!viewer) return
  const target = props.initialRotationY ?? 0
  const diff = target - viewer.playerWrapper.rotation.y
  if (Math.abs(diff) < 0.001) {
    viewer.playerWrapper.rotation.y = target
    snapRafId = null
    return
  }
  viewer.playerWrapper.rotation.y += diff * 0.04
  snapRafId = requestAnimationFrame(snapToOrigin)
}

watch([() => props.skinUrl, () => props.model], ([url, model]) => {
  if (!viewer) return
  if (url) viewer.loadSkin(url, model ?? 'auto-detect')
  else     viewer.resetSkin()
})

watch(() => props.capeUrl, url => {
  if (!viewer) return
  if (url) viewer.loadCape(url)
  else     viewer.resetCape()
})

watch(() => props.showWings, show => {
  if (show) loadWings()
  else      removeWings()
})

onUnmounted(() => {
  if (rotateRafId !== null) { cancelAnimationFrame(rotateRafId); rotateRafId = null }
  if (snapRafId   !== null) { cancelAnimationFrame(snapRafId);   snapRafId   = null }
  canvasRef.value?.removeEventListener('mousedown', onDragStart)
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup',   onDragEnd)
  removeWings()
  controls?.dispose()
  ro?.disconnect()
  viewer?.dispose()
  viewer = null
})

function triggerEmote() {
  if (!viewer) return
  viewer.animations.speed = 2.8
  setTimeout(() => { if (viewer) viewer.animations.speed = 0.7 }, 2200)
}

defineExpose({ triggerEmote })
</script>

<style scoped>
.hero-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  user-select: none;
}

.viewer-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  cursor: v-bind("isDragging ? 'grabbing' : 'grab'");
}
</style>
