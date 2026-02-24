<template>
  <div class="vscode-layout">
    <ActivityBar 
      :activeMode="viewMode" 
      :isOpen="isSidebarOpen" 
      @switch="switchMode" 
      @save="saveNow" 
    />

    <transition name="side-slide">
      <aside class="side-nav-box" v-show="isSidebarOpen">
        <SideBarList 
          v-if="viewMode === 'files' || viewMode === 'stories'"
          :title="viewMode === 'files' ? '段落' : '故事'"
          :icon="viewMode === 'files' ? 'notes-o' : 'label-o'"
          :items="viewMode === 'files' ? currentStoryFiles : stories"
          :folders="currentFolders"
          :activeId="viewMode === 'files' ? currentFileId : currentStoryId"
          @select="handleSelect" 
          @add="handleAdd" 
          @addFolder="handleAddFolder"
          @updateItem="handleUpdateItem" 
          @deleteItem="handleDeleteItem"
          @deleteFolder="handleDeleteFolder" 
          @deleteStory="handleDeleteStory"
          @renameItem="handleRenameItem" 
          @renameFolder="handleRenameFolder"
          @renameStory="handleRenameStory" 
          @setStart="handleSetStart"
          @importStory="handleImportFile"
        />
        <ExportPanel v-if="viewMode === 'export'" :storyName="currentStoryName" :count="currentStoryFiles.length" @preview="preview" @doExport="handleExport" />
      </aside>
    </transition>

    <main class="editor-main">
      <header class="breadcrumb">
        <div v-if="!isSidebarOpen" class="menu-toggle" @click="isSidebarOpen = true"><van-icon name="bars" /></div>
        <div class="path-text">
          {{ currentStoryName }} 
          <span v-if="activeFile?.folder"> / {{ activeFile.folder }}</span>
          / {{ activeFile?.name || '...' }}
          <van-tag v-if="activeFile?.isStart" type="primary" size="mini" style="margin-left:8px">START</van-tag>
        </div>
      </header>

      <div class="tag-manager" v-if="activeFile">
        <van-icon name="label-o" class="tag-icon" />
        <div class="tag-list">
          <van-tag v-for="tag in currentPassageTags" :key="tag" closeable @close="removeTag(tag)" color="#3e3e3e" text-color="#aaa">
            {{ tag }}
          </van-tag>
          <input class="tag-input" placeholder="+ 添加标签" @keyup.enter="addTag" />
        </div>
      </div>

      <EditorTools @insert="onInsert" />

      <div class="editor-container" v-if="activeFile">
        <div class="line-numbers" ref="lineNumsRef">
          <div v-for="n in lineCount" :key="n" class="ln-item">{{ n }}</div>
        </div>
        <div class="editor-scroll-area" ref="scrollBoxRef" @scroll="syncScroll">
          <div class="editor-content-wrapper">
            <div class="highlighter-layer">
              <div v-for="(line, idx) in editorLines" :key="idx" 
                   :class="['line-text', { 'header-highlight': line.startsWith('::') }]">
                {{ line }}&nbsp;
              </div>
            </div>
            <textarea 
              ref="editorRef"
              v-model="activeFile.content" 
              class="real-textarea" 
              spellcheck="false"
              wrap="off"
              @input="onEditorInput"
            ></textarea>
          </div>
        </div>
      </div>
      <van-empty v-else description="波波快选一个段落呀 awa" />
      
      <transition name="van-fade">
        <VisualMap 
          v-if="viewMode === 'visual'" 
          :passages="currentStoryFiles"
          :activeId="currentFileId"
          @close="viewMode = 'files'"
          @jump="(id) => { currentFileId = id; viewMode = 'files'; }"
          @updatePosition="handleUpdateItem" 
        />
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant';
import ActivityBar from './components/ActivityBar.vue';
import SideBarList from './components/SideBarList.vue';
import ExportPanel from './components/ExportPanel.vue';
import EditorTools from './components/EditorTools.vue';
import VisualMap from './components/VisualMap.vue';
import { initDB } from './db/index';
import JSZip from 'jszip';

const viewMode = ref('files');
const isSidebarOpen = ref(true);
const stories = ref([]);
const allPassages = ref([]);
const currentStoryId = ref(null);
const currentFileId = ref(null);

const editorRef = ref(null);
const scrollBoxRef = ref(null);
const lineNumsRef = ref(null);
let db;

onMounted(async () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  if (isIOS) {
    const hasWarned = localStorage.getItem('ios_warned')
    if (!hasWarned) {
      alert('提示：本编辑器使用 indexedDB 存储数据，由于 iOS 系统特性，您的本地存储随时可能被系统清理。为了您的心血，请务必频繁导出备份！(。•ˇˍˇ•。) ')
      localStorage.setItem('ios_warned', 'true')
    }
  }
  
  db = await initDB();
  stories.value = await db.getAll('stories');
  allPassages.value = await db.getAll('passages');
  if (stories.value.length > 0) currentStoryId.value = stories.value[0].id;
  console.log("已加载加载所有段落，总数：", allPassages.value.length);
});

const currentStory = computed(() => stories.value.find(s => s.id === currentStoryId.value));
const currentStoryName = computed(() => currentStory.value?.name || '未选择');
const currentStoryFiles = computed(() => allPassages.value.filter(p => p.storyId === currentStoryId.value));
const currentFolders = computed(() => currentStory.value?.folders || []);
const activeFile = computed(() => allPassages.value.find(p => p.id === currentFileId.value));
const editorLines = computed(() => activeFile.value?.content.split('\n') || []);
const lineCount = computed(() => editorLines.value.length || 1);

const syncScroll = () => {
  if (scrollBoxRef.value && lineNumsRef.value) {
    lineNumsRef.value.scrollTop = scrollBoxRef.value.scrollTop;
  }
};

// --- 数据同步核心：全量保存逻辑 ---
const handleUpdateItem = async (item) => {
  if (!item || !item.id) return;
  try {
    const plainItem = JSON.parse(JSON.stringify(item));
    
    await db.put('passages', plainItem);
    
    const idx = allPassages.value.findIndex(p => p.id === item.id);
    if (idx !== -1) {
      const newArray = [...allPassages.value];
      newArray[idx] = plainItem;
      allPassages.value = newArray; 
    }
    
  } catch (err) {
    console.error("数据同步失败：", err);
  }
};

const onEditorInput = () => { syncData(); };
const syncData = async () => {
  if (!activeFile.value) return;
  // 实时解析标题逻辑
  const match = activeFile.value.content.split('\n')[0].match(/^::\s*([^\[\{]+)/);
  if (match) activeFile.value.name = match[1].trim();
  
  // 这里的关键：即使在编辑文字，也要带上原来的 visualPos 存进去
  await handleUpdateItem(activeFile.value);
};

// --- 标签与头信息 ---
const currentPassageTags = computed(() => {
  if (!activeFile.value) return [];
  const firstLine = activeFile.value.content.split('\n')[0];
  const match = firstLine.match(/\[(.*?)\]/);
  return match ? match[1].split(' ').filter(t => t) : [];
});

const updateHeader = (newTags) => {
  const lines = activeFile.value.content.split('\n');
  const header = lines[0];
  const tagStr = newTags.length > 0 ? `[${newTags.join(' ')}]` : '';
  const titlePart = header.match(/^::\s*([^\[\{]+)/)?.[0].trimEnd() || ':: NewPassage';
  const metaPart = header.match(/\{.*\}$/)?.[0] || '';
  lines[0] = `${titlePart} ${tagStr} ${metaPart}`.replace(/\s+/g, ' ').trimEnd();
  activeFile.value.content = lines.join('\n');
  syncData();
};

const addTag = (e) => {
  const val = e.target.value.trim();
  if (val && !currentPassageTags.value.includes(val)) {
    updateHeader([...currentPassageTags.value, val]);
    e.target.value = '';
  }
};

const removeTag = (tag) => { updateHeader(currentPassageTags.value.filter(t => t !== tag)); };

// --- 基础操作 ---
const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));

const downloadBlob = (blob, name) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
};

const switchMode = (mode) => {
  if (viewMode.value === mode) isSidebarOpen.value = !isSidebarOpen.value;
  else { viewMode.value = mode; isSidebarOpen.value = true; }
};

const handleSelect = (id) => {
  if (viewMode.value === 'stories') {
    currentStoryId.value = id;
    viewMode.value = 'files';
    const first = currentStoryFiles.value[0];
    if (first) currentFileId.value = first.id;
  } else currentFileId.value = id;
};

const handleAdd = () => {
  const isStory = viewMode.value === 'stories';
  const name = prompt(isStory ? "故事名？" : "段落名？");
  if (!name) return;
  if (isStory) {
    const s = { id: Date.now().toString(), name, folders: [], ifid: generateUUID() };
    stories.value.push(s);
    db.put('stories', JSON.parse(JSON.stringify(s)));
  } else {
    if (!currentStoryId.value) return;
    const p = { id: Date.now().toString(), storyId: currentStoryId.value, name, folder: null, content: `:: ${name}\n`, isStart: currentStoryFiles.value.length === 0 };
    allPassages.value.push(p);
    currentFileId.value = p.id;
    handleUpdateItem(p);
  }
};

const handleAddFolder = () => {
  const n = prompt("新文件夹名？");
  if (n && currentStory.value) {
    if (!currentStory.value.folders) currentStory.value.folders = [];
    currentStory.value.folders.push(n);
    db.put('stories', JSON.parse(JSON.stringify(currentStory.value)));
  }
};

// --- 导入导出逻辑 ---
const handleImportFile = () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.twee,.zip,.txt';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showLoadingToast({ message: '搬家啦...', forbidClick: true });
    try {
      let fTitle = file.name.replace(/\.[^/.]+$/, ""), fIfid = generateUUID(), fStart = null, ps = [];
      const parseTwee = (text) => {
        const sections = text.split(/^::/m);
        let meta = {}; let items = [];
        sections.forEach(sec => {
          const lines = sec.split('\n'); const h = lines[0].trim(); const c = lines.slice(1).join('\n').trim();
          if (!h) return;
          if (h === 'StoryTitle') meta.title = c;
          else if (h === 'StoryData') { try { const d = JSON.parse(c); meta.ifid = d.ifid; meta.start = d.start; } catch {} }
          else items.push({ name: h.match(/^([^\[\{]+)/)?.[1].trim() || h, full: `:: ${h}\n${c}` });
        });
        return { meta, items };
      };
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        for (const name of Object.keys(zip.files)) {
          if (name.endsWith('.twee') || name.endsWith('.txt')) {
            const res = parseTwee(await zip.files[name].async("string"));
            if (res.meta.title) fTitle = res.meta.title;
            if (res.meta.ifid) fIfid = res.meta.ifid;
            if (res.meta.start) fStart = res.meta.start;
            ps.push(...res.items);
          }
        }
      } else {
        const res = parseTwee(await file.text());
        if (res.meta.title) fTitle = res.meta.title;
        if (res.meta.ifid) fIfid = res.meta.ifid;
        fStart = res.meta.start; ps = res.items;
      }
      const newS = { id: Date.now().toString(), name: fTitle, folders: [], ifid: fIfid };
      await db.put('stories', JSON.parse(JSON.stringify(newS)));
      stories.value.push(newS);
      for (const p of ps) {
        const start = fStart ? p.name === fStart : (p.name === 'Start' || p.name === 'start');
        const newP = { id: (Date.now() + Math.random()).toString(), storyId: newS.id, name: p.name, folder: null, content: p.full, isStart: start };
        await handleUpdateItem(newP);
        allPassages.value.push(newP);
      }
      closeToast(); currentStoryId.value = newS.id; viewMode.value = 'files'; showToast('搬家完毕 awa');
    } catch { closeToast(); showToast('导入坏掉了 xwx'); }
  };
  input.click();
};

const handleExport = async (type) => {
  if (currentStoryFiles.value.length === 0) return;
  const zip = type === 'zip' ? new JSZip() : null;
  const startP = currentStoryFiles.value.find(p => p.isStart) || currentStoryFiles.value[0];
  const storyTitle = `:: StoryTitle\n${currentStoryName.value}\n\n`;
  const storyData = `:: StoryData\n{"ifid": "${currentStory.value.ifid || generateUUID()}", "format": "SugarCube", "format-version": "2.37.3", "start": "${startP.name}", "zoom": 1}\n\n`;
  if (type === 'single') {
    let res = storyTitle + storyData;
    currentStoryFiles.value.forEach(f => res += f.content + '\n\n');
    downloadBlob(new Blob([res]), `${currentStoryName.value}.twee`);
  } else {
    currentStoryFiles.value.forEach(f => zip.file(`${f.folder || 'passages'}/${f.name}.twee`, f.content));
    zip.file(`story_metadata.twee`, storyTitle + storyData);
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${currentStoryName.value}.zip`);
  }
};

const handleSetStart = (id) => {
  allPassages.value.forEach(p => { 
    if (p.storyId === currentStoryId.value) { 
      p.isStart = (p.id === id); 
      handleUpdateItem(p); 
    } 
  });
};

const handleRenameItem = (id) => {
  const item = allPassages.value.find(p => p.id === id);
  const n = prompt("改名？", item?.name);
  if (n && n !== item.name) {
    item.name = n; const lines = item.content.split('\n');
    if (lines[0].startsWith('::')) { lines[0] = lines[0].replace(/^::\s*([^\[\{]+)/, `:: ${n} `); item.content = lines.join('\n'); }
    handleUpdateItem(item);
  }
};

const handleRenameFolder = (old) => {
  const n = prompt("文件夹改名？", old);
  if (n && n !== old) {
    const idx = currentStory.value.folders.indexOf(old);
    if (idx > -1) currentStory.value.folders[idx] = n;
    allPassages.value.forEach(p => { 
      if (p.storyId === currentStoryId.value && p.folder === old) { 
        p.folder = n; 
        handleUpdateItem(p); 
      } 
    });
    db.put('stories', JSON.parse(JSON.stringify(currentStory.value)));
  }
};

const handleRenameStory = (id) => {
  const s = stories.value.find(x => x.id === id);
  const n = prompt("故事改名？", s?.name);
  if (n) { s.name = n; db.put('stories', JSON.parse(JSON.stringify(s))); }
};

const handleDeleteItem = (id) => {
  showConfirmDialog({ message: '扔了它？' }).then(() => {
    allPassages.value = allPassages.value.filter(p => p.id !== id);
    db.delete('passages', id); if (currentFileId.value === id) currentFileId.value = null;
  });
};

const handleDeleteFolder = (n) => {
  showConfirmDialog({ message: '拆了文件夹？' }).then(() => {
    currentStory.value.folders = currentStory.value.folders.filter(f => f !== n);
    allPassages.value.forEach(p => { 
      if (p.storyId === currentStoryId.value && p.folder === n) { 
        p.folder = null; 
        handleUpdateItem(p); 
      } 
    });
    db.put('stories', JSON.parse(JSON.stringify(currentStory.value)));
  });
};

const handleDeleteStory = (id) => {
  showConfirmDialog({ message: '烧掉整个故事？' }).then(() => {
    allPassages.value = allPassages.value.filter(p => p.storyId !== id);
    stories.value = stories.value.filter(s => s.id !== id);
    db.delete('stories', id); if (currentStoryId.value === id) currentStoryId.value = null;
  });
};

const onInsert = (str) => {
  const el = editorRef.value; if (!el) return;
  const start = el.selectionStart;
  activeFile.value.content = activeFile.value.content.slice(0, start) + str + activeFile.value.content.slice(el.selectionEnd);
  syncData();
};

const saveNow = () => { if (activeFile.value) { handleUpdateItem(activeFile.value); showToast('保存好啦'); } };
const preview = () => showToast('还在研发中...');
</script>

<style scoped>
.vscode-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: #1e1e1e; color: #ccc; }
.side-nav-box { background: #252526; border-right: 1px solid #333; flex-shrink: 0; overflow: hidden; width: 220px; }
.editor-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #1e1e1e; position: relative; }

/* 动画效果 */
.side-slide-enter-active, .side-slide-leave-active { transition: all 0.3s ease; }
.side-slide-enter-from, .side-slide-leave-to { width: 0; opacity: 0; }

.breadcrumb { height: 35px; border-bottom: 1px solid #333; display: flex; align-items: center; padding: 0 10px; font-size: 11px; color: #888; }
.tag-manager { display: flex; align-items: center; padding: 5px 15px; background: #252526; gap: 10px; border-bottom: 1px solid #333; }
.tag-list { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.tag-input { background: transparent; border: none; color: #888; font-size: 12px; width: 80px; outline: none; }

.editor-container { flex: 1; display: flex; overflow: hidden; position: relative; font-family: 'Fira Code', monospace; }
.line-numbers { width: 45px; background: #1e1e1e; color: #858585; text-align: right; padding: 10px 10px 10px 0; font-size: 12px; line-height: 22px; user-select: none; border-right: 1px solid #333; }
.editor-scroll-area { flex: 1; overflow: auto; position: relative; }
.editor-content-wrapper { min-width: 100%; display: inline-block; position: relative; min-height: 100%; }

.real-textarea, .highlighter-layer { 
  width: 100%; height: 100%; padding: 10px; border: none; outline: none; 
  font-size: 14px; line-height: 22px; font-family: inherit; white-space: pre; 
  overflow: hidden; box-sizing: border-box; display: block;
}
.real-textarea { position: absolute; top: 0; left: 0; background: transparent; color: transparent; caret-color: #fff; z-index: 2; resize: none; }
.highlighter-layer { z-index: 1; pointer-events: none; color: #ccc; position: relative; }
.header-highlight { color: #569cd6; font-weight: bold; background: rgba(86, 156, 214, 0.2); display: inline-block; min-width: 100%; }
.menu-toggle { padding-right: 10px; font-size: 16px; cursor: pointer; }
.path-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>


<!-- vim好用awa -->
