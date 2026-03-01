<template>
  <div class="side-panel-inner project-settings">
    <div class="panel-header">项目配置</div>
    
    <div class="panel-content scrollable" v-if="story">
      <div class="section-title">概览</div>
      <div class="info-card">
        <div class="info-row">
          <span>当前段落数量</span>
          <span class="value">{{ count }}</span>
        </div>
      </div>

      <div class="divider-line"></div>

      <div class="section-title">基础信息</div>
      <div class="setting-item">
        <label>故事标题 (StoryTitle)</label>
        <input v-model="story.name" @input="$emit('saveOnly')" class="vscode-input highlight" placeholder="输入故事名字喵..." />
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

      <div class="divider-line"></div>

      <div class="section-title">编辑器偏好</div>
      <div class="pref-card">
        <div class="pref-row">
          <div class="pref-info">
            <span class="pref-label">自动换行</span>
          </div>
          <van-switch 
            :model-value="story.settings?.lineWrapping || false" 
            @update:model-value="val => updateSetting('lineWrapping', val)" 
            size="20px"
            active-color="#0e639c"
            inactive-color="#3c3c3c"
          />
        </div>
        <br/>
        <div class="pref-row">
          <div class="pref-info">
            <span class="pref-label">相对行号</span>
          </div>
          <van-switch 
            :model-value="story.settings?.relativeLineNumbers || false" 
            @update:model-value="val => updateSetting('relativeLineNumbers', val)" 
            size="20px"
            active-color="#0e639c"
            inactive-color="#3c3c3c"
          />
        </div>
      </div>

      <div class="divider-line"></div>

      <div class="section-title">高级</div>
      <div class="setting-item">
        <label>故事 IFID (唯一标识)</label>
        <div class="input-with-btn">
          <input :value="story.ifid" readonly class="vscode-input readonly" />
          <button @click.stop="regenIFID" class="icon-btn-highlight" title="重新生成">
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
// 只保留 saveOnly，这样就不会触发父组件的重命名弹窗啦喵！
const emit = defineEmits(['saveOnly']);

const selectedFormatKey = ref('');

const displayFormats = computed(() => {
  return props.formatMgr?.availableFormats.value || [];
});

onMounted(async () => {
  if (props.formatMgr) {
    await props.formatMgr.scanFormats();
    if (props.story) {
      selectedFormatKey.value = `${props.story.format.toLowerCase()}-${props.story.formatVersion}`;
    }
  }
});

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
  const file = e.target.files;
  if (file && props.formatMgr) {
    await props.formatMgr.uploadFormat(file);
    e.target.value = ''; 
  }
};

const regenIFID = () => {
  props.story.ifid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));
  emit('saveOnly');
};

const updateSetting = (key, value) => {
  if (!props.story.settings) props.story.settings = {};
  props.story.settings[key] = value;
  // 直接静默保存，不触发 update 事件喵！
  emit('saveOnly');
};
</script>

<style scoped>
.project-settings { height: 100%; background: #252526; color: #cccccc; display: flex; flex-direction: column; }
.panel-header { padding: 10px 15px; font-size: 11px; text-transform: uppercase; color: #858585; border-bottom: 1px solid rgba(255,255,255,0.05); }
.panel-content { flex: 1; overflow-y: auto; padding: 20px 15px; display: flex; flex-direction: column; gap: 20px; }

/* 滚动条美化 */
.scrollable::-webkit-scrollbar { width: 4px; }
.scrollable::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

/* 分组标题 */
.section-title { font-size: 11px; font-weight: bold; color: #569cd6; margin-bottom: -10px; }
.divider-line { height: 1px; background: rgba(255,255,255,0.05); margin: 5px 0; }

/* 卡片样式 */
.info-card, .pref-card { background: #2d2d2d; padding: 12px; border-radius: 4px; border: 1px solid #3c3c3c; }

.info-row { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; }
.info-row .value { color: #4ec9b0; font-family: 'Consolas', monospace; }

/* 编辑器偏好行 */
.pref-row { display: flex; align-items: center; justify-content: space-between; }
.pref-info { display: flex; flex-direction: column; gap: 2px; }
.pref-label { font-size: 13px; color: #ccc; }
.pref-desc { font-size: 10px; color: #666; }

/* 输入框样式 */
.setting-item label { display: block; font-size: 11px; color: #858585; margin-bottom: 8px; }
.vscode-input, .vscode-select { 
  width: 100%; box-sizing: border-box; background: #3c3c3c; color: #ccc; 
  border: 1px solid #3c3c3c; padding: 7px 10px; font-size: 13px; outline: none; transition: border 0.2s;
}
.vscode-input:focus, .vscode-select:focus { border-color: #007acc; }
.input-with-btn { display: flex; gap: 4px; }

.icon-btn-highlight { 
  background: #3c3c3c; color: #ccc; border: 1px solid #3c3c3c; 
  padding: 0 12px; cursor: pointer; transition: all 0.2s;
}
.icon-btn-highlight:hover { background: #454545; color: #fff; border-color: #555; }
.readonly { background: #252526; color: #666; border-color: transparent; cursor: not-allowed; }
</style>
