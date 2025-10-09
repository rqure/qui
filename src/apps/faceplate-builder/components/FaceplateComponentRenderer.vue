<script setup lang="ts">
import { computed } from 'vue';
import type { EntityId } from '@/core/data/types';
import PrimitiveRenderer from './PrimitiveRenderer.vue';

interface RenderComponentModel {
  id: EntityId;
  name: string;
  type: string;
  config: Record<string, any>;
  bindings: Record<string, unknown>;
  animationClasses: string[];
  lastUpdated: Record<string, number>;
}

const props = defineProps<{
  component: RenderComponentModel;
  editMode?: boolean;
}>();

const normalizedType = computed(() => props.component.type.toLowerCase());
const labelText = computed(() => props.component.config.label || props.component.name);

const gaugeValue = computed(() => {
  const raw = Number(props.component.bindings.value ?? props.component.bindings.level ?? 0);
  if (Number.isFinite(raw)) {
    return raw;
  }
  return 0;
});

const gaugeMin = computed(() => Number(props.component.config.min ?? 0));
const gaugeMax = computed(() => {
  const max = Number(props.component.config.max ?? 100);
  return Number.isFinite(max) ? max : 100;
});

const gaugePercent = computed(() => {
  const min = gaugeMin.value;
  const max = gaugeMax.value;
  if (max === min) return 0;
  const value = gaugeValue.value;
  const percent = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, percent));
});

const indicatorState = computed(() => {
  const value = props.component.bindings.status ?? props.component.bindings.state ?? props.component.bindings.value;
  if (typeof value === 'boolean') {
    return value ? 'on' : 'off';
  }
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  if (typeof value === 'number') {
    return value !== 0 ? 'on' : 'off';
  }
  return 'unknown';
});

const indicatorColor = computed(() => {
  const state = indicatorState.value;
  if (state === 'on' || state === 'active' || state === 'true') {
    return props.component.config.trueColor || 'var(--qui-accent-color)';
  }
  if (state === 'unknown') {
    return 'var(--qui-text-tertiary)';
  }
  return props.component.config.falseColor || 'var(--qui-border-color)';
});

const formValue = computed(() => {
  const value = props.component.bindings.text ?? props.component.bindings.value ?? props.component.bindings.status;
  if (value === null || value === undefined) return props.editMode ? '<unbound>' : '—';
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
});

const animationClassList = computed(() => {
  return props.component.animationClasses.join(' ');
});

const componentClasses = computed(() => {
  return [
    'faceplate-component',
    `component-${normalizedType.value}`,
    animationClassList.value,
    props.editMode ? 'is-editable' : ''
  ].filter(Boolean).join(' ');
});
</script>

<template>
  <div :class="componentClasses">
    <header class="component-header">
      <span class="component-title">{{ labelText }}</span>
      <span v-if="props.editMode" class="component-hint">{{ component.type }}</span>
    </header>

    <div class="component-body">
      <!-- Use unified primitive renderer for all primitive types -->
      <PrimitiveRenderer 
        v-if="normalizedType.startsWith('primitive.')"
        :type="normalizedType"
        :config="component.config"
        :bindings="component.bindings"
        :edit-mode="props.editMode"
      />
      
      <!-- Legacy: Gauge (kept for backward compatibility) -->
      <div v-else-if="normalizedType === 'gauge'" class="gauge" :style="{ '--gauge-percent': `${gaugePercent}%` }">
        <div class="gauge-fill"></div>
        <div class="gauge-value">{{ gaugeValue }}</div>
        <div class="gauge-range">{{ gaugeMin }} – {{ gaugeMax }}</div>
      </div>

      <!-- Legacy: Indicator -->
      <div v-else-if="normalizedType === 'indicator'" class="indicator">
        <div class="indicator-dot" :style="{ backgroundColor: indicatorColor }"></div>
        <div class="indicator-label">{{ indicatorState }}</div>
      </div>

      <!-- Legacy: Form Field -->
      <div v-else-if="normalizedType === 'formfield'" class="form-field">
        <label>{{ props.component.config.label || props.component.name }}</label>
        <div class="value">{{ formValue }}</div>
      </div>

      <!-- Legacy: Trend -->
      <div v-else-if="normalizedType === 'trend'" class="trend">
        <div class="trend-placeholder">Trend preview not available in this build</div>
      </div>

      <!-- Fallback -->
      <div v-else class="custom">
        <div style="opacity: 0.7; margin-bottom: 8px;">Type: {{ component.type }}</div>
        <pre style="font-size: 11px; opacity: 0.6;">{{ JSON.stringify(props.component.bindings, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faceplate-component {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  color: var(--qui-text-primary);
  min-height: 140px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.faceplate-component.is-editable {
  cursor: pointer;
}

.faceplate-component.is-editable:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.8;
  margin-bottom: 12px;
}

.component-title {
  font-weight: 600;
}

.component-hint {
  font-size: 11px;
  opacity: 0.6;
}

.component-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(var(--qui-accent-color) calc(var(--gauge-percent) * 1%), rgba(255, 255, 255, 0.06) 0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge::after {
  content: '';
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.74);
}

.gauge-fill {
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background: radial-gradient(circle at top, rgba(255,255,255,0.18), rgba(0,0,0,0.65));
}

.gauge-value {
  position: absolute;
  font-size: 24px;
  font-weight: 600;
  z-index: 2;
}

.gauge-range {
  position: absolute;
  bottom: 8px;
  font-size: 11px;
  opacity: 0.6;
  z-index: 2;
}

.indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.indicator-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
  transition: background-color 0.3s ease;
}

.indicator-label {
  font-size: 18px;
  font-weight: 600;
  text-transform: capitalize;
}

.text-block {
  width: 100%;
  padding: 8px;
  overflow-wrap: break-word;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.form-field label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.65;
}

.form-field input {
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-field input:focus {
  outline: none;
  border-color: var(--qui-accent-color);
}

.form-field .value {
  min-height: 32px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: 15px;
  letter-spacing: 0.04em;
}

.button-primitive {
  width: 100%;
}

.button-primitive button {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.1s, opacity 0.2s;
}

.button-primitive button:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.button-primitive button:active {
  transform: translateY(0);
}

.toggle-primitive {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  transition: 0.3s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--qui-accent-color);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.toggle-label {
  font-size: 14px;
}

.shape-rectangle {
  width: 100%;
  height: 100%;
  min-height: 60px;
}

.shape-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}

.container-primitive {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.trend .trend-placeholder {
  opacity: 0.6;
  font-size: 13px;
  letter-spacing: 0.04em;
}

.custom {
  width: 100%;
  max-height: 160px;
  overflow: auto;
}

.custom pre {
  width: 100%;
  margin: 0;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  padding: 8px;
}

/* Animation states */
.faceplate-component.pulse {
  animation: pulse 1.6s infinite;
}

.faceplate-component.flash {
  animation: flash 0.8s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
