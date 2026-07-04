<template>
  <div class="wip-page">
    <div class="wip-content">
      <div class="clock-wrap">
        <svg class="clock-face" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="3" opacity="0.25"/>
          <circle cx="40" cy="40" r="3" fill="currentColor" opacity="0.5"/>
          <!-- hour markers -->
          <line x1="40" y1="7" x2="40" y2="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/>
          <line x1="73" y1="40" x2="66" y2="40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/>
          <line x1="40" y1="73" x2="40" y2="66" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/>
          <line x1="7" y1="40" x2="14" y2="40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/>
          <!-- hour hand (static ~10 o'clock) -->
          <line class="hand-hour" x1="40" y1="40" x2="23" y2="23" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
          <!-- minute hand (animates) -->
          <line class="hand-min" x1="40" y1="40" x2="40" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="wip-label">In Development</p>
      <p class="wip-sub">This feature is coming soon.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.wip-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex: 1;
}

.wip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  user-select: none;
}

.clock-wrap {
  width: 80px;
  height: 80px;
  color: rgba(255, 255, 255, 0.3);
}

.clock-face {
  width: 100%;
  height: 100%;
}

.hand-min {
  transform-origin: 40px 40px;
  animation: sweep 4s linear infinite;
}

@keyframes sweep {
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

.wip-label {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.wip-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
</style>
