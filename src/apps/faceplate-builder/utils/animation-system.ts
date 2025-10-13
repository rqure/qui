/**
 * Animation System for Faceplate Builder
 * 
 * Provides animation support that can be bound to field values.
 * Animations can trigger based on conditions (field values, thresholds, etc.)
 */

export type AnimationType = 
  | 'pulse'           // Scale pulsing
  | 'fade'            // Opacity fade in/out
  | 'shake'           // Horizontal shake
  | 'rotate'          // Continuous rotation
  | 'slide'           // Position slide
  | 'bounce'          // Bounce effect
  | 'flash'           // Color flash
  | 'glow';           // Glow effect

export type AnimationTrigger = 
  | 'always'          // Always animating
  | 'condition'       // When condition is true
  | 'threshold'       // When value crosses threshold
  | 'change';         // When value changes

export interface AnimationDefinition {
  id: string;
  type: AnimationType;
  trigger: AnimationTrigger;
  
  // Trigger configuration
  condition?: string;        // Expression for condition trigger
  thresholdField?: string;   // Field path for threshold trigger
  thresholdValue?: number;   // Threshold value
  thresholdOperator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  
  // Animation parameters
  duration?: number;         // Animation duration in ms
  iterations?: number | 'infinite';  // Number of iterations
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;           // Delay before starting in ms
  
  // Type-specific parameters
  pulseScale?: number;      // Scale factor for pulse (default 1.1)
  fadeMin?: number;         // Minimum opacity for fade (default 0.3)
  fadeMax?: number;         // Maximum opacity for fade (default 1)
  shakeDistance?: number;   // Shake distance in px (default 10)
  rotateSpeed?: number;     // Rotation speed in deg/s (default 360)
  slideDistance?: number;   // Slide distance in px (default 20)
  slideDirection?: 'up' | 'down' | 'left' | 'right';
  bounceHeight?: number;    // Bounce height in px (default 20)
  flashColor?: string;      // Flash color (default red)
  glowColor?: string;       // Glow color (default current color)
  glowSize?: number;        // Glow blur radius (default 10)
  
  // State
  enabled?: boolean;        // Whether animation is enabled
  description?: string;     // User description
}

export interface AnimationState {
  active: boolean;
  lastTriggerValue?: any;
  lastChangeTimestamp?: number;
}

/**
 * Generate CSS animation string for an animation definition
 */
export function generateAnimationCSS(animation: AnimationDefinition): string {
  const {
    type,
    duration = 1000,
    iterations = 'infinite',
    easing = 'ease-in-out',
    delay = 0,
  } = animation;
  
  const animationName = `anim-${type}-${animation.id}`;
  const durationSec = duration / 1000;
  const delaySec = delay / 1000;
  const iterationCount = iterations === 'infinite' ? 'infinite' : iterations;
  
  return `${animationName} ${durationSec}s ${easing} ${delaySec}s ${iterationCount}`;
}

/**
 * Generate CSS keyframes for an animation definition
 */
export function generateAnimationKeyframes(animation: AnimationDefinition): string {
  const animationName = `anim-${animation.type}-${animation.id}`;
  
  switch (animation.type) {
    case 'pulse': {
      const scale = animation.pulseScale ?? 1.1;
      return `
        @keyframes ${animationName} {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(${scale}); }
        }
      `;
    }
    
    case 'fade': {
      const min = animation.fadeMin ?? 0.3;
      const max = animation.fadeMax ?? 1;
      return `
        @keyframes ${animationName} {
          0%, 100% { opacity: ${max}; }
          50% { opacity: ${min}; }
        }
      `;
    }
    
    case 'shake': {
      const distance = animation.shakeDistance ?? 10;
      return `
        @keyframes ${animationName} {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-${distance}px); }
          20%, 40%, 60%, 80% { transform: translateX(${distance}px); }
        }
      `;
    }
    
    case 'rotate': {
      return `
        @keyframes ${animationName} {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
    }
    
    case 'slide': {
      const distance = animation.slideDistance ?? 20;
      const direction = animation.slideDirection ?? 'up';
      let transform = '';
      switch (direction) {
        case 'up': transform = `translateY(-${distance}px)`; break;
        case 'down': transform = `translateY(${distance}px)`; break;
        case 'left': transform = `translateX(-${distance}px)`; break;
        case 'right': transform = `translateX(${distance}px)`; break;
      }
      return `
        @keyframes ${animationName} {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: ${transform}; }
        }
      `;
    }
    
    case 'bounce': {
      const height = animation.bounceHeight ?? 20;
      return `
        @keyframes ${animationName} {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-${height}px); }
        }
      `;
    }
    
    case 'flash': {
      const color = animation.flashColor ?? '#ff0000';
      return `
        @keyframes ${animationName} {
          0%, 100% { background-color: transparent; }
          50% { background-color: ${color}; }
        }
      `;
    }
    
    case 'glow': {
      const color = animation.glowColor ?? 'currentColor';
      const size = animation.glowSize ?? 10;
      return `
        @keyframes ${animationName} {
          0%, 100% { box-shadow: 0 0 0 rgba(0,0,0,0); }
          50% { box-shadow: 0 0 ${size}px ${color}; }
        }
      `;
    }
    
    default:
      return '';
  }
}

/**
 * Evaluate whether an animation should be active based on its trigger
 */
export function evaluateAnimationTrigger(
  animation: AnimationDefinition,
  state: AnimationState,
  context: {
    getValue: (fieldPath: string) => any;
    evaluateExpression?: (expr: string) => boolean;
  }
): boolean {
  if (animation.enabled === false) {
    return false;
  }
  
  switch (animation.trigger) {
    case 'always':
      return true;
      
    case 'condition':
      if (!animation.condition || !context.evaluateExpression) {
        return false;
      }
      try {
        return context.evaluateExpression(animation.condition);
      } catch (error) {
        console.error('Animation condition evaluation error:', error);
        return false;
      }
      
    case 'threshold':
      if (!animation.thresholdField) {
        return false;
      }
      try {
        const value = context.getValue(animation.thresholdField);
        const threshold = animation.thresholdValue ?? 0;
        const operator = animation.thresholdOperator ?? '>';
        
        if (typeof value !== 'number') {
          return false;
        }
        
        switch (operator) {
          case '>': return value > threshold;
          case '<': return value < threshold;
          case '>=': return value >= threshold;
          case '<=': return value <= threshold;
          case '==': return value === threshold;
          case '!=': return value !== threshold;
          default: return false;
        }
      } catch (error) {
        console.error('Animation threshold evaluation error:', error);
        return false;
      }
      
    case 'change':
      if (!animation.thresholdField) {
        return false;
      }
      try {
        const value = context.getValue(animation.thresholdField);
        const changed = value !== state.lastTriggerValue;
        if (changed) {
          state.lastTriggerValue = value;
          state.lastChangeTimestamp = Date.now();
          return true;
        }
        // Keep active for a short period after change
        const timeSinceChange = Date.now() - (state.lastChangeTimestamp ?? 0);
        return timeSinceChange < (animation.duration ?? 1000);
      } catch (error) {
        console.error('Animation change evaluation error:', error);
        return false;
      }
      
    default:
      return false;
  }
}

/**
 * Default animation presets
 */
export const ANIMATION_PRESETS: Record<string, Partial<AnimationDefinition>> = {
  'alarm-pulse': {
    type: 'pulse',
    trigger: 'condition',
    duration: 600,
    iterations: 'infinite',
    pulseScale: 1.15,
    description: 'Pulse when alarm condition is true',
  },
  'alarm-flash': {
    type: 'flash',
    trigger: 'condition',
    duration: 800,
    iterations: 'infinite',
    flashColor: 'rgba(255, 0, 0, 0.5)',
    description: 'Flash red when alarm condition is true',
  },
  'status-glow': {
    type: 'glow',
    trigger: 'condition',
    duration: 1500,
    iterations: 'infinite',
    glowColor: 'rgba(0, 255, 170, 0.8)',
    glowSize: 15,
    description: 'Glow when status is active',
  },
  'loading-rotate': {
    type: 'rotate',
    trigger: 'always',
    duration: 2000,
    iterations: 'infinite',
    easing: 'linear',
    description: 'Continuous rotation for loading indicators',
  },
  'value-changed': {
    type: 'bounce',
    trigger: 'change',
    duration: 500,
    iterations: 1,
    bounceHeight: 10,
    description: 'Bounce when value changes',
  },
  'high-temperature': {
    type: 'shake',
    trigger: 'threshold',
    duration: 500,
    iterations: 'infinite',
    shakeDistance: 8,
    thresholdOperator: '>',
    thresholdValue: 80,
    description: 'Shake when temperature exceeds threshold',
  },
};
