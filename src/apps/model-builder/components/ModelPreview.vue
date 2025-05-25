<script setup lang="ts">
import { ref, onMounted, watch, computed, onBeforeUnmount } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';
import { ValueType, ValueFactories, EntityFactories } from '@/core/data/types';
import { loadModelFromEntity } from '../utils/modelStorage';
import type { ModelConfig, BindingConfig, ShapeConfig } from '../utils/modelTypes';

const props = defineProps<{
  modelId?: EntityId | null;
  standalone?: boolean;
}>();

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const model = ref<ModelConfig | null>(null);
const stageSize = ref({ width: 0, height: 0 });
const scale = ref(1);
const bindings = ref<Record<string, BindingConfig>>({});
const bindingValues = ref<Record<string, any>>({});
const subscriptions = ref<{ token: string, unsubscribe: () => Promise<boolean> }[]>([]);

// Load model from server
async function loadModel() {
  loading.value = true;
  error.value = null;

  try {
    if (!props.modelId) {
      loading.value = false;
      return;
    }

    // Load model from entity
    const loadedModel = await loadModelFromEntity(dataStore, props.modelId);
    
    if (loadedModel) {
      model.value = loadedModel;
      
      // Load any nested models
      await loadNestedModels();
      
      // Set up bindings
      await setupBindings();
    } else {
      error.value = 'Model configuration not found or invalid';
    }

    loading.value = false;
  } catch (err) {
    error.value = 'Failed to load model: ' + (err as Error).message;
    loading.value = false;
  }
}

// Clean up subscriptions
async function cleanupSubscriptions() {
  for (const subscription of subscriptions.value) {
    try {
      await subscription.unsubscribe();
    } catch (e) {
      console.error('Error unsubscribing from binding:', e);
    }
  }
  subscriptions.value = [];
}

// Fix field method usage without using getEntity
const getInitialValue = async (entityId: EntityId, fieldName: string) => {
  try {
    // Create entity using EntityFactories instead of data store method
    const entity = EntityFactories.newEntity(entityId);
    const field = entity.field(fieldName);
    
    await dataStore.read([field]);
    
    if (field && field.value) {
      return field.value.raw;
    }
  } catch (err) {
    console.error(`Error getting initial value for ${entityId}:${fieldName}`, err);
  }
  return null;
};

// Modify the setupBindings method to use the correct approach
async function setupBindings() {
  // Clean up existing subscriptions first
  await cleanupSubscriptions();
  
  if (!model.value) return;
  
  // Extract bindings from model shapes
  bindings.value = {};
  
  // Process all shapes for bindings
  for (const shape of model.value.shapes || []) {
    if (!shape.properties) continue;
    
    // Look for properties with binding configurations
    for (const [propName, propBinding] of Object.entries(shape.properties)) {
      const binding = propBinding as any;
      
      if (binding && binding.binding && binding.entityId && binding.fieldName) {
        const bindingKey = `${shape.id}:${propName}`;
        
        // Store binding config
        bindings.value[bindingKey] = {
          entityId: binding.entityId,
          fieldName: binding.fieldName,
          animation: binding.animation || 'none'
        };
        
        try {
          // Subscribe to field changes
          const subscription = await dataStore.notify(
            { entityId: binding.entityId, fieldType: binding.fieldName },
            (notification: any) => {
              // Handle field update notification
              if (notification.current && notification.current.value) {
                // Update binding value based on the type
                bindingValues.value[bindingKey] = notification.current.value.raw;
              }
            }
          );
          
          // Save subscription for cleanup
          subscriptions.value.push(subscription);
          
          // Get initial value
          const initialValue = await getInitialValue(binding.entityId, binding.fieldName);
          if (initialValue !== null) {
            bindingValues.value[bindingKey] = initialValue;
          }
        } catch (err) {
          console.error(`Error setting up binding ${bindingKey}:`, err);
        }
      }
    }
  }
}

// Add function to load nested models
async function loadNestedModels() {
  if (!model.value) return;
  
  // Process all shapes to find nested models
  for (const shape of model.value.shapes) {
    if (shape.type === 'nestedModel' && shape.nestedModelId) {
      try {
        // Load the nested model
        const nestedModel = await loadModelFromEntity(dataStore, shape.nestedModelId as EntityId);
        if (nestedModel) {
          // Store the loaded model with the shape
          (shape as any).nestedModel = nestedModel;
          
          // Set up bindings for nested model if needed
          // This would need additional implementation
        }
      } catch (err) {
        console.error(`Error loading nested model for shape ${shape.id}:`, err);
      }
    }
  }
}

// Fix the getShapeStyle function to handle property access safely
const getShapeStyle = (shape: ShapeConfig) => {
  const style: Record<string, any> = { ...shape };
  
  // Apply bindings if any
  if (shape.properties) {
    for (const [propName, propBinding] of Object.entries(shape.properties)) {
      const binding = propBinding as any;
      
      if (binding && binding.binding) {
        const bindingKey = `${shape.id}:${propName}`;
        const bindingValue = bindingValues.value[bindingKey];
        
        // If we have a binding value, apply it to the shape property
        if (bindingValue !== undefined) {
          style[propName] = bindingValue;
        }
      }
    }
  }
  
  return style;
};

// Computed value for container classes
const containerClass = computed(() => {
  const classes = ['preview-container'];
  if (props.standalone) {
    classes.push('standalone');
  }
  return classes.join(' ');
});

// Improved resize handler
const handleResize = () => {
  const container = document.querySelector('.preview-container');
  if (!container) return;
  
  // Ensure we never set zero dimensions to prevent Konva errors
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  
  stageSize.value = {
    width,
    height
  };
  
  // Calculate scale to fit model in viewport
  if (model.value && model.value.width && model.value.height) {
    const scaleX = width / model.value.width;
    const scaleY = height / model.value.height;
    scale.value = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
  }
};

// Lifecycle hooks
onMounted(async () => {
  await loadModel();
  
  // Set up resize handling
  window.addEventListener('resize', handleResize);
  
  // Initial resize with a small delay to ensure DOM is ready
  setTimeout(handleResize, 100);
});

onBeforeUnmount(async () => {
  window.removeEventListener('resize', handleResize);
  await cleanupSubscriptions();
});

// Watch for model ID changes
watch(() => props.modelId, async () => {
  await loadModel();
  setTimeout(handleResize, 0);
}, { immediate: false });
</script>

<template>
  <div :class="containerClass">
    <div v-if="loading" class="preview-loading">
      <div class="mb-spinner"></div>
      <span>Loading model...</span>
    </div>
    
    <div v-else-if="error" class="preview-error">
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="#F44336" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,7H13V13H11V7M11,15H13V17H11V15Z" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="retry-button" @click="loadModel">Retry</button>
    </div>
    
    <div v-else-if="!model" class="preview-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
        <path fill="#666" d="M15,5.5L15,9.5L12.5,6.5L9.5,10L7.5,7.5L4,12L6,12L7.5,10L9.5,12.5L13,8L15,10.5L15,14.5L19,14.5L19,5.5L15,5.5M5,15L4,16L4,20L8,20L9,19L19,19L20,18L20,15L5,15M8,17A1,1 0 0,1 9,18A1,1 0 0,1 8,19A1,1 0 0,1 7,18A1,1 0 0,1 8,17Z" />
      </svg>
      <span>No model to display</span>
    </div>
    
    <div v-else class="preview-stage" :style="{ background: model.background || 'transparent' }">
      <!-- Add v-if to prevent rendering with zero dimensions -->
      <template v-if="stageSize.width > 0 && stageSize.height > 0">
        <v-stage
          :config="{
            width: stageSize.width || 1, 
            height: stageSize.height || 1,
            scaleX: scale,
            scaleY: scale,
            x: (stageSize.width - model.width * scale) / 2,
            y: (stageSize.height - model.height * scale) / 2
          }"
        >
          <v-layer>
            <!-- Render all shapes from the model -->
            <template v-for="shape in model?.shapes || []" :key="shape.id">
              <!-- Rectangle -->
              <v-rect
                v-if="shape.type === 'rect'"
                :config="{
                  x: shape.x,
                  y: shape.y,
                  width: shape.width,
                  height: shape.height,
                  fill: getShapeStyle(shape).fill,
                  stroke: getShapeStyle(shape).stroke,
                  strokeWidth: getShapeStyle(shape).strokeWidth,
                  id: shape.id
                }"
              />
              
              <!-- Circle -->
              <v-circle
                v-else-if="shape.type === 'circle'"
                :config="{
                  x: shape.x,
                  y: shape.y,
                  radius: shape.width ? shape.width / 2 : 25,
                  fill: getShapeStyle(shape).fill,
                  stroke: getShapeStyle(shape).stroke,
                  strokeWidth: getShapeStyle(shape).strokeWidth,
                  id: shape.id
                }"
              />
              
              <!-- Line -->
              <v-line
                v-else-if="shape.type === 'line'"
                :config="{
                  points: shape.points,
                  stroke: getShapeStyle(shape).stroke,
                  strokeWidth: getShapeStyle(shape).strokeWidth,
                  lineCap: 'round',
                  lineJoin: 'round',
                  id: shape.id
                }"
              />
              
              <!-- Arrow -->
              <v-arrow
                v-else-if="shape.type === 'arrow'"
                :config="{
                  points: shape.points,
                  pointerLength: 10,
                  pointerWidth: 10,
                  fill: getShapeStyle(shape).stroke,
                  stroke: getShapeStyle(shape).stroke,
                  strokeWidth: getShapeStyle(shape).strokeWidth,
                  id: shape.id
                }"
              />
              
              <!-- Text -->
              <v-text
                v-else-if="shape.type === 'text'"
                :config="{
                  x: shape.x,
                  y: shape.y,
                  text: getShapeStyle(shape).text || 'Text',
                  fontSize: getShapeStyle(shape).fontSize || 18,
                  fontFamily: getShapeStyle(shape).fontFamily || 'Arial',
                  fill: getShapeStyle(shape).fill || '#ffffff',
                  padding: 5,
                  id: shape.id
                }"
              />
              
              <!-- Nested Model -->
              <template v-if="shape.type === 'nestedModel' && (shape as any).nestedModel">
                <!-- Render nested model shapes with parent transformation -->
                <template v-for="nestedShape in (shape as any).nestedModel.shapes" :key="`${shape.id}_${nestedShape.id}`">
                  <!-- Rectangle in nested model -->
                  <v-rect
                    v-if="nestedShape.type === 'rect'"
                    :config="{
                      x: nestedShape.x * ((shape.width || 100) / ((shape as any).nestedModel.width || 100)) + shape.x,
                      y: nestedShape.y * ((shape.height || 100) / ((shape as any).nestedModel.height || 100)) + shape.y,
                      width: (nestedShape.width || 10) * ((shape.width || 100) / ((shape as any).nestedModel.width || 100)),
                      height: (nestedShape.height || 10) * ((shape.height || 100) / ((shape as any).nestedModel.height || 100)),
                      fill: getShapeStyle(nestedShape).fill,
                      stroke: getShapeStyle(nestedShape).stroke,
                      strokeWidth: getShapeStyle(nestedShape).strokeWidth,
                      id: `${shape.id}_${nestedShape.id}`
                    }"
                  />
                  
                  <!-- Circle in nested model -->
                  <v-circle
                    v-else-if="nestedShape.type === 'circle'"
                    :config="{
                      x: nestedShape.x * ((shape.width || 100) / ((shape as any).nestedModel.width || 100)) + shape.x,
                      y: nestedShape.y * ((shape.height || 100) / ((shape as any).nestedModel.height || 100)) + shape.y,
                      radius: (nestedShape.width || 10) * ((shape.width || 100) / ((shape as any).nestedModel.width || 100)) / 2,
                      fill: getShapeStyle(nestedShape).fill,
                      stroke: getShapeStyle(nestedShape).stroke,
                      strokeWidth: getShapeStyle(nestedShape).strokeWidth,
                      id: `${shape.id}_${nestedShape.id}`
                    }"
                  />
                  
                  <!-- Text in nested model -->
                  <v-text
                    v-else-if="nestedShape.type === 'text'"
                    :config="{
                      x: nestedShape.x * ((shape.width || 100) / ((shape as any).nestedModel.width || 100)) + shape.x,
                      y: nestedShape.y * ((shape.height || 100) / ((shape as any).nestedModel.height || 100)) + shape.y,
                      text: getShapeStyle(nestedShape).text || 'Text',
                      fontSize: ((nestedShape.fontSize || 18) * ((shape.width || 100) / ((shape as any).nestedModel.width || 100))) || 12,
                      fontFamily: nestedShape.fontFamily || 'Arial',
                      fill: getShapeStyle(nestedShape).fill || '#ffffff',
                      id: `${shape.id}_${nestedShape.id}`
                    }"
                  />
                </template>
              </template>
            </template>
          </v-layer>
        </v-stage>
      </template>
      <div v-else class="initializing-stage">
        <span>Initializing preview...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  width: 100%;
  height: 100%;
  background: var(--qui-bg-secondary);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container.standalone {
  background: var(--qui-bg-primary);
  border: none;
}

.preview-loading,
.preview-error,
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--qui-text-secondary);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #F44336;
}

.retry-button {
  background: rgba(255, 255, 255, 0.1);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s var(--qui-animation-bounce);
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.preview-stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-empty {
  color: #666;
}

.preview-empty svg {
  margin-bottom: 12px;
}

.initializing-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--qui-text-secondary);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.animated-binding {
  animation: pulse 2s infinite;
}
</style>
