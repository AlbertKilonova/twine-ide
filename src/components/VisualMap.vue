<template>
  <div class="visual-map-overlay">
    <div class="map-toolbar">
      <div class="map-title">
        <van-icon name="cluster-o" />
        <span class="title-text">故事云图</span>
        <div class="grid-control">
          <van-checkbox v-model="useGrid" size="14px">网格吸附</van-checkbox>
        </div>
      </div>
      <van-button size="mini" icon="cross" @click="$emit('close')" class="close-btn" />
    </div>

    <div class="canvas-wrapper" :class="{ 'show-grid': useGrid }" style="touch-action: none;">
      <VNetworkGraph
        v-model:layouts="layouts"
        :nodes="nodes"
        :edges="edges"
        :configs="configs"
        :event-handlers="eventHandlers"
      >
        <template #override-node="{ nodeId, config }">
          <rect
            :width="config.width"
            :height="config.height"
            :x="-config.width / 2"
            :y="-config.height / 2"
            :fill="nodeId === activeId ? '#007acc' : '#333333'"
            :stroke="nodes[nodeId].isStart ? '#e51400' : '#555555'"
            stroke-width="2"
            rx="4"
          />
          <text
            x="0"
            y="5"
            font-size="12"
            fill="#ffffff"
            text-anchor="middle"
            dominant-baseline="central"
            class="node-label"
          >
            {{ nodes[nodeId].name }}
          </text>
        </template>
      </VNetworkGraph>
    </div>

    <div class="map-footer">
      <span>{{ useGrid ? '网格对齐已开启' : '自由排列模式' }}</span>
      <span class="sep">|</span>
      <span>双击跳转编辑</span>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";

const props = defineProps(['passages', 'activeId']);
const emit = defineEmits(['close', 'jump', 'updatePosition']);

const layouts = reactive({ nodes: {} });
const useGrid = ref(localStorage.getItem('map_use_grid') === 'true');
const gridSize = 40;

watch(useGrid, (val) => localStorage.setItem('map_use_grid', val));

watch(() => props.passages, (newVal) => {
  if (!newVal || newVal.length === 0) return;
  newVal.forEach((p, index) => {
    if (p.visualPos && typeof p.visualPos.x === 'number') {
      layouts.nodes[p.id] = { x: p.visualPos.x, y: p.visualPos.y };
    } 
    else if (!layouts.nodes[p.id]) {
      const col = index % 4;
      const row = Math.floor(index / 4);
      layouts.nodes[p.id] = { x: 80 + col * 160, y: 80 + row * 90 };
    }
  });
}, { immediate: true, deep: true });

// 解析 Twine 链接
const parseLinks = (content) => {
  if (!content) return [];
  const targets = new Set();
  const regex = /\[\[(.*?)(?:\]\[.*?\]|\])/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let raw = match[1].trim();
    let target = '';
    if (raw.includes('->')) target = raw.split('->')[1];
    else if (raw.includes('<-')) target = raw.split('<-')[0];
    else if (raw.includes('|')) target = raw.split('|')[1];
    else target = raw;
    if (target) targets.add(target.trim());
  }
  return Array.from(targets);
};

const nodes = computed(() => {
  const n = {};
  props.passages.forEach(p => {
    n[p.id] = { 
      name: p.name.length > 10 ? p.name.substring(0, 8) + '..' : p.name, 
      isStart: p.isStart 
    };
  });
  return n;
});

const edges = computed(() => {
  const e = {};
  let edgeId = 1;
  props.passages.forEach(sourceP => {
    const linkTargets = parseLinks(sourceP.content);
    linkTargets.forEach(tName => {
      const targetP = props.passages.find(p => p.name === tName);
      if (targetP) e[`edge${edgeId++}`] = { source: sourceP.id, target: targetP.id };
    });
  });
  return e;
});

const configs = reactive({
  view: { 
    panEnabled: true, 
    zoomEnabled: true,
    fitToContents: false,
    minZoom: 0.1,
    maxZoom: 4
  },
  node: { 
    width: 120, 
    height: 45,
    draggable: true
  },
  edge: { 
    normal: { color: "#444444", width: 2 }, 
    marker: { target: { type: "arrow", width: 4, height: 4 } } 
  }
});

const eventHandlers = {
  // 1. 拖拽实时吸附
  "node:drag": (event) => {
    const ids = Object.keys(event);
    if (ids.length > 0) {
      const nodeId = ids[0];
      const { x, y } = event[nodeId];
      if (useGrid.value) {
        layouts.nodes[nodeId] = {
          x: Math.round(x / gridSize) * gridSize,
          y: Math.round(y / gridSize) * gridSize
        };
      }
    }
  },

  "node:dragend": (event) => {

    const ids = Object.keys(event);
    
    if (ids.length === 0) {
      return;
    }

    const nodeId = ids[0];
    const pos = event[nodeId]; // 直接从事件里拿最新的坐标

    // 从 props 里找对应的段落
    const passage = props.passages.find(p => String(p.id) === String(nodeId));
    if (passage && pos) {
      const updatedItem = {
        ...JSON.parse(JSON.stringify(passage)),
        visualPos: { x: pos.x, y: pos.y }
      };
      
      emit('updatePosition', updatedItem);
    } else {
    }
  },

  "node:dblclick": (event) => {
    // 双击可能也是类似的结构，阿波做了兼容
    const ids = Object.keys(event);
    const nodeId = ids.length > 0 ? ids[0] : null;
    if (nodeId) {
      emit('jump', nodeId);
    }
  }
};

</script>

<style scoped>
.visual-map-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #1e1e1e;
  z-index: 2000;
  display: flex; flex-direction: column;
}
.map-toolbar {
  height: 40px; min-height: 40px; background: #2d2d2d;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 10px; border-bottom: 1px solid #333;
  overflow: hidden; white-space: nowrap;
}
.map-title { font-size: 13px; color: #ccc; display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1; min-width: 0; }
.grid-control { display: flex; align-items: center; border-left: 1px solid #444; padding-left: 12px; }
.canvas-wrapper { flex: 1; background-color: #181818; position: relative; overflow: hidden; }
.canvas-wrapper.show-grid {
  background-image: radial-gradient(#2a2a2a 1px, transparent 1px);
  background-size: 40px 40px;
}
.map-footer {
  height: 30px; min-height: 30px; background: #252526; border-top: 1px solid #333;
  color: #888; font-size: 11px;
  display: flex; align-items: center; justify-content: center; gap: 15px;
  overflow: hidden; white-space: nowrap;
}
.close-btn { background: transparent !important; border: none !important; color: #888 !important; }
.node-label { pointer-events: none; user-select: none; }
.sep { color: #333; }
</style>
