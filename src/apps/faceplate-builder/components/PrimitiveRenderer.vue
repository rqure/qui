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

    <!-- Line Shape -->
    <svg v-else-if="normalizedType === 'primitive.shape.line'" 
      class="shape-line" 
      width="100%" 
      height="100%" 
      preserveAspectRatio="none">
      <line 
        x1="0" 
        y1="50%" 
        x2="100%" 
        y2="50%" 
        :stroke="config.strokeColor"
        :stroke-width="config.strokeWidth"
        :stroke-dasharray="config.lineStyle === 'dashed' ? '8,4' : config.lineStyle === 'dotted' ? '2,2' : 'none'"
        :stroke-linecap="config.lineCap" />
    </svg>

    <!-- Polygon Shape -->
    <svg v-else-if="normalizedType === 'primitive.shape.polygon'" 
      class="shape-polygon" 
      width="100%" 
      height="100%" 
      :viewBox="`0 0 100 100`">
      <polygon 
        :points="(() => {
          const sides = config.sides || 6;
          const cx = 50, cy = 50, r = 45;
          const rotation = (config.rotation || 0) * Math.PI / 180;
          return Array.from({ length: sides }, (_, i) => {
            const angle = (2 * Math.PI * i / sides) - Math.PI / 2 + rotation;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ');
        })()"
        :fill="config.fillColor"
        :stroke="config.borderColor"
        :stroke-width="config.borderWidth" />
    </svg>

    <!-- Arc Shape -->
    <svg v-else-if="normalizedType === 'primitive.shape.arc'" 
      class="shape-arc" 
      width="100%" 
      height="100%" 
      :viewBox="`0 0 100 100`">
      <path 
        :d="(() => {
          const cx = 50, cy = 50, r = 45;
          const startAngle = (config.startAngle || 0) * Math.PI / 180;
          const endAngle = (config.endAngle || 180) * Math.PI / 180;
          const x1 = cx + r * Math.cos(startAngle - Math.PI / 2);
          const y1 = cy + r * Math.sin(startAngle - Math.PI / 2);
          const x2 = cx + r * Math.cos(endAngle - Math.PI / 2);
          const y2 = cy + r * Math.sin(endAngle - Math.PI / 2);
          const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
          return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
        })()"
        :fill="config.fillColor"
        :stroke="config.strokeColor"
        :stroke-width="config.strokeWidth"
        stroke-linecap="round" />
    </svg>

    <!-- Image -->
    <div v-else-if="normalizedType === 'primitive.media.image'" class="image-primitive"
      :style="{ opacity: config.opacity || 1 }">
      <img 
        v-if="config.url" 
        :src="config.url" 
        :alt="config.alt || 'Image'"
        :style="{ 
          width: '100%', 
          height: '100%', 
          objectFit: config.objectFit || 'contain' 
        }" />
      <div v-else class="image-placeholder">
        <span>🖼️</span>
        <span>No image URL</span>
      </div>
    </div>

    <!-- Group -->
    <div v-else-if="normalizedType === 'primitive.group'"
      v-show="getValue('visible', true)"
      class="group-primitive"
      :style="{ 
        opacity: getValue('opacity', 1),
        transform: `rotate(${config.rotation || 0}deg)`,
        transformOrigin: 'center'
      }">
      <slot>
        <span v-if="editMode" class="container-placeholder">Empty Group</span>
      </slot>
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

.shape-line,
.shape-polygon,
.shape-arc {
  width: 100%;
  height: 100%;
}

.image-primitive {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.5;
  font-size: 14px;
}

.image-placeholder span:first-child {
  font-size: 32px;
}

.group-primitive {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
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
