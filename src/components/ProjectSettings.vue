<template>
  <div class="side-panel-inner project-settings">
    <div class="panel-header">项目配置</div>
    
    <div class="panel-content" v-if="story">
      <div class="info-card">
        <div class="info-row">
          <span class="label">当前段落数量</span>
          <span class="value">{{ count }}</span>
        </div>
      </div>

      <div class="setting-item">
        <label>故事标题 (StoryTitle)</label>
        <input v-model="story.name" @input="$emit('saveOnly')" class="vscode-input highlight" />
      </div>

      <div class="setting-item">
        <label>故事格式 (StoryFormat)</label>
        <div class="input-with-btn">
          <select v-model="selectedFormatKey" @change="handleFormatChange" class="vscode-select">
            <option v-if="displayFormats.length === 0" disabled value="">正在寻找衣柜中的衣服...</option>
            <option v-for="fmt in displayFormats" :key="fmt.id" :value="fmt.id">
              {{ fmt.name }} ({{ fmt.version }}) {{ fmt.isCustom ? '★' : '' }}
            </option>
          </select>
          
          <input type="file" ref="formatInput" style="display: none" accept=".js" @change="onFormatFileChange" />
          <button @click="$refs.formatInput.click()" class="icon-btn-highlight" title="上传自定义格式">
            <van-icon name="plus" />
          </button>
        </div>
      </div>

      <div class="setting-item">
        <label>故事 IFID (唯一标识)</label>
        <div class="input-with-btn">
          <input :value="story.ifid" readonly class="vscode-input readonly" />
          <button @click.stop="regenIFID" class="icon-btn-highlight">
            <van-icon name="refresh" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';

const props = defineProps(['story', 'count', 'formatMgr']);
const emit = defineEmits(['saveOnly']);

const selectedFormatKey = ref('');

// --- 关键修改：改个名字叫 displayFormats，避免跟 props 或者 manager 里的 ref 冲突喵 ---
const displayFormats = computed(() => {
  return props.formatMgr?.availableFormats.value || [];
});

onMounted(async () => {
  console.log("阿波开始帮波波整理设置页面啦喵！");
  if (props.formatMgr) {
    // 强制触发一次扫描，确保列表加载
    await props.formatMgr.scanFormats();
    
    // 初始化选中项
    if (props.story) {
      selectedFormatKey.value = `${props.story.format.toLowerCase()}-${props.story.formatVersion}`;
    }
  }
});

// 当列表更新时，确保选中项是正确的波
watch(displayFormats, (newList) => {
  if (newList.length > 0 && props.story && !selectedFormatKey.value) {
    selectedFormatKey.value = `${props.story.format.toLowerCase()}-${props.story.formatVersion}`;
  }
}, { immediate: true });

const handleFormatChange = () => {
  const target = displayFormats.value.find(f => f.id === selectedFormatKey.value);
  if (target) {
    props.story.format = target.name;
    props.story.formatVersion = target.version;
    emit('saveOnly');
  }
};

const onFormatFileChange = async (e) => {
  const file = e.target.files[0];
  if (file && props.formatMgr) {
    await props.formatMgr.uploadFormat(file);
    e.target.value = ''; 
  }
};

const regenIFID = () => {
  props.story.ifid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));
  emit('saveOnly');
};
</script>

<style scoped>
.project-settings { height: 100%; background: #252526; color: #ccc; }
.panel-header { padding: 12px 20px; font-size: 11px; font-weight: bold; color: #aaa; border-bottom: 1px solid #333; }
.panel-content { padding: 15px; display: flex; flex-direction: column; gap: 18px; }
.info-card { background: #333333; padding: 12px; border: 1px solid #444; border-radius: 4px; }
.info-row { display: flex; justify-content: space-between; font-size: 12px; }
.info-row .value { color: #4ec9b0; font-weight: bold; }
.setting-item label { display: block; font-size: 11px; color: #569cd6; margin-bottom: 6px; }
.vscode-input, .vscode-select { width: 100%; box-sizing: border-box; background: #3c3c3c; color: #ffffff; border: 1px solid #555; padding: 6px 10px; font-size: 13px; outline: none; border-radius: 2px; }
.input-with-btn { display: flex; gap: 4px; }
.icon-btn-highlight { background: #0e639c; color: white; border: none; padding: 0 10px; cursor: pointer; border-radius: 2px; display: flex; align-items: center; }
.icon-btn-highlight:hover { background: #1177bb; }
.readonly { background: #2d2d2d; color: #888; }
</style>
