<template>
  <div class="side-panel-inner project-settings">
    <div class="panel-header">项目配置</div>
    
    <div v-if="!story" class="empty-state">
      <van-empty description="请先选择或创建一个故事喵~" />
    </div>
    
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
        <input v-model="story.name" @input="saveNow" class="vscode-input highlight" placeholder="输入故事名字喵..." />
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
import { useAppContext } from '@/core/AppContext';

const ctx = useAppContext();
const storyMgr = ctx.get('storyManager');
const formatMgr = ctx.get('formatManager');
const stories = ctx.get('stories');
const allPassages = ctx.get('allPassages');
const currentStoryId = ctx.get('currentStoryId');

const story = computed(() => stories.value?.find(s => s.id === currentStoryId?.value));
const count = computed(() => allPassages.value?.filter(p => p.storyId === currentStoryId?.value)?.length || 0);

const selectedFormatKey = ref('');
const formatInput = ref(null);

const displayFormats = computed(() => {
  return formatMgr?.availableFormats.value || [];
});

const saveNow = () => {
  if (story.value) storyMgr.handleUpdateItem(story.value);
};

onMounted(async () => {
  if (formatMgr) {
    await formatMgr.scanFormats();
    if (story.value) {
      selectedFormatKey.value = `${story.value.format.toLowerCase()}-${story.value.formatVersion}`;
    }
  }
});

watch(displayFormats, (newList) => {
  if (newList.length > 0 && story.value && !selectedFormatKey.value) {
    selectedFormatKey.value = `${story.value.format.toLowerCase()}-${story.value.formatVersion}`;
  }
}, { immediate: true });

const handleFormatChange = () => {
  const target = displayFormats.value.find(f => f.id === selectedFormatKey.value);
  if (target && story.value) {
    story.value.format = target.name;
    story.value.formatVersion = target.version;
    saveNow();
  }
};

const onFormatFileChange = async (e) => {
  const file = e.target.files[0];
  if (file && formatMgr) {
    await formatMgr.uploadFormat(file);
    e.target.value = ''; 
  }
};

const regenIFID = () => {
  if (!story.value) return;
  story.value.ifid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));
  saveNow();
};

const updateSetting = (key, value) => {
  if (!story.value) return;
  if (!story.value.settings) story.value.settings = {};
  story.value.settings[key] = value;
  saveNow();
};

</script>

<style scoped>
/* 保持波波原来的所有样式波！ */
.project-settings { height: 100%; background: #252526; color: #cccccc; display: flex; flex-direction: column; }
.panel-header { padding: 10px 15px; font-size: 11px; text-transform: uppercase; color: #858585; border-bottom: 1px solid rgba(255,255,255,0.05); }
.empty-state { 
  flex: 1; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 40px 20px;
}
.panel-content { flex: 1; overflow-y: auto; padding: 20px 15px; display: flex; flex-direction: column; gap: 20px; }
.scrollable::-webkit-scrollbar { width: 4px; }
.scrollable::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
.section-title { font-size: 11px; font-weight: bold; color: #569cd6; margin-bottom: -10px; }
.divider-line { height: 1px; background: rgba(255,255,255,0.05); margin: 5px 0; }
.divider-line.mini { margin: 15px 0; background: rgba(255,255,255,0.03); }
.info-card, .pref-card { background: #2d2d2d; padding: 12px; border-radius: 4px; border: 1px solid #3c3c3c; }
.info-row { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; }
.info-row .value { color: #4ec9b0; font-family: 'Consolas', monospace; }
.pref-row { display: flex; align-items: center; justify-content: space-between; }
.pref-info { display: flex; flex-direction: column; gap: 2px; }
.pref-label { font-size: 13px; color: #ccc; }
.setting-item label { display: block; font-size: 11px; color: #858585; margin-bottom: 8px; }
.vscode-input, .vscode-select { 
  width: 100%; box-sizing: border-box; background: #3c3c3c; color: #ccc; 
  border: 1px solid #3c3c3c; padding: 7px 10px; font-size: 13px; outline: none; transition: border 0.2s;
}
.vscode-input:focus, .vscode-select:focus { border-color: #007acc; }
.input-with-btn { display: flex; gap: 4px; }
.icon-btn-highlight { background: #3c3c3c; color: #ccc; border: 1px solid #3c3c3c; padding: 0 12px; cursor: pointer; transition: all 0.2s; }
.readonly { background: #252526; color: #666; border-color: transparent; cursor: not-allowed; }

/* 脚本管理面板统一蓝色风格喵 */
:deep(.van-collapse-item__title) { 
  background: transparent !important; 
  color: #858585 !important; 
  padding: 10px 0 !important; 
  font-size: 11px !important;
  text-transform: uppercase;
}

:deep(.van-collapse-item__title--expanded) {
  color: #569cd6 !important; /* 展开时变蓝色波 */
}

:deep(.van-collapse-item__content) { 
  background: transparent !important; 
  padding: 0 !important; 
}

.collapse-title { display: flex; align-items: center; gap: 8px; }
.collapse-title span { font-weight: bold; }

.script-section-box { 
  padding: 12px; 
  background: #2d2d2d; 
  border-radius: 4px; 
  border: 1px solid #3c3c3c;
  margin-bottom: 15px;
}

.sub-label { 
  font-size: 11px; 
  color: #569cd6; /* 统一成蓝色波 */
  font-weight: bold; 
  margin-bottom: 6px; 
}

.desc-text { 
  font-size: 10px; 
  color: #666; 
  margin-bottom: 10px; 
  line-height: 1.4; 
}

.list-item-row { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  margin-bottom: 8px; 
}

.mini-input { 
  padding: 5px 10px !important; 
  font-size: 12px !important; 
  background: #3c3c3c !important;
  border: 1px solid #3c3c3c !important;
}

.mini-input:focus {
  border-color: #007acc !important;
}

.delete-icon { 
  color: #f44336; 
  font-size: 14px; 
  cursor: pointer; 
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-icon:hover { opacity: 1; }

.add-btn-dark { 
  background: #3a3d41 !important; 
  border: none !important; 
  color: #ccc !important; 
  margin-top: 5px; 
  font-size: 11px !important;
  height: 24px !important;
}

.add-btn-dark:hover {
  background: #454545 !important;
  color: #fff !important;
}

.script-card-box { 
  background: #3c3c3c; 
  border-radius: 4px; 
  padding: 10px; 
  margin-bottom: 10px; 
  border-left: 3px solid #007acc; /* 标志性的蓝色侧边波 */
}

.card-top { 
  display: flex; 
  justify-content: space-between; 
  margin-bottom: 8px; 
  align-items: center;
}

.card-name-input { 
  background: transparent; 
  border: none; 
  border-bottom: 1px solid #555; 
  color: #4ec9b0; /* 变量名青色 */
  font-size: 11px; 
  outline: none; 
  width: 70%; 
  padding: 2px 0;
}

.card-name-input:focus {
  border-bottom-color: #007acc;
}

.code-font :deep(textarea) { 
  font-family: 'Consolas', 'Monaco', monospace !important; 
  font-size: 12px !important; 
  color: #d4d4d4 !important; 
  background: #1e1e1e !important; 
  padding: 8px !important;
  border-radius: 2px;
}
.blue-text { color: #569cd6 !important; margin-bottom: 0 !important; }

/* 让折叠块的头部看起来更紧凑波 */
:deep(.script-card-box .van-collapse-item__title) {
  padding: 5px 0 !important;
  border: none !important;
}

:deep(.script-card-box .van-cell__right-icon) {
  font-size: 12px;
  color: #569cd6;
}

.card-top {
  display: flex;
  flex: 1;
  justify-content: space-between;
  align-items: center;
  padding-right: 10px;
}

/* 彻底消灭 Vant 的默认边框和背景干扰喵 */
:deep(.van-cell), 
:deep(.van-collapse-item__content),
:deep(.van-hairline--top-bottom)::after,
:deep(.van-hairline--bottom)::after,
:deep(.van-cell)::after {
  border: none !important;
  background: transparent !important;
  background-color: transparent !important;
}

/* 修复折叠动画：确保高度计算正确，不要溢出波 */
:deep(.van-collapse-item__wrapper) {
  transition: height 0.3s ease-in-out !important;
  will-change: height;
}

/* 保持卡片感但不要线条波 */
.script-card-box { 
  background: #333; /* 稍微深一点点，和背景区分开波 */
  border-radius: 4px; 
  padding: 0 8px 8px 8px; /* 调整内边距让它更好看喵 */
  margin-bottom: 12px; 
  border-left: 3px solid #007acc; 
  overflow: hidden; /* 必须加这个，动画才顺滑波 */
}

/* 移除折叠标题栏自带的底线波 */
:deep(.van-cell__title) {
  border: none !important;
}

/* 包安装输入区域喵 */
.pkg-install-area {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.pkg-input {
  flex: 1;
  background: #1e1e1e !important;
  border: 1px solid #3c3c3c !important;
  border-radius: 4px;
  padding: 8px 10px;
  color: #d4d4d4;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.pkg-input:focus {
  outline: none;
  border-color: #007acc !important;
}

.install-btn {
  background: #0e639c;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.install-btn:hover {
  background: #1177bb;
}

.install-btn:active {
  background: #0d5a8f;
}

/* CDN 卡片美化喵 */
.cdn-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }

/* CDN 卡片容器强制不换行波 */
.cdn-card {
  background: #333;
  border-radius: 4px;
  padding: 8px;
  border: 1px solid #3c3c3c;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden; /* 防止溢出喵 */
}

.cdn-info {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 左右撑开波 */
  width: 100%;
  gap: 8px;
}

.cdn-meta {
  flex: 1; 
  display: flex; 
  align-items: baseline; 
  gap: 6px;
  min-width: 0; /* 这里的 min-width 是防止子元素撑开的关键喵！ */
}

.lib-name { 
  font-size: 11px; 
  font-weight: bold; 
  color: #4ec9b0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* 名字太长就打省略号波 */
}

.lib-ver { 
  font-size: 9px; 
  color: #666; 
  flex-shrink: 0; /* 版本号不许缩水波 */
}

.cdn-input-field {
  width: 100% !important;
  box-sizing: border-box !important; /* 算上边距波 */
  background: #1e1e1e !important;
  border: 1px solid #252526 !important;
  color: #888;
  font-size: 10px !important;
  padding: 4px 8px !important;
  outline: none;
}

.delete-icon-mini { 
  flex-shrink: 0; /* 重点！不许被顶飞波 */
  font-size: 14px; 
  color: #666; 
  cursor: pointer;
  padding: 2px;
}

.cdn-card:hover { border-color: #007acc; }

.drag-handle { color: #555; font-size: 12px; cursor: move; }

.cdn-input-field {
  width: 100%;
  background: #1e1e1e !important;
  border: 1px solid #252526 !important;
  color: #888;
  font-size: 10px !important;
  padding: 4px 8px !important;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}

.delete-icon-mini:hover { color: #f44336; }

.add-btn-outline {
  background: transparent !important;
  border: 1px dashed #444 !important;
  color: #888 !important;
  font-size: 11px !important;
}
.add-btn-outline:hover { border-color: #007acc !important; color: #007acc !important; }
</style>