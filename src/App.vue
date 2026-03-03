<template>
  <div class="vscode-layout">
    <ActivityBar :activeMode="viewMode" :isOpen="isSidebarOpen" @switch="switchMode" @save="saveNow" />

    <transition name="side-slide">
      <aside class="side-nav-box" v-show="isSidebarOpen && viewMode !== 'visual'">
        <SideBarList
          v-if="viewMode === 'files'"
          @importStory="handleImportFile"
        />
        <ExportPanel v-if="viewMode === 'export'" @preview="preview" @test="test" />
        <ProjectSettings 
          :key="currentStory?.id"
          v-if="viewMode === 'project'" 
        />
        <AssetManager v-if="viewMode === 'assets'" />
        <PackageManager v-if="viewMode === 'packages'" />
      </aside>
    </transition>

    <main class="editor-main">
      <header class="breadcrumb">
        <div v-if="!isSidebarOpen" class="menu-toggle" @click="isSidebarOpen = true"><van-icon name="bars" /></div>
        <div class="path-text">{{ currentStoryName }} <span v-if="activeFile?.folder"> / {{ activeFile.folder }}</span> / {{ activeFile?.name || '...' }}
          <van-tag v-if="activeFile?.isStart" type="primary" size="mini" style="margin-left:8px">START</van-tag>
        </div>
      </header>

      <div class="tag-manager" v-if="activeFile">
        <van-icon name="label-o" class="tag-icon" />
        <div class="tag-list">
          <van-tag v-for="tag in currentPassageTags" :key="tag" closeable @close="removeTag(tag)" color="#3e3e3e" text-color="#aaa">{{ tag }}</van-tag>
          <input class="tag-input" placeholder="+ 添加标签" @keyup.enter="onAddTag" />
        </div>
      </div>

      <EditorTools :format="currentStory?.format" @insert="onInsert" />

      <EditorView 
        v-if="activeFile"
        ref="editorViewRef"
        v-model="activeFile.content"
        :activeFile="activeFile"
        :stories="stories"
        :lineWrapping="currentStory?.settings?.lineWrapping"
        :relativeLineNumbers="currentStory?.settings?.relativeLineNumbers"
        @update:modelValue="val => activeFile.content = val"
        @input="onEditorInput"
      />
      <van-empty v-else description="选择一个段落开始编辑" />
      
      <transition name="van-fade">
        <VisualMap v-if="viewMode === 'visual'" :passages="currentStoryFiles" :activeId="currentFileId" @close="viewMode = 'files'" @jump="handleJump" @updatePosition="storyMgr.handleUpdateItem" />
      </transition>
      <div v-if="isPreviewOpen" class="apk-preview-overlay">
        <div class="preview-header">
          <button @click="isPreviewOpen = false">返回编辑器</button>
          <span>预览模式</span>
        </div>
        <iframe :src="previewUrl" class="preview-iframe" allow="autoplay; fullscreen; focus-without-user-activation"></iframe>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { showToast } from 'vant';

// 组件与锦囊
import ActivityBar from './components/ActivityBar.vue';
import SideBarList from './components/sidebar/SideBarList.vue';
import ExportPanel from './components/sidebar/ExportPanel.vue';
import EditorTools from './components/editor/EditorTools.vue';
import EditorView from './components/editor/EditorView.vue';
import VisualMap from './components/VisualMap.vue';
import ProjectSettings from './components/sidebar/ProjectSettings.vue';
import AssetManager from './components/sidebar/AssetManager.vue';
import PackageManager from './components/sidebar/PackageManager.vue';

import { initDB } from './db/index';
import { useEditorBridge } from './composables/useEditorBridge';
import { unescapeHeader as unescapeTwee, escapeHeader as escapeTwee } from './utils/tweeUtils';
import { ServiceContainer } from './core/ServiceContainer';
import { createAppContext, provideAppContext } from './core/AppContext';
import StoryPlugin from './plugins/StoryPlugin';
import AssetPlugin from './plugins/AssetPlugin';
import PackagePlugin from './plugins/PackagePlugin';
import FileActionsPlugin from './plugins/FileActionsPlugin';
import FormatPlugin from './plugins/FormatPlugin';

// 状态
const viewMode = ref('files');
const isSidebarOpen = ref(true);
const editorViewRef = ref(null);
const previewUrl = ref('');
const isPreviewOpen = ref(false);
const db = ref(null);

// dbIntf 封装（db.value 初始为 null，onMounted 后赋值）
const dbIntf = {
  getAll: (s) => db.value?.getAll(s),
  put: (s, i) => {
    if (!db.value) { showToast('数据库还没准备好哦 awa'); return; }
    return db.value.put(s, i);
  },
  delete: (s, id) => {
    if (!db.value) return;
    return db.value.delete(s, id);
  },
  transaction: (storeNames, mode) => {
    if (!db.value) return;
    return db.value.transaction(storeNames, mode);
  }
};

// Service container
const container = new ServiceContainer();
const context = createAppContext(container);
provideAppContext(context);

// 注册核心服务（同步，dbIntf 已处理 db.value 为 null 的情况）
container.register('db', () => dbIntf);
[StoryPlugin, AssetPlugin, PackagePlugin, FormatPlugin, FileActionsPlugin]
  .forEach(plugin => container.installPlugin(plugin));

// 获取服务实例（同步）
const storyMgr = context.get('storyManager');
const assetService = context.get('assetService');
const packageService = context.get('packageManager');
const fileActions = context.get('fileActions');
const formatMgr = context.get('formatManager');

// 获取 reactive refs（同步，保证 computed 能追踪依赖）
const stories = context.get('stories');
const allPassages = context.get('allPassages');
const currentStoryId = context.get('currentStoryId');
const currentFileId = context.get('currentFileId');

watch(() => currentStoryId?.value, async (newId) => {
  if (newId) {
    localStorage.setItem('twine_lastStoryId', newId);
    await assetService.loadAssets(newId);
    await packageService.loadPackages(newId);
  }
}, { immediate: false });

watch(() => currentFileId?.value, (newId) => {
  if (newId) localStorage.setItem('twine_lastFileId', newId);
});
const activeFile = computed(() => allPassages?.value?.find(p => p.id === currentFileId?.value));

// editorBridge（同步初始化，activeFile 和 storyMgr 已可用）
const { syncData, currentPassageTags, addTag, removeTag } = useEditorBridge(activeFile, storyMgr.handleUpdateItem, unescapeTwee, escapeTwee);

onMounted(async () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    const hasWarned = localStorage.getItem('ios_warned');
    if (!hasWarned) {
      alert('提示：本编辑器使用 indexedDB 存储，由于 iOS 随时可能清理存储，请务必频繁导出备份！(。•ˇˍˇ•。) ');
      localStorage.setItem('ios_warned', 'true');
    }
  }

  const instance = await initDB();
  db.value = instance;

  // 扫描可用故事格式
  await formatMgr.scanFormats();

  // 加载数据
  const storyRepo = context.get('storyRepo');
  const passageRepo = context.get('passageRepo');
  stories.value = await storyRepo.getAll();
  allPassages.value = await passageRepo.getAll();

  const savedStoryId = localStorage.getItem('twine_lastStoryId');
  const savedFileId = localStorage.getItem('twine_lastFileId');
  if (savedStoryId && stories.value.some(s => s.id === savedStoryId)) {
    currentStoryId.value = savedStoryId;
    if (savedFileId && allPassages.value.some(p => p.id === savedFileId && p.storyId === savedStoryId)) {
      currentFileId.value = savedFileId;
    }
  } else if (stories.value.length > 0) {
    currentStoryId.value = stories.value[0].id;
  }
});

// 计算属性
const currentStory = computed(() => stories?.value?.find(s => s.id === currentStoryId?.value));
const currentStoryName = computed(() => currentStory.value?.name || '未选择');
const currentStoryFiles = computed(() => allPassages?.value?.filter(p => p.storyId === currentStoryId?.value) || []);

// App 级别的动作（涉及 App 状态：viewMode / preview overlay）
const handleImportFile = () => fileActions?.handleImportFile((id) => {
  if (currentStoryId) currentStoryId.value = id;
  viewMode.value = 'files';
});

// --- 传送逻辑 ---
const handleJump = (id) => {
  if (!id) return;
  
  // 1. 设置当前的片段 ID
  currentFileId.value = id;
  
  // 2. 切换回文件列表模式
  viewMode.value = 'files';
  
  // 3. 自动展开侧边栏（免得波波看不见列表）
  isSidebarOpen.value = true;
};

// UI 映射
const onEditorInput = () => syncData();
const onAddTag = (e) => { addTag(e.target.value); e.target.value = ''; };
const onInsert = (str) => editorViewRef.value?.insertText(str);
const switchMode = (mode) => {
  if (mode === 'visual') { viewMode.value = viewMode.value === 'visual' ? 'files' : 'visual'; isSidebarOpen.value = viewMode.value !== 'visual'; }
  else { if (viewMode.value === mode) isSidebarOpen.value = !isSidebarOpen.value; else { viewMode.value = mode; isSidebarOpen.value = true; } }
};
const saveNow = async () => {
  if (activeFile.value) storyMgr.handleUpdateItem(activeFile.value);
  if (currentStory.value) storyMgr.handleUpdateItem(currentStory.value);
};

const preview = async () => {
  if (!fileActions) return;
  const url = await fileActions.handlePreview(
    currentStory.value,
    currentStoryFiles.value,
    formatMgr
  );

  if (url) {
    previewUrl.value = url;
    isPreviewOpen.value = true;
  }
};

const closePreview = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value); // 释放内存喵！
  }
  isPreviewOpen.value = false;
  previewUrl.value = '';
};

const test = async () => {
  if (!fileActions) return;
  const url = await fileActions.handlePreview(currentStory.value, currentStoryFiles.value, formatMgr, true);
  if (url) {
    previewUrl.value = url;
    isPreviewOpen.value = true;
  }
};


</script>

<style scoped>
/* 基础布局 */
.vscode-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #1e1e1e;
  overflow: hidden;
  color: #cccccc;
}

/* 侧边栏盒子 */
.side-nav-box {
  width: 260px;
  min-width: 260px;
  background: #252526;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}

/* 主编辑区 */
.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #1e1e1e;
}

/* 面包屑导航 */
.breadcrumb {
  height: 35px;
  background: #252526;
  display: flex;
  align-items: center;
  padding: 0 15px;
  font-size: 12px;
  color: #888;
  border-bottom: 1px solid #333;
}

.menu-toggle {
  margin-right: 10px;
  font-size: 18px;
  cursor: pointer;
  color: #ccc;
}

.path-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 标签管理器 */
.tag-manager {
  display: flex;
  align-items: center;
  padding: 8px 15px;
  background: #2d2d2d;
  gap: 10px;
}

.tag-icon {
  font-size: 14px;
  color: #666;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.tag-input {
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 12px;
  outline: none;
  width: 80px;
}

/* 动画效果 */
.side-slide-enter-active, .side-slide-leave-active {
  transition: all 0.2s ease;
}
.side-slide-enter-from, .side-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* --- APK 预览层样式 (波波刚才加的) --- */
.apk-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background: #000;
  display: flex;
  flex-direction: column;
}

.preview-header {
  height: 44px;
  background: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  color: #fff;
}

.preview-header button {
  background: #4ec9b0;
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
}

.preview-iframe {
  flex: 1;
  border: none;
  width: 100%;
  height: 100%;
  background: #fff;
}
</style>