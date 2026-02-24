<template>
  <div class="tools">
    <button v-for="t in ['[[', '->', ']]', ':: ', '<<', '>>']" 
            :key="t" class="t-btn" @click="$emit('insert', t)">
      {{ t }}
    </button>
  </div>
</template>

<script setup>defineEmits(['insert']);</script>

<style scoped>
.tools { display: flex; gap: 4px; padding: 8px; background: #2d2d2d; overflow-x: auto; border-bottom: 1px solid #333; }
.t-btn { background: #3c3c3c; color: #ccc; border: 1px solid #444; padding: 4px 10px; border-radius: 3px; font-family: monospace; }
</style>
