<script setup lang="ts">
defineProps<{
  linkEnabled?: boolean
  size?: 'small' | 'medium' | 'large' // Add size prop
}>()
</script>

<template>
  <component
    :is="linkEnabled ? 'a' : 'div'"
    :href="linkEnabled ? '/' : undefined"
    class="logo"
    :class="size || 'medium'"
  >
    <div class="logo-mark">
      <div class="circuit-ring">
        <div class="supporting-buildings">
          <div class="buildings-shadow"></div>
        </div>
      </div>
      <div class="connection-points"></div>
      <div class="inner-traces"></div>
    </div>
    <div class="logo-text">
      <span class="company-name">QURESHI</span>
      <span class="company-type">ENTERPRISE</span>
    </div>
  </component>
</template>

<style scoped>
/* Base styles with CSS variables for scaling */
.logo {
  --logo-scale: 1;
  --logo-height: calc(50px * var(--logo-scale));
  --mark-size: calc(40px * var(--logo-scale));
  --gap-size: calc(1rem * var(--logo-scale));
  --company-name-size: calc(1.4rem * var(--logo-scale));
  --company-type-size: calc(0.8rem * var(--logo-scale));
  --letter-spacing-name: calc(1px * var(--logo-scale));
  --letter-spacing-type: calc(3px * var(--logo-scale));

  /* Scale internal dimensions */
  --building-width: calc(14px * var(--logo-scale));
  --building-height: calc(28px * var(--logo-scale));
  --border-width: calc(2px * var(--logo-scale));
  --border-radius: calc(4px * var(--logo-scale));
  --q-font-size: calc(16px * var(--logo-scale));
  --dot-size: calc(2px * var(--logo-scale));
  --dot-spacing: calc(8px * var(--logo-scale));

  height: var(--logo-height);
  display: flex;
  align-items: center;
  justify-content: center; /* Add this */
  gap: var(--gap-size);
  text-decoration: none;
  line-height: 1; /* Add this to prevent text from affecting alignment */
}

/* Size variants */
.logo.small {
  --logo-scale: 0.7;
}

.logo.medium {
  --logo-scale: 1;
}

.logo.large {
  --logo-scale: 1.4;
}

.logo-mark {
  position: relative;
  width: var(--mark-size);
  height: var(--mark-size);
}

.circuit-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: var(--border-width) solid transparent;
  border-radius: var(--border-radius);
  background:
    linear-gradient(var(--qui-bg-primary), var(--qui-bg-primary)) padding-box,
    linear-gradient(135deg, var(--qui-accent-color), var(--qui-accent-secondary)) border-box;
  overflow: hidden;
}

.circuit-ring::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: var(--building-width);
  height: var(--building-height);
  background: var(--qui-accent-color);
  opacity: 0.8;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
}

.circuit-ring::after {
  content: 'Q';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: var(--building-width);
  height: var(--building-height);
  color: var(--qui-bg-primary);
  font-size: var(--q-font-size);
  font-weight: bold;
  line-height: var(--building-height);
  text-align: center;
  font-family: var(--qui-font-family);
  z-index: 1;
}

.supporting-buildings {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: var(--building-height);
  background: linear-gradient(
    90deg,
    var(--qui-accent-secondary) calc(1px * var(--logo-scale)) calc(5px * var(--logo-scale)),
    transparent calc(5px * var(--logo-scale)) calc(7px * var(--logo-scale)),
    var(--qui-accent-color) calc(7px * var(--logo-scale)) calc(14px * var(--logo-scale)),
    transparent calc(14px * var(--logo-scale)) calc(16px * var(--logo-scale)),
    transparent calc(19px * var(--logo-scale)) calc(21px * var(--logo-scale)),
    transparent calc(21px * var(--logo-scale)) calc(29px * var(--logo-scale)),
    var(--qui-accent-color) calc(29px * var(--logo-scale)) calc(34px * var(--logo-scale)),
    transparent calc(34px * var(--logo-scale)) calc(35px * var(--logo-scale)),
    var(--qui-accent-secondary) calc(35px * var(--logo-scale)) calc(39px * var(--logo-scale))
  );
  opacity: 0.7;
  mask:
    linear-gradient(
        to top,
        #fff calc(20px * var(--logo-scale)),
        transparent calc(20px * var(--logo-scale))
      )
      calc(1px * var(--logo-scale)) 0 / calc(4px * var(--logo-scale)) 100% no-repeat,
    linear-gradient(
        to top,
        #fff calc(24px * var(--logo-scale)),
        transparent calc(24px * var(--logo-scale))
      )
      calc(7px * var(--logo-scale)) 0 / calc(4px * var(--logo-scale)) 100% no-repeat,
    linear-gradient(
        to top,
        #fff calc(24px * var(--logo-scale)),
        transparent calc(24px * var(--logo-scale))
      )
      calc(29px * var(--logo-scale)) 0 / calc(4px * var(--logo-scale)) 100% no-repeat,
    linear-gradient(
        to top,
        #fff calc(20px * var(--logo-scale)),
        transparent calc(20px * var(--logo-scale))
      )
      calc(35px * var(--logo-scale)) 0 / calc(4px * var(--logo-scale)) 100% no-repeat;
}

.connection-points {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.connection-points::before {
  content: '';
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(calc(-10px * var(--logo-scale)));
  width: calc(24px * var(--logo-scale));
  height: calc(8px * var(--logo-scale));
  background: radial-gradient(
      circle at center,
      var(--qui-accent-secondary) 0%,
      var(--qui-accent-secondary) var(--dot-size),
      transparent var(--dot-size)
    )
    0 0 / var(--dot-spacing) var(--dot-spacing);
  opacity: 0.6;
  transform-origin: center center;
}

.logo:hover .circuit-ring::before {
  animation: glowBuilding 1.5s ease-in-out infinite;
}

.logo:hover .connection-points::before {
  animation: dataPulse 1.5s ease-in-out infinite;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.company-name {
  font-size: var(--company-name-size);
  font-weight: 700;
  background: linear-gradient(135deg, var(--qui-accent-color), var(--qui-accent-secondary));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: var(--letter-spacing-name);
}

.company-type {
  font-size: var(--company-type-size);
  font-weight: 500;
  color: var(--qui-accent-color);
  opacity: 0.8;
  letter-spacing: var(--letter-spacing-type);
}

@keyframes glowBuilding {
  0%,
  100% {
    opacity: 0.8;
    filter: brightness(1);
  }
  50% {
    opacity: 1;
    filter: brightness(1.2);
  }
}

@keyframes dataPulse {
  0%,
  100% {
    opacity: 0.6;
    transform: translateX(calc(-10px * var(--logo-scale))) scale(1);
  }
  50% {
    opacity: 0.9;
    transform: translateX(calc(-10px * var(--logo-scale))) scale(1.1);
  }
}
</style>
