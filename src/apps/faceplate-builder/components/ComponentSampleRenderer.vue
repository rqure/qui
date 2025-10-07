<script setup lang="ts">
import { computed } from 'vue';
import type { PaletteTemplate } from '../types';

type SampleProps = {
  componentId: string;
  name: string;
  props: Record<string, unknown>;
  template?: PaletteTemplate | null;
};

const props = defineProps<SampleProps>();

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const resolved = computed(() => {
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
        suffix: mergedProps.suffix ?? mergedProps.unit ?? '',
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
      };
    }
    case 'primitive.form.field': {
      return {
        variant: 'form',
        label,
        placeholder: String(mergedProps.placeholder ?? 'Enter value'),
      };
    }
    default:
      return {
        variant: 'unknown',
        label,
        text: 'Preview coming soon',
      };
  }
});
</script>

<template>
  <div class="sample" :class="`sample--${resolved.variant}`">
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
      <div class="sample__label">
        <span>{{ resolved.text }}</span>
      </div>
    </template>

    <template v-else-if="resolved.variant === 'form'">
      <header>{{ resolved.label }}</header>
      <div class="sample__form">
        <label>
          <span>{{ resolved.label }}</span>
          <input :placeholder="resolved.placeholder" readonly />
        </label>
      </div>
    </template>

    <template v-else>
      <header>{{ resolved.label }}</header>
      <div class="sample__fallback">{{ resolved.text }}</div>
    </template>
  </div>
</template>

<style scoped>
.sample {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(4, 18, 28, 0.92), rgba(10, 24, 36, 0.75));
  color: var(--qui-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sample header {
  font-size: 14px;
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
  background: rgba(210, 60, 60, 0.18);
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.08em;
  transition: background 0.2s ease;
}

.sample__status--on {
  background: rgba(0, 220, 160, 0.2);
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 18px;
  font-weight: 500;
  text-align: center;
}

.sample__fallback {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 14px;
  opacity: 0.7;
}

.sample__form {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
}

.sample__form label {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}

.sample__form input {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.5);
  color: inherit;
  padding: 10px;
  pointer-events: none;
}
</style>
