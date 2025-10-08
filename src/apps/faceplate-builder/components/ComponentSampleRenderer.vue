<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { PaletteTemplate } from '../types';

type SampleProps = {
  componentId: string;
  name: string;
  props: Record<string, unknown>;
  template?: PaletteTemplate | null;
};

const props = defineProps<SampleProps>();

type SampleModel = {
  variant: string;
  label?: string;
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: string;
  align?: string;
  lineHeight?: number;
  letterSpacing?: number;
  backgroundColor?: string;
  value?: string;
  suffix?: string;
  state?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  window?: string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  sides?: number;
  rotation?: number;
  options?: string[];
  selectedIndex?: number;
  checked?: boolean;
  lineColor?: string;
  lineWidth?: number;
  buttonColor?: string;
  buttonTextColor?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: string;
  containerColor?: string;
  containerBorderColor?: string;
  containerBorderWidth?: number;
  containerPadding?: number;
  layoutDirection?: string;
  gap?: number;
  detail?: string;
  frameless?: boolean;
  inputSuffix?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
};

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
}

function coerceFontWeight(value: unknown, fallback = 500): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    return value.trim() || fallback;
  }
  return fallback;
}

function normalizeOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options
      .map((option) => String(option).trim())
      .filter((option) => option.length > 0);
  }

  if (typeof options === 'string') {
    return options
      .split(',')
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
  }

  return [];
}

const resolved = computed<SampleModel>(() => {
  const template = props.template ?? null;
  const primitiveId = template?.primitiveId ?? props.componentId;
  const previewProps = template?.previewProps ?? {};
  const mergedProps = { ...template?.defaults.props, ...previewProps, ...props.props };
  const baseLabel = template?.label ?? props.name ?? 'Component';
  const label = String(mergedProps.label ?? mergedProps.text ?? baseLabel);

  switch (primitiveId) {
    case 'primitive.gauge.arc':
    case 'value-indicator': {
      const value = coerceNumber(mergedProps.value, 0);
      const precision = coerceNumber(mergedProps.precision, 1);
      return {
        variant: 'metric',
        label,
        value: value.toFixed(Math.max(0, Math.min(4, precision))),
        suffix: String(mergedProps.suffix ?? mergedProps.unit ?? ''),
      };
    }
    case 'primitive.status.pill':
    case 'status-tile': {
      const state = typeof mergedProps.status === 'boolean'
        ? mergedProps.status
        : Boolean(mergedProps.state ?? true);
      return {
        variant: 'status',
        label,
        state,
        trueLabel: String(mergedProps.trueLabel ?? 'Running'),
        falseLabel: String(mergedProps.falseLabel ?? 'Stopped'),
      };
    }
    case 'primitive.trend.sparkline':
    case 'trend-chart':
      return {
        variant: 'trend',
        label,
        window: String(mergedProps.window ?? '15m'),
      };
    case 'primitive.text.block':
    case 'text-label': {
      const text = String(mergedProps.text ?? label);
      return {
        variant: 'label',
        label,
        text,
        textColor: String(mergedProps.textColor ?? '#ffffff'),
        fontSize: coerceNumber(mergedProps.fontSize, 20),
        fontWeight: coerceFontWeight(mergedProps.fontWeight, 500),
        fontStyle: String(mergedProps.fontStyle ?? 'normal'),
        align: String(mergedProps.align ?? 'center'),
        lineHeight: coerceNumber(mergedProps.lineHeight, 1.2),
        letterSpacing: coerceNumber(mergedProps.letterSpacing, 0),
        frameless: true,
      };
    }
    case 'primitive.form.field': {
      return {
        variant: 'text-input',
        label,
        placeholder: String(mergedProps.placeholder ?? 'Enter text'),
        textColor: String(mergedProps.textColor ?? '#ffffff'),
        backgroundColor: String(mergedProps.backgroundColor ?? 'rgba(0, 0, 0, 0.35)'),
        fontSize: coerceNumber(mergedProps.fontSize, 16),
        fontWeight: coerceFontWeight(mergedProps.fontWeight, 500),
        align: String(mergedProps.align ?? 'left'),
      };
    }
    case 'primitive.form.number': {
      return {
        variant: 'number-input',
        label,
        placeholder: String(mergedProps.placeholder ?? '0'),
        inputSuffix: String(mergedProps.suffix ?? ''),
        textColor: String(mergedProps.textColor ?? '#ffffff'),
        backgroundColor: String(mergedProps.backgroundColor ?? 'rgba(0, 0, 0, 0.35)'),
        min: coerceNumber(mergedProps.min, 0),
        max: coerceNumber(mergedProps.max, 100),
        step: coerceNumber(mergedProps.step, 1),
      };
    }
    case 'primitive.form.date': {
      return {
        variant: 'date-input',
        label,
        placeholder: String(mergedProps.placeholder ?? 'Select date'),
        detail: String(mergedProps.displayFormat ?? 'YYYY-MM-DD'),
      };
    }
    case 'primitive.form.time': {
      return {
        variant: 'time-input',
        label,
        placeholder: String(mergedProps.placeholder ?? 'Select time'),
        detail: `${coerceNumber(mergedProps.stepMinutes, 5)} min step` ,
      };
    }
    case 'primitive.form.dropdown': {
      const options = normalizeOptions(mergedProps.options);
      const selectedIndex = Math.min(
        Math.max(0, coerceNumber(mergedProps.selectedIndex, 0)),
        Math.max(0, options.length - 1),
      );
      return {
        variant: 'dropdown',
        label,
        options,
        selectedIndex,
      };
    }
    case 'primitive.form.toggle': {
      const checked = Boolean(mergedProps.checked);
      return {
        variant: 'toggle',
        label,
        checked,
        trueLabel: String(mergedProps.trueLabel ?? 'On'),
        falseLabel: String(mergedProps.falseLabel ?? 'Off'),
      };
    }
    case 'primitive.form.button': {
      return {
        variant: 'button',
        label,
        buttonColor: String(mergedProps.color ?? '#00ffaa'),
        buttonTextColor: String(mergedProps.textColor ?? '#000000'),
        frameless: true,
      };
    }
    case 'primitive.shape.rectangle': {
      return {
        variant: 'shape-rect',
        fillColor: String(mergedProps.fillColor ?? '#00ffaa'),
        borderColor: String(mergedProps.borderColor ?? 'transparent'),
        borderWidth: coerceNumber(mergedProps.borderWidth, 0),
        opacity: clamp01(mergedProps.opacity, 1),
        rotation: coerceNumber(mergedProps.rotation, 0),
        frameless: true,
        label,
      };
    }
    case 'primitive.shape.circle': {
      return {
        variant: 'shape-circle',
        fillColor: String(mergedProps.fillColor ?? '#0088ff'),
        borderColor: String(mergedProps.borderColor ?? 'transparent'),
        borderWidth: coerceNumber(mergedProps.borderWidth, 0),
        opacity: clamp01(mergedProps.opacity, 1),
        rotation: coerceNumber(mergedProps.rotation, 0),
        frameless: true,
        label,
      };
    }
    case 'primitive.shape.line': {
      return {
        variant: 'shape-line',
        lineColor: String(mergedProps.strokeColor ?? '#ffffff'),
        lineWidth: coerceNumber(mergedProps.strokeWidth, 3),
        opacity: clamp01(mergedProps.opacity, 1),
        rotation: coerceNumber(mergedProps.rotation, 0),
        frameless: true,
        label,
      };
    }
    case 'primitive.shape.polygon': {
      return {
        variant: 'shape-polygon',
        fillColor: String(mergedProps.fillColor ?? '#ff8800'),
        borderColor: String(mergedProps.borderColor ?? 'transparent'),
        borderWidth: coerceNumber(mergedProps.borderWidth, 2),
        opacity: clamp01(mergedProps.opacity, 1),
        sides: Math.max(3, Math.round(coerceNumber(mergedProps.sides, 6))),
        rotation: coerceNumber(mergedProps.rotation, 0),
        frameless: true,
        label,
      };
    }
    case 'primitive.image': {
      return {
        variant: 'image',
        imageSrc: String(mergedProps.src ?? ''),
        imageAlt: String(mergedProps.alt ?? label),
        imageFit: String(mergedProps.fit ?? 'contain'),
        frameless: true,
        label,
      };
    }
    case 'primitive.container': {
      return {
        variant: 'container',
        containerColor: String(mergedProps.backgroundColor ?? 'rgba(255, 255, 255, 0.05)'),
        containerBorderColor: String(mergedProps.borderColor ?? 'rgba(255, 255, 255, 0.2)'),
        containerBorderWidth: coerceNumber(mergedProps.borderWidth, 1),
        containerPadding: coerceNumber(mergedProps.padding, 10),
        layoutDirection: String(mergedProps.layoutDirection ?? 'vertical'),
        gap: coerceNumber(mergedProps.gap, 12),
        opacity: clamp01(mergedProps.opacity, 1),
        frameless: true,
        label,
      };
    }
    default:
      return {
        variant: 'fallback',
        label,
        detail: 'This component will render using its runtime configuration.',
      };
  }
});

const imageStyle = computed<CSSProperties>(() => {
  if (resolved.value.variant !== 'image') {
    return {};
  }
  return {
    objectFit: resolved.value.imageFit ?? 'contain',
  } as CSSProperties;
});

function buildPolygonClipPath(sides: number, rotation = 0): string {
  const points: string[] = [];
  const angleOffset = ((rotation % 360) / 180) * Math.PI;
  for (let i = 0; i < sides; i += 1) {
    const theta = angleOffset + (2 * Math.PI * i) / sides;
    const x = 50 + 48 * Math.cos(theta);
    const y = 50 + 48 * Math.sin(theta);
    points.push(`${x}% ${y}%`);
  }
  return `polygon(${points.join(', ')})`;
}

const labelTextStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'label') {
    return {};
  }
  const style: CSSProperties = {
    color: resolved.value.textColor,
    fontSize: resolved.value.fontSize ? `${resolved.value.fontSize}px` : undefined,
    fontWeight: resolved.value.fontWeight as CSSProperties['fontWeight'],
    fontStyle: resolved.value.fontStyle as CSSProperties['fontStyle'],
    textAlign: (resolved.value.align ?? 'center') as CSSProperties['textAlign'],
    lineHeight: resolved.value.lineHeight ?? 1.2,
  };
  if (resolved.value.letterSpacing !== undefined) {
    style.letterSpacing = `${resolved.value.letterSpacing}px`;
  }
  return style;
});

const textInputStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'text-input') {
    return {};
  }
  const style: CSSProperties = {
    color: resolved.value.textColor,
    backgroundColor: resolved.value.backgroundColor,
    fontSize: resolved.value.fontSize ? `${resolved.value.fontSize}px` : undefined,
    fontWeight: resolved.value.fontWeight as CSSProperties['fontWeight'],
    textAlign: (resolved.value.align ?? 'left') as CSSProperties['textAlign'],
  };
  return style;
});

const numberInputContainerStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'number-input') {
    return {};
  }
  return {
    backgroundColor: resolved.value.backgroundColor,
  };
});

const numberInputValueStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'number-input') {
    return {};
  }
  return {
    color: resolved.value.textColor,
  };
});

const rectStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'shape-rect') {
    return {};
  }
  return {
    backgroundColor: resolved.value.fillColor,
    borderColor: resolved.value.borderColor,
    borderWidth: resolved.value.borderWidth ?? 0,
    opacity: resolved.value.opacity ?? 1,
    transform: resolved.value.rotation ? `rotate(${resolved.value.rotation}deg)` : undefined,
  };
});

const circleStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'shape-circle') {
    return {};
  }
  return {
    backgroundColor: resolved.value.fillColor,
    borderColor: resolved.value.borderColor,
    borderWidth: resolved.value.borderWidth ?? 0,
    opacity: resolved.value.opacity ?? 1,
    transform: resolved.value.rotation ? `rotate(${resolved.value.rotation}deg)` : undefined,
  };
});

const lineStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'shape-line') {
    return {};
  }
  return {
    backgroundColor: resolved.value.lineColor,
    height: resolved.value.lineWidth ?? 2,
    opacity: resolved.value.opacity ?? 1,
    transform: resolved.value.rotation ? `rotate(${resolved.value.rotation}deg)` : undefined,
  };
});

const polygonStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'shape-polygon') {
    return {};
  }
  return {
    backgroundColor: resolved.value.fillColor,
    borderColor: resolved.value.borderColor,
    borderWidth: resolved.value.borderWidth ?? 0,
    opacity: resolved.value.opacity ?? 1,
    clipPath: resolved.value.sides
      ? buildPolygonClipPath(resolved.value.sides, resolved.value.rotation ?? 0)
      : undefined,
  };
});

const containerStyle = computed((): CSSProperties => {
  if (resolved.value.variant !== 'container') {
    return {};
  }
  return {
    backgroundColor: resolved.value.containerColor,
    borderColor: resolved.value.containerBorderColor,
    borderWidth: resolved.value.containerBorderWidth ?? 0,
    padding: resolved.value.containerPadding ?? 8,
    opacity: resolved.value.opacity ?? 1,
    flexDirection:
      (resolved.value.layoutDirection === 'horizontal' ? 'row' : 'column') as CSSProperties['flexDirection'],
    gap: `${resolved.value.gap ?? 12}px`,
  };
});
</script>

<template>
  <div class="sample" :class="[`sample--${resolved.variant}`, { 'sample--frameless': resolved.frameless }]">
    <template v-if="resolved.variant === 'metric'">
      <header>{{ resolved.label }}</header>
      <div class="sample__metric">
        <span>{{ resolved.value }}</span>
        <small v-if="resolved.suffix">{{ resolved.suffix }}</small>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'status'">
      <header>{{ resolved.label }}</header>
      <div class="sample__status" :class="{ 'sample__status--on': resolved.state }">
        <span>{{ resolved.state ? resolved.trueLabel : resolved.falseLabel }}</span>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'trend'">
      <header>{{ resolved.label }}</header>
      <div class="sample__trend">
        <span>{{ resolved.window }} window</span>
        <canvas aria-hidden="true"></canvas>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'label'">
      <div class="sample__label" :title="resolved.label" :style="labelTextStyle">
        <span>{{ resolved.text }}</span>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'text-input'">
      <div class="sample__field">
        <label>
          <span v-if="resolved.label" class="sample__field-label-text">{{ resolved.label }}</span>
          <input
            class="sample__input"
            :placeholder="resolved.placeholder"
            readonly
            :style="textInputStyle"
          />
        </label>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'number-input'">
      <div class="sample__field">
        <label>
          <span v-if="resolved.label" class="sample__field-label-text">{{ resolved.label }}</span>
          <div class="sample__input sample__input--number" :style="numberInputContainerStyle">
            <span class="sample__number-value" :style="numberInputValueStyle">
              {{ resolved.placeholder }}
            </span>
            <span v-if="resolved.inputSuffix" class="sample__number-suffix">{{ resolved.inputSuffix }}</span>
          </div>
          <small class="sample__range-hint">{{ resolved.min }} – {{ resolved.max }} (step {{ resolved.step }})</small>
        </label>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'date-input'">
      <div class="sample__field">
        <label>
          <span v-if="resolved.label" class="sample__field-label-text">{{ resolved.label }}</span>
          <div class="sample__input sample__input--date">
            <span>{{ resolved.placeholder }}</span>
            <span class="sample__date-icon">📅</span>
          </div>
          <small v-if="resolved.detail" class="sample__range-hint">Format {{ resolved.detail }}</small>
        </label>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'time-input'">
      <div class="sample__field">
        <label>
          <span v-if="resolved.label" class="sample__field-label-text">{{ resolved.label }}</span>
          <div class="sample__input sample__input--date">
            <span>{{ resolved.placeholder }}</span>
            <span class="sample__date-icon">⏰</span>
          </div>
          <small v-if="resolved.detail" class="sample__range-hint">{{ resolved.detail }}</small>
        </label>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'dropdown'">
      <div class="sample__dropdown">
        <label>
          <span>{{ resolved.label }}</span>
          <select disabled>
            <option
              v-for="(option, index) in resolved.options"
              :key="`${option}-${index}`"
              :selected="index === resolved.selectedIndex"
            >
              {{ option }}
            </option>
          </select>
        </label>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'toggle'">
      <div class="sample__toggle-wrapper">
        <span class="sample__field-label">{{ resolved.label }}</span>
        <div class="sample__toggle" :class="{ 'sample__toggle--on': resolved.checked }">
          <span class="sample__toggle-thumb"></span>
        </div>
        <span class="sample__toggle-text">
          {{ resolved.checked ? resolved.trueLabel : resolved.falseLabel }}
        </span>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'button'">
      <button
        type="button"
        class="sample__button"
        :style="{ backgroundColor: resolved.buttonColor, color: resolved.buttonTextColor }"
        disabled
      >
        {{ resolved.label }}
      </button>
    </template>

    <template v-else-if="resolved.variant === 'shape-rect'">
      <div class="sample__shape" :title="resolved.label">
        <div class="sample__shape-rect" :style="rectStyle"></div>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'shape-circle'">
      <div class="sample__shape" :title="resolved.label">
        <div class="sample__shape-circle" :style="circleStyle"></div>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'shape-line'">
      <div class="sample__shape" :title="resolved.label">
        <div class="sample__shape-line" :style="lineStyle"></div>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'shape-polygon'">
      <div class="sample__shape" :title="resolved.label">
        <div class="sample__shape-polygon" :style="polygonStyle">
          <span>{{ resolved.sides }} sides</span>
        </div>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'image'">
      <div class="sample__image" :title="resolved.label">
        <template v-if="resolved.imageSrc">
          <img :src="resolved.imageSrc" :alt="resolved.imageAlt" :style="imageStyle" />
        </template>
        <template v-else>
          <div class="sample__image-placeholder">No image configured</div>
        </template>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'container'">
      <div class="sample__container" :title="resolved.label" :style="containerStyle">
        <span class="sample__container-text">Container</span>
      </div>
    </template>

    <template v-else>
      <div class="sample__fallback">
        <header v-if="resolved.label">{{ resolved.label }}</header>
        <span>{{ resolved.text ?? resolved.detail ?? 'Preview unavailable' }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
 .sample {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  border-radius: 12px;
  color: var(--qui-text-primary);
  padding: 12px;
  box-sizing: border-box;
}

.sample:not(.sample--frameless) {
  background: linear-gradient(150deg, rgba(8, 20, 28, 0.9), rgba(2, 12, 18, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}

.sample--frameless {
  padding: 0;
  border: none;
  box-shadow: none;
  background: transparent;
}

.sample header {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
}

.sample__metric {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.sample__metric span {
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.sample__metric small {
  font-size: 14px;
  opacity: 0.7;
}

.sample__status {
  border-radius: 10px;
  padding: 12px;
  background: rgba(210, 60, 60, 0.2);
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.08em;
  transition: background 0.2s ease;
}

.sample__status--on {
  background: rgba(0, 220, 160, 0.25);
}

.sample__trend {
  flex: 1;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(160deg, rgba(0, 32, 48, 0.9), rgba(0, 64, 96, 0.55));
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  padding: 12px;
}

.sample__trend span {
  font-size: 12px;
  opacity: 0.75;
  margin-bottom: 8px;
}

.sample__trend canvas {
  width: 100%;
  height: 80px;
  background: repeating-linear-gradient(
    90deg,
    rgba(0, 255, 194, 0.35),
    rgba(0, 255, 194, 0.35) 4px,
    transparent 4px,
    transparent 8px
  );
  border-radius: 8px;
}

.sample__label {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

.sample__field,
.sample__dropdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sample__field label,
.sample__dropdown label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}

.sample__input,
.sample__dropdown select {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.45);
  color: inherit;
  padding: 10px;
  pointer-events: none;
}

.sample__field-label-text {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.65;
}

.sample__range-hint {
  font-size: 11px;
  opacity: 0.55;
  margin-top: 6px;
}

.sample__input--number {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sample__number-value {
  font-size: 16px;
  letter-spacing: 0.02em;
}

.sample__number-suffix {
  font-size: 12px;
  opacity: 0.7;
}

.sample__input--date {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  padding: 10px;
}

.sample__date-icon {
  font-size: 16px;
  opacity: 0.7;
}

.sample__toggle-wrapper {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 6px 12px;
}

.sample__toggle-wrapper .sample__field-label-text {
  grid-column: 1 / -1;
}

.sample__toggle {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.2s ease;
}

.sample__toggle--on {
  background: rgba(0, 255, 194, 0.4);
}

.sample__toggle-thumb {
  position: absolute;
  top: 3px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #0a1520;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;
}

.sample__toggle--on .sample__toggle-thumb {
  transform: translateX(18px);
}

.sample__toggle-text {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}

.sample__button {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.9;
  cursor: default;
}

.sample__shape {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sample__shape-rect,
.sample__shape-circle,
.sample__shape-polygon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  min-height: 64px;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  border-style: solid;
  border-radius: 12px;
  box-sizing: border-box;
  color: var(--qui-text-primary);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sample__shape-circle {
  border-radius: 50%;
}

.sample__shape-line {
  width: 85%;
  border-radius: 999px;
}

.sample__image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
  border: 1px dashed rgba(255, 255, 255, 0.16);
}

.sample__image img {
  width: 100%;
  height: 100%;
}

.sample__image-placeholder {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.6;
}

.sample__container {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  border-style: dashed;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.sample__container-text {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
}

.sample__fallback {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  text-align: center;
  opacity: 0.75;
}

.sample__fallback header {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sample--shape-rect,
.sample--shape-circle,
.sample--shape-line,
.sample--shape-polygon,
.sample--image,
.sample--container,
.sample--button,
.sample--label {
  align-items: center;
}
</style>
