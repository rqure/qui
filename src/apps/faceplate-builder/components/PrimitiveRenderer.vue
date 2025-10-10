<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { EntityId } from '@/core/data/types';

interface Props {
  type: string;
  config: Record<string, any>;
  bindings?: Record<string, unknown>;
  editMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  bindings: () => ({}),
  editMode: false,
});

// Local state for tab container active tab
const localActiveTab = ref(0);

// Watch for external activeTab changes
watch(() => props.config.activeTab, (newVal) => {
  if (newVal !== undefined) {
    localActiveTab.value = newVal;
  }
}, { immediate: true });

// Handle tab click
function handleTabClick(index: number) {
  if (!props.editMode) {
    localActiveTab.value = index;
  }
}

// Helper to get effective value (binding overrides config)
function getValue(key: string, defaultValue?: any): any {
  if (props.bindings && props.bindings[key] !== undefined && props.bindings[key] !== null) {
    return props.bindings[key];
  }
  if (props.config[key] !== undefined) {
    return props.config[key];
  }
  return defaultValue ?? '';
}

// Helper to convert alignment values to CSS
function getAlignValue(align: string): string {
  const alignMap: Record<string, string> = {
    'start': 'flex-start',
    'end': 'flex-end',
    'center': 'center',
    'stretch': 'stretch',
    'space-between': 'space-between',
    'space-around': 'space-around',
  };
  return alignMap[align] || align;
}

// Computed values for different component types
const textValue = computed(() => {
  const val = getValue('text', getValue('value', ''));
  if (val === null || val === undefined) return props.editMode ? '<unbound>' : '—';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
});

const normalizedType = computed(() => props.type.toLowerCase());
</script>

<template>
  <div class="primitive-renderer" :class="`primitive-${normalizedType}`">
    <!-- Text Block -->
    <div v-if="normalizedType === 'primitive.text.block'" class="text-block" 
      :style="{ 
        color: config.textColor,
        fontSize: `${config.fontSize}px`,
        fontWeight: config.fontWeight,
        fontStyle: config.fontStyle,
        textAlign: config.align,
        lineHeight: config.lineHeight,
        letterSpacing: `${config.letterSpacing}px`
      }">
      {{ textValue }}
    </div>

    <!-- Form Field / Text Input -->
    <div v-else-if="normalizedType === 'primitive.form.field'" class="form-input">
      <input 
        type="text" 
        :placeholder="config.placeholder"
        :value="textValue"
        :readonly="editMode"
        :style="{ 
          color: config.textColor,
          backgroundColor: config.backgroundColor,
          fontSize: `${config.fontSize}px`,
          fontWeight: config.fontWeight,
          textAlign: config.align
        }"
      />
    </div>

    <!-- Number Input -->
    <div v-else-if="normalizedType === 'primitive.form.number'" class="form-input">
      <input 
        type="number" 
        :placeholder="config.placeholder"
        :value="textValue"
        :min="config.min"
        :max="config.max"
        :step="config.step"
        :readonly="editMode"
        :style="{ 
          color: config.textColor,
          backgroundColor: config.backgroundColor,
          fontSize: `${config.fontSize}px`
        }"
      />
    </div>

    <!-- Button -->
    <button v-else-if="normalizedType === 'primitive.form.button'" class="button-primitive"
      :style="{ 
        color: config.textColor,
        backgroundColor: config.backgroundColor,
        fontSize: `${config.fontSize}px`,
        fontWeight: config.fontWeight
      }">
      {{ config.label || 'Button' }}
    </button>

    <!-- Toggle -->
    <div v-else-if="normalizedType === 'primitive.form.toggle'" class="toggle-primitive">
      <label class="toggle-switch">
        <input type="checkbox" :checked="!!getValue('value', false)" :disabled="editMode" />
        <span class="toggle-slider" :style="{
          backgroundColor: getValue('value', false) ? config.activeColor : config.inactiveColor
        }"></span>
      </label>
      <span class="toggle-label">{{ config.label }}</span>
    </div>

    <!-- Rectangle Shape -->
    <div v-else-if="normalizedType === 'primitive.shape.rectangle'" class="shape-rectangle"
      :style="{ 
        backgroundColor: config.fillColor,
        border: `${config.borderWidth}px solid ${config.borderColor}`,
        borderRadius: `${config.cornerRadius}px`
      }">
    </div>

    <!-- Circle Shape -->
    <div v-else-if="normalizedType === 'primitive.shape.circle'" class="shape-circle"
      :style="{ 
        backgroundColor: config.fillColor,
        border: `${config.borderWidth}px solid ${config.borderColor}`
      }">
    </div>

    <!-- Container -->
    <div v-else-if="normalizedType === 'primitive.container'" 
      v-show="getValue('visible', true)"
      class="container-primitive"
      :style="{ 
        backgroundColor: config.backgroundColor || 'transparent',
        border: `${config.borderWidth}px solid ${config.borderColor}`,
        borderRadius: `${config.cornerRadius}px`,
        padding: `${config.padding}px`,
        gap: `${config.gap}px`,
        opacity: getValue('opacity', 1),
        overflow: getValue('overflow', 'visible'),
        flexDirection: config.layoutDirection === 'horizontal' ? 'row' : 'column',
        flexWrap: getValue('wrap', false) ? 'wrap' : 'nowrap',
        justifyContent: config.layoutDirection === 'horizontal' ? getAlignValue(getValue('horizontalAlign', 'stretch')) : getAlignValue(getValue('verticalAlign', 'start')),
        alignItems: config.layoutDirection === 'horizontal' ? getAlignValue(getValue('verticalAlign', 'start')) : getAlignValue(getValue('horizontalAlign', 'stretch'))
      }">
      <slot>
        <span v-if="editMode" class="container-placeholder">Empty Container</span>
      </slot>
    </div>

    <!-- Tab Container -->
    <div v-else-if="normalizedType === 'primitive.container.tabs'"
      v-show="getValue('visible', true)"
      class="tab-container"
      :style="{
        backgroundColor: config.backgroundColor || 'transparent',
        border: `${config.borderWidth}px solid ${config.borderColor}`,
        borderRadius: `${config.cornerRadius}px`,
        opacity: getValue('opacity', 1)
      }">
      <div class="tab-header"
        :class="{ 
          'tab-header-vertical': config.tabPosition === 'left' || config.tabPosition === 'right',
          'tab-header-bottom': config.tabPosition === 'bottom'
        }"
        :style="{ 
          backgroundColor: config.tabBackgroundColor,
          color: config.tabTextColor
        }">
        <button 
          v-for="(tab, index) in (config.tabs || [])"
          :key="tab.id || index"
          type="button"
          class="tab-button"
          :class="{ 'tab-button-active': localActiveTab === index }"
          :style="{
            backgroundColor: localActiveTab === index ? config.activeTabColor : 'transparent'
          }"
          @click.stop="handleTabClick(index)">
          {{ tab.name || `Tab ${index + 1}` }}
        </button>
      </div>
      <div class="tab-content" :style="{ padding: `${config.padding}px` }">
        <slot>
          <span v-if="editMode" class="container-placeholder">Empty Tab</span>
        </slot>
      </div>
    </div>

    <!-- Fallback -->
    <div v-else class="primitive-fallback">
      <div class="fallback-type">{{ type }}</div>
      <div class="fallback-config">{{ JSON.stringify(config) }}</div>
    </div>
  </div>
</template>

<style scoped>
.primitive-renderer {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* For containers, don't override their flex layout */
.primitive-renderer.primitive-primitive\.container,
.primitive-renderer.primitive-primitive\.container\.tabs {
  display: block;
  align-items: unset;
  justify-content: unset;
}

.text-block {
  width: 100%;
  height: 100%;
  padding: 8px;
  overflow-wrap: break-word;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-input {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}

.form-input input {
  width: 100%;
  height: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input input:focus {
  outline: none;
}

.button-primitive {
  width: 100%;
  height: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.1s, opacity 0.2s;
}

.button-primitive:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.button-primitive:active {
  transform: translateY(0);
}

.toggle-primitive {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
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

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.toggle-label {
  font-size: 14px;
}

.shape-rectangle {
  width: 100%;
  height: 100%;
}

.shape-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.container-primitive {
  width: 100%;
  height: 100%;
  display: flex;
  /* Layout properties controlled by inline styles */
}

.container-placeholder {
  opacity: 0.5;
  font-size: 12px;
  pointer-events: none;
}

.tab-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-header {
  display: flex;
  flex-direction: row;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-header-bottom {
  order: 2;
  border-bottom: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-header-vertical {
  flex-direction: column;
  border-bottom: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-button {
  padding: 8px 16px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: inherit;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.tab-button:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.tab-button-active {
  font-weight: 600;
}

.tab-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.primitive-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  font-size: 12px;
  padding: 8px;
}

.fallback-type {
  font-weight: 600;
  margin-bottom: 4px;
}

.fallback-config {
  font-family: monospace;
  font-size: 10px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
