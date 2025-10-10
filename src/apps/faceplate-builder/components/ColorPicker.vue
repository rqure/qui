<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const showPicker = ref(false);
const hexInput = ref('');
const rInput = ref(0);
const gInput = ref(0);
const bInput = ref(0);
const aInput = ref(1);

// Common color presets
const colorPresets = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
  '#00ff88', '#ff0088', '#88ff00', '#0088ff', '#888888',
  'rgba(255,0,0,0.5)', 'rgba(0,255,0,0.5)', 'rgba(0,0,255,0.5)',
  'rgba(255,255,0,0.5)', 'rgba(255,0,255,0.5)', 'rgba(0,255,255,0.5)',
];

// Parse color string into components
function parseColor(color: string): { r: number; g: number; b: number; a: number; hex: string } {
  // Handle rgba format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return { r, g, b, a, hex };
  }
  
  // Handle hex format
  let hex = color;
  if (hex.startsWith('#')) {
    hex = hex.substring(1);
  }
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  
  return { r, g, b, a: 1, hex: `#${hex}` };
}

// Initialize inputs when color changes
watch(() => props.modelValue, (newValue) => {
  const parsed = parseColor(newValue || '#ffffff');
  hexInput.value = parsed.hex;
  rInput.value = parsed.r;
  gInput.value = parsed.g;
  bInput.value = parsed.b;
  aInput.value = parsed.a;
}, { immediate: true });

// Update color from RGB inputs
function updateFromRGB() {
  const r = Math.max(0, Math.min(255, rInput.value));
  const g = Math.max(0, Math.min(255, gInput.value));
  const b = Math.max(0, Math.min(255, bInput.value));
  const a = Math.max(0, Math.min(1, aInput.value));
  
  hexInput.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  
  if (a < 1) {
    emit('update:modelValue', `rgba(${r}, ${g}, ${b}, ${a})`);
  } else {
    emit('update:modelValue', hexInput.value);
  }
}

// Update color from hex input
function updateFromHex() {
  const parsed = parseColor(hexInput.value);
  rInput.value = parsed.r;
  gInput.value = parsed.g;
  bInput.value = parsed.b;
  
  if (aInput.value < 1) {
    emit('update:modelValue', `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${aInput.value})`);
  } else {
    emit('update:modelValue', hexInput.value);
  }
}

// Select preset color
function selectPreset(color: string) {
  emit('update:modelValue', color);
  showPicker.value = false;
}

// Current color preview
const currentColor = computed(() => {
  try {
    return props.modelValue || '#ffffff';
  } catch {
    return '#ffffff';
  }
});

// Close picker when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.color-picker')) {
    showPicker.value = false;
  }
}

watch(showPicker, (show) => {
  if (show) {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
  } else {
    document.removeEventListener('click', handleClickOutside);
  }
});
</script>

<template>
  <div class="color-picker">
    <button
      type="button"
      class="color-picker__trigger"
      :disabled="disabled"
      @click.stop="showPicker = !showPicker"
    >
      <span class="color-picker__preview" :style="{ backgroundColor: currentColor }"></span>
      <span class="color-picker__value">{{ modelValue || 'transparent' }}</span>
    </button>
    
    <div v-if="showPicker" class="color-picker__panel" @click.stop>
      <!-- Hex input -->
      <div class="color-picker__section">
        <label class="color-picker__field">
          <span>Hex</span>
          <input
            type="text"
            v-model="hexInput"
            @input="updateFromHex"
            placeholder="#ffffff"
          />
        </label>
      </div>
      
      <!-- RGB inputs -->
      <div class="color-picker__section">
        <div class="color-picker__rgb">
          <label class="color-picker__field color-picker__field--small">
            <span>R</span>
            <input
              type="number"
              v-model.number="rInput"
              @input="updateFromRGB"
              min="0"
              max="255"
            />
          </label>
          <label class="color-picker__field color-picker__field--small">
            <span>G</span>
            <input
              type="number"
              v-model.number="gInput"
              @input="updateFromRGB"
              min="0"
              max="255"
            />
          </label>
          <label class="color-picker__field color-picker__field--small">
            <span>B</span>
            <input
              type="number"
              v-model.number="bInput"
              @input="updateFromRGB"
              min="0"
              max="255"
            />
          </label>
        </div>
      </div>
      
      <!-- Alpha input -->
      <div class="color-picker__section">
        <label class="color-picker__field">
          <span>Opacity</span>
          <div class="color-picker__slider">
            <input
              type="range"
              v-model.number="aInput"
              @input="updateFromRGB"
              min="0"
              max="1"
              step="0.01"
            />
            <span class="color-picker__slider-value">{{ (aInput * 100).toFixed(0) }}%</span>
          </div>
        </label>
      </div>
      
      <!-- Color presets -->
      <div class="color-picker__section">
        <span class="color-picker__section-label">Presets</span>
        <div class="color-picker__presets">
          <button
            v-for="preset in colorPresets"
            :key="preset"
            type="button"
            class="color-picker__preset"
            :style="{ backgroundColor: preset }"
            @click="selectPreset(preset)"
            :title="preset"
          ></button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  position: relative;
  display: inline-block;
  width: 100%;
}

.color-picker__trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: inherit;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.color-picker__trigger:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
}

.color-picker__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.color-picker__preview {
  width: 32px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

.color-picker__value {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-picker__panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1000;
  width: 280px;
  padding: 16px;
  background: rgba(8, 16, 24, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
}

.color-picker__section {
  margin-bottom: 16px;
}

.color-picker__section:last-child {
  margin-bottom: 0;
}

.color-picker__section-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
  margin-bottom: 8px;
}

.color-picker__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-picker__field span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.color-picker__field input[type="text"],
.color-picker__field input[type="number"] {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: inherit;
  font-family: inherit;
  font-size: 13px;
}

.color-picker__field input:focus {
  outline: none;
  border-color: rgba(0, 255, 194, 0.5);
}

.color-picker__rgb {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.color-picker__field--small input {
  text-align: center;
}

.color-picker__slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker__slider input[type="range"] {
  flex: 1;
  height: 6px;
  background: linear-gradient(to right, transparent, currentColor);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.color-picker__slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: rgba(0, 255, 194, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
}

.color-picker__slider input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: rgba(0, 255, 194, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.color-picker__slider-value {
  font-size: 12px;
  font-family: monospace;
  min-width: 40px;
  text-align: right;
  opacity: 0.85;
}

.color-picker__presets {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.color-picker__preset {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.15s;
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

.color-picker__preset:hover {
  transform: scale(1.1);
  border-color: rgba(0, 255, 194, 0.5);
}
</style>
