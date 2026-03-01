<template>
  <div class="vscode-layout">
    <ActivityBar :activeMode="viewMode" :isOpen="isSidebarOpen" @switch="switchMode" @save="saveNow" />

    <transition name="side-slide">
      <aside class="side-nav-box" v-show="isSidebarOpen && viewMode !== 'visual'">
        <SideBarList 
          v-if="viewMode === 'files' || viewMode === 'stories'"
          :title="viewMode === 'files' ? '段落' : '故事'"
          :icon="viewMode === 'files' ? 'notes-o' : 'label-o'"
          :items="viewMode === 'files' ? currentStoryFiles : stories"
          :folders="currentFolders"
          :activeId="viewMode === 'files' ? currentFileId : currentStoryId"
          @select="handleSelect" @add="handleAdd" @addFolder="handleAddFolder"
          @updateItem="handleUpdateItem" @deleteItem="handleDeleteItem"
          @deleteFolder="handleDeleteFolder" @deleteStory="handleDeleteStory"
          @renameItem="handleRenameItem" @renameFolder="handleRenameFolder"
          @renameStory="handleRenameStory" @setStart="handleSetStart"
          @importStory="handleImportFile"
        />
        <ExportPanel v-if="viewMode === 'export'" :storyName="currentStoryName" :count="currentStoryFiles.length" @preview="preview" @test="test" @build="handleBuild" @doExport="handleExport" />
        <ProjectSettings 
          :key="currentStory?.id"
          v-if="viewMode === 'project'" 
          :story="currentStory" 
          :count="currentStoryFiles.length"
          :formatMgr="formatMgr" 
          @saveOnly="saveNow"  
          @update="handleRenameStory" 
        />
        <AssetManager 
          v-if="viewMode === 'assets'" 
          :assets="assets"
          @upload="handleAssetUpload"
          @delete="removeAsset"
          @rename="handleAssetRename"
        />
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
        <VisualMap v-if="viewMode === 'visual'" :passages="currentStoryFiles" :activeId="currentFileId" @close="viewMode = 'files'" @jump="handleJump" @updatePosition="handleUpdateItem" />
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
import SideBarList from './components/SideBarList.vue';
import ExportPanel from './components/ExportPanel.vue';
import EditorTools from './components/EditorTools.vue';
import EditorView from './components/EditorView.vue';
import VisualMap from './components/VisualMap.vue';
import ProjectSettings from './components/ProjectSettings.vue';
import AssetManager from './components/AssetManager.vue';

import { initDB } from './db/index';
import { useStoryManager } from './composables/useStoryManager';
import { useFileActions } from './composables/useFileActions';
import { useEditorBridge } from './composables/useEditorBridge';
import { useFormatManager } from './composables/useFormatManager';
import { usePersistence } from './composables/usePersistence';

// 状态
const viewMode = ref('files');
const isSidebarOpen = ref(true);
const stories = ref([]);
const allPassages = ref([]);
const currentStoryId = ref(null);
const currentFileId = ref(null);
const currentStoryAssets = computed(() => assets.value.filter(a => a.storyId === currentStoryId.value));
const editorViewRef = ref(null);
const previewUrl = ref('');
const isPreviewOpen = ref(false);
const assets = ref([]);
const db = ref(null);

const { syncAsset, removeAsset, renameAsset, loadAssets } = usePersistence(db, stories, allPassages, assets);

watch(currentStoryId, async (newId) => {
  if (newId) {
    // 只要故事 ID 变了，阿波就去数据库里只捞这个 ID 的资源波！
    await loadAssets(newId);
  } else {
    // 如果没有选中的故事，就把列表清空喵
    assets.value = [];
  }
}, { immediate: true });

const dbIntf = { 
  getAll: (s) => db.value?.getAll(s),
  putItem: (s, i) => db.value?.put(s, i),
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

const formatMgr = useFormatManager(dbIntf);
const storyMgr = useStoryManager(stories, allPassages, currentStoryId, currentFileId, dbIntf);
const fileActions = useFileActions(dbIntf, stories, allPassages, currentStoryId, assets);
const activeFile = computed(() => allPassages.value.find(p => p.id === currentFileId.value));
const { syncData, currentPassageTags, addTag, removeTag } = useEditorBridge(activeFile, storyMgr.handleUpdateItem);

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
  await loadAssets();
  
  stories.value = await instance.getAll('stories');
  allPassages.value = await instance.getAll('passages');
  if (stories.value.length > 0) currentStoryId.value = stories.value[0].id;
});

// 计算属性映射
const currentStory = computed(() => stories.value.find(s => s.id === currentStoryId.value));
const currentStoryName = computed(() => currentStory.value?.name || '未选择');
const currentStoryFiles = computed(() => allPassages.value.filter(p => p.storyId === currentStoryId.value));
const currentFolders = computed(() => currentStory.value?.folders || []);

// 逻辑映射
const handleUpdateItem = (item) => storyMgr.handleUpdateItem(item);
// --- App.vue 里的 handleSelect 终极版 ---
const handleSelect = (id) => {
  if (viewMode.value === 'stories') {
    // 1. 让业务逻辑切换故事 ID
    storyMgr.handleSelect(id, 'story');
    
    // 2. 关键：手动强制切换视图模式喵！
    // 既然选了故事，我们要么去看文件列表('files')，要么去看项目设置('project')
    // 阿波建议先切到文件列表，让波波能看到段落喵 awa
    viewMode.value = 'files'; 
    
    console.log("阿波成功帮波波切换到故事：", id);
    showToast(`进入故事：${currentStory.value?.name || '新世界'}`);
  } else {
    // 正常模式：在段落列表里选段落
    storyMgr.handleSelect(id, 'file');
  }
};
const handleAdd = () => storyMgr.handleAdd(viewMode.value, currentStoryFiles.value, fileActions.generateUUID);
const handleRenameItem = (id) => storyMgr.handleRenameItem(id);
const handleRenameStory = (id) => storyMgr.handleRenameStory(id);
const handleDeleteItem = (id) => storyMgr.handleDeleteItem(id);
const handleDeleteStory = (id) => storyMgr.handleDeleteStory(id);
const handleSetStart = (id) => storyMgr.handleSetStart(id, currentStoryId.value);
const handleAddFolder = () => storyMgr.handleAddFolder(currentStory.value);
const handleRenameFolder = (old) => storyMgr.handleRenameFolder(old, currentStory.value);
const handleDeleteFolder = (n) => storyMgr.handleDeleteFolder(n, currentStory.value);
const handleExport = (type) => fileActions.handleExport(type, currentStoryName.value, currentStory.value, currentStoryFiles.value);
const handleImportFile = () => fileActions.handleImportFile((id) => { currentStoryId.value = id; viewMode.value = 'files'; });

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
  let hasSaved = false;

  // 1. 如果有正在编辑的片段，存片段
  if (activeFile.value) {
    handleUpdateItem(activeFile.value);
    hasSaved = true;
  }

  // 2. 【最关键的修复】如果有当前的故事，存故事设置！
  if (currentStory.value) {
    handleUpdateItem(currentStory.value); // 这里的 handleUpdateItem 会自动识别这是故事喵
    hasSaved = true;
  }
};

const preview = async () => {
  // 运行预览逻辑
  const url = await fileActions.handlePreview(
    currentStory.value, 
    currentStoryFiles.value, 
    formatMgr
  );

  // 如果拿到了 url，说明 handlePreview 判断出这是 APK 环境波！
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
  // 传 true 进去开启 Debug 模式喵
  const url = await fileActions.handlePreview(currentStory.value, currentStoryFiles.value, formatMgr, true);
  if (url) {
    previewUrl.value = url;
    isPreviewOpen.value = true;
  }
};

const handleBuild = () => {
  fileActions.handleBuild(currentStory.value, currentStoryFiles.value, formatMgr);
};

const handleAssetUpload = async (file) => {
  if (!currentStoryId.value) {
    showToast('请先选择或创建一个故事喵！');
    return;
  }
  try {
    // 上传时带上当前故事的 ID 波
    await syncAsset(file, currentStoryId.value);
    showToast('上传成功喵！');
  } catch (e) {
    showToast('上传失败了 xwx');
  }
};

const handleAssetRename = async (id, newName) => {
  await renameAsset(id, newName);
  showToast('改名成功！');
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