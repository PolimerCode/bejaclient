<template>
  <div class="pass-page">
    <div class="coming-state">
      <span class="coming-text">Coming soon</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pass-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
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
}

.coming-state {
  position: relative;
  z-index: 1;
}

.coming-text {
  font-family: 'Mojangles', monospace;
  font-size: 12px;
  color: #2a2a2a;
  letter-spacing: 0.14em;
}
</style>
