<script setup lang="ts">
import { ref, onMounted } from 'vue';

const stageWidth = ref(window.innerWidth - 200); // Minus sidebar width
const stageHeight = ref(window.innerHeight - 50); // Minus toolbar height

const items = ref<any[]>([]);

// Handle window resize
const handleResize = () => {
  stageWidth.value = window.innerWidth - 200;
  stageHeight.value = window.innerHeight - 50;
};

// Handle drop of new components
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  const componentType = e.dataTransfer?.getData('componentType');
  
  if (componentType) {
    items.value.push({
      id: `item-${items.value.length}`,
      type: componentType,
      x: e.offsetX,
      y: e.offsetY,
      width: 100,
      height: 50,
      draggable: true
    });
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});
</script>

<template>
  <div class="canvas" 
       @dragover.prevent 
       @drop="handleDrop">
    <v-stage 
      :config="{ 
        width: stageWidth, 
        height: stageHeight 
      }">
      <v-layer>
        <!-- Grid background -->
        <v-rect 
          :config="{
            width: stageWidth,
            height: stageHeight,
            fill: 'white',
          }"
        />
        
        <!-- Render items -->
        <v-rect
          v-for="item in items"
          :key="item.id"
          :config="{
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            fill: 'white',
            stroke: '#333',
            strokeWidth: 1,
            draggable: true,
            shadowColor: 'black',
            shadowBlur: 2,
            shadowOffset: { x: 1, y: 1 },
            shadowOpacity: 0.2,
            cornerRadius: 4
          }"
        >
          <v-text
            :config="{
              x: item.x,
              y: item.y + item.height/2,
              text: item.type,
              width: item.width,
              align: 'center',
              fontSize: 14
            }"
          />
        </v-rect>
      </v-layer>
    </v-stage>
  </div>
</template>

<style scoped>
.canvas {
  grid-area: canvas;
  overflow: hidden;
}
</style>
