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
        <ExportPanel v-if="viewMode === 'export'" :storyName="currentStoryName" :count="currentStoryFiles.length" @preview="preview" @doExport="handleExport" />
        <ProjectSettings 
          :key="currentStory?.id"
          v-if="viewMode === 'project'" 
          :story="currentStory" 
          :count="currentStoryFiles.length"
          :formatMgr="formatMgr" 
          @saveOnly="saveNow"  
          @update="handleRenameStory" 
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

      <EditorTools @insert="onInsert" />

      <EditorView 
        v-if="activeFile"
        ref="editorViewRef"
        v-model="activeFile.content"
        @input="onEditorInput"
      />
      <van-empty v-else description="波波快选一个段落呀 awa" />
      
      <transition name="van-fade">
        <VisualMap v-if="viewMode === 'visual'" :passages="currentStoryFiles" :activeId="currentFileId" @close="viewMode = 'files'" @jump="handleJump" @updatePosition="handleUpdateItem" />
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { showToast } from 'vant';

// 组件与锦囊
import ActivityBar from './components/ActivityBar.vue';
import SideBarList from './components/SideBarList.vue';
import ExportPanel from './components/ExportPanel.vue';
import EditorTools from './components/EditorTools.vue';
import EditorView from './components/EditorView.vue';
import VisualMap from './components/VisualMap.vue';
import ProjectSettings from './components/ProjectSettings.vue';

import { initDB } from './db/index';
import { useStoryManager } from './composables/useStoryManager';
import { useFileActions } from './composables/useFileActions';
import { useEditorBridge } from './composables/useEditorBridge';
import { useFormatManager } from './composables/useFormatManager';

// 状态
const viewMode = ref('files');
const isSidebarOpen = ref(true);
const stories = ref([]);
const allPassages = ref([]);
const currentStoryId = ref(null);
const currentFileId = ref(null);
const editorViewRef = ref(null);
let db = null;

const dbIntf = { 
  getAll: (s) => db?.getAll(s), // 别忘了给 formatManager 增加 getAll 访问权限喵！
  putItem: (s, i) => db?.put(s, i), // 对应你之前的 putItem 呼叫
  put: (s, i) => {
    if (!db) { showToast('数据库还没准备好哦 awa'); return; }
    return db.put(s, i);
  },
  delete: (s, id) => {
    if (!db) return;
    return db.delete(s, id);
  }
};

const formatMgr = useFormatManager(dbIntf);
const storyMgr = useStoryManager(stories, allPassages, currentStoryId, currentFileId, dbIntf);
const fileActions = useFileActions(dbIntf, stories, allPassages, currentStoryId);
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

  db = await initDB();
  stories.value = await db.getAll('stories');
  allPassages.value = await db.getAll('passages');
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

const handleBuild = () => {
  showToast('编译器正在热锅中，请稍后喵 awa');
};
const handleTest = () => {
  showToast('测试模块还没准备好波 xwx');
};

// --- 传送逻辑 ---
const handleJump = (id) => {
  if (!id) return;
  
  // 1. 设置当前的片段 ID
  currentFileId.value = id;
  
  // 2. 切换回文件列表模式
  viewMode.value = 'files';
  
  // 3. 自动展开侧边栏（免得波波看不见列表）
  isSidebarOpen.value = true;
  
  showToast('传送成功！biu~');
};

// UI 映射
const onEditorInput = () => syncData();
const onAddTag = (e) => { addTag(e.target.value); e.target.value = ''; };
const onInsert = (str) => editorViewRef.value?.insertText(str);
const switchMode = (mode) => {
  if (mode === 'visual') { viewMode.value = viewMode.value === 'visual' ? 'files' : 'visual'; isSidebarOpen.value = viewMode.value !== 'visual'; }
  else { if (viewMode.value === mode) isSidebarOpen.value = !isSidebarOpen.value; else { viewMode.value = mode; isSidebarOpen.value = true; } }
};
const saveNow = () => { if (activeFile.value) { handleUpdateItem(activeFile.value); showToast('存好啦 awa'); } };
const preview = () => {
  fileActions.handlePreview(
    currentStory.value, 
    currentStoryFiles.value, 
    formatMgr
  );
};
</script>
