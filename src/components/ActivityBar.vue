<template>
  <div class="activity-bar">
    <div class="top-items">
      <div :class="['nav-item', { active: activeMode === 'stories' }]" @click="$emit('switch', 'stories')">
        <van-icon name="apps-o" /><div class="active-indicator" v-show="activeMode === 'stories'"></div>
      </div>
      <div :class="['nav-item', { active: activeMode === 'files' }]" @click="$emit('switch', 'files')">
        <van-icon name="description" /><div class="active-indicator" v-show="activeMode === 'files'"></div>
      </div>
      <div :class="['nav-item', { active: activeMode === 'assets' }]" @click="$emit('switch', 'assets')">
        <van-icon name="photo-o" />
        <div class="active-indicator" v-show="activeMode === 'assets'"></div>
      </div>
      <div :class="['nav-item', { active: activeMode === 'visual' }]" @click="$emit('switch', 'visual')">
        <van-icon name="cluster-o" /><div class="active-indicator" v-show="activeMode === 'visual'"></div>
      </div>
      <div :class="['nav-item', { active: activeMode === 'export' }]" @click="$emit('switch', 'export')">
        <van-icon name="share-o" /><div class="active-indicator" v-show="activeMode === 'export'"></div>
      </div>
      <div :class="['nav-item', { active: activeMode === 'project' }]" @click="$emit('switch', 'project')">
        <van-icon name="setting-o" />
        <div class="active-indicator" v-show="activeMode === 'project'"></div>
      </div>
    </div>
    <div class="bottom-items">
      <div class="nav-item save-btn" @click="$emit('save')"><van-icon name="passed" /></div>
    </div>
  </div>
</template>

<script setup>
defineProps(['activeMode']);
defineEmits(['switch', 'save']);
</script>

<style scoped>
.activity-bar { width: 50px; background: #333; display: flex; flex-direction: column; justify-content: space-between; flex-shrink: 0; z-index: 1001; }
.nav-item { height: 50px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #858585; cursor: pointer; position: relative; }
.nav-item.active { color: #fff; }
.active-indicator { position: absolute; left: 0; top: 10px; bottom: 10px; width: 2px; background: #007acc; }
</style>
