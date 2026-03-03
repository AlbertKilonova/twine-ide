<template>
  <div class="side-panel-inner">
    <!-- 故事选择器 -->
    <div class="story-selector-wrapper">
      <div class="story-selector">
        <div class="story-dropdown" @click="storyMenuOpen = !storyMenuOpen; showCreateForm = false">
          <van-icon name="label-o" class="story-icon" />
          <span class="story-name">{{ currentStoryName || '选择故事' }}</span>
          <van-icon :name="storyMenuOpen ? 'arrow-up' : 'arrow-down'" class="story-arrow" />
        </div>
        <div class="story-actions">
          <span class="story-text-btn" @click.stop="openCreateForm">新建</span>
          <span class="story-text-btn" @click.stop="handleImportStory">导入</span>
        </div>
      </div>

      <!-- 故事列表下拉菜单（浮层） -->
      <transition name="dropdown-fade">
        <div v-if="storyMenuOpen" class="story-menu">
          <div 
            v-for="s in stories" :key="s.id" 
            :class="['story-menu-item', { active: s.id === currentStoryId }]"
            @click="selectStory(s.id)"
          >
            <span class="story-menu-name">{{ s.name }}</span>
            <div class="story-menu-actions">
              <van-icon name="edit" class="action-btn" @click.stop="handleRenameStory(s.id)" />
              <van-icon name="delete-o" class="action-btn delete" @click.stop="handleDeleteStory(s.id)" />
            </div>
          </div>
          <div v-if="!stories || stories.length === 0" class="story-menu-empty">还没有故事，创建一个吧</div>
        </div>
      </transition>

      <!-- 新建故事表单（浮层） -->
      <transition name="dropdown-fade">
        <div v-if="showCreateForm" class="create-story-form">
          <input 
            v-model="newStoryName" 
            class="create-input" 
            placeholder="故事名称" 
            @keyup.enter="submitCreate"
            ref="createNameInput"
          />
          <select v-model="newStoryFormat" class="create-select">
            <option value="" disabled>选择格式</option>
            <option v-for="fmt in availableFormats" :key="fmt.id" :value="fmt.id">
              {{ fmt.name }} ({{ fmt.version }})
            </option>
          </select>
          <div class="create-actions">
            <button class="create-btn confirm" @click="submitCreate">创建</button>
            <button class="create-btn cancel" @click="showCreateForm = false">取消</button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 段落操作栏 -->
    <div class="sidebar-action-bar">
      <div class="action-item" @click.stop="handleAddFolder">
        <van-icon name="folder-add-o" />
        <span>新文件夹</span>
      </div>
      <div class="action-item" @click.stop="handleAddPassage">
        <van-icon name="plus" />
        <span>新段落</span>
      </div>
    </div>

    <!-- 段落列表 -->
    <div class="list-container">
      <div v-for="folder in folders" :key="folder" class="folder-group">
        <div 
          :class="['folder-title', { 'drop-target': dragOverFolder === folder }]"
          :data-folder="folder"
          @click="toggleFolder(folder)"
          @dragover.prevent="dragOverFolder = folder"
          @dragleave="dragOverFolder = null"
          @drop.prevent="onDrop(folder)"
        >
          <van-icon :name="collapsedFolders[folder] ? 'arrow' : 'arrow-down'" class="arrow-icon" />
          <van-icon name="folder-o" class="folder-icon" />
          <span class="name-text">{{ folder }}</span>
          <div class="item-actions">
            <van-icon name="edit" class="action-btn" @click.stop="handleRenameFolder(folder)" />
            <van-icon name="cross" class="action-btn delete" @click.stop="handleDeleteFolder(folder)" />
          </div>
        </div>
        <div v-show="!collapsedFolders[folder]" class="folder-contents">
          <div 
            v-for="item in getFilesByFolder(folder)" :key="item.id"
            :class="['side-item', { active: currentFileId === item.id }]"
            draggable="true"
            @dragstart="onDragStart(item)"
            @dragend="onDragEnd"
            @touchstart.passive="onTouchStart($event, item)"
            @touchmove.prevent="onTouchMove"
            @touchend="onTouchEnd"
            @click="handleSelectFile(item.id)"
          >
            <van-icon name="notes-o" class="item-icon" />
            <span class="item-name">{{ item.name }}</span>
            <div class="item-actions">
              <van-icon 
                :name="item.isStart ? 'flag' : 'flag-o'" 
                :style="{ color: item.isStart ? '#4a90e2' : '' }"
                class="action-btn" 
                @click.stop="handleSetStart(item.id)" 
              />
              <van-icon name="edit" class="action-btn" @click.stop="handleRenameItem(item.id)" />
              <van-icon name="delete-o" class="action-btn delete" @click.stop="handleDeleteItem(item.id)" />
            </div>
          </div>
        </div>
      </div>

      <div class="folder-group">
        <div 
          :class="['folder-title', { 'drop-target': dragOverFolder === '__root__' }]"
          data-folder="__root__"
          @click="toggleFolder('root')"
          @dragover.prevent="dragOverFolder = '__root__'"
          @dragleave="dragOverFolder = null"
          @drop.prevent="onDrop(null)"
        >
          <van-icon :name="collapsedFolders['root'] ? 'arrow' : 'arrow-down'" class="arrow-icon" />
          <span class="name-text">未分类段落</span>
        </div>
        <div v-show="!collapsedFolders['root']" class="folder-contents">
          <div 
            v-for="item in rootFiles" :key="item.id"
            :class="['side-item', { active: currentFileId === item.id }]"
            draggable="true"
            @dragstart="onDragStart(item)"
            @dragend="onDragEnd"
            @touchstart.passive="onTouchStart($event, item)"
            @touchmove.prevent="onTouchMove"
            @touchend="onTouchEnd"
            @click="handleSelectFile(item.id)"
          >
            <van-icon name="notes-o" class="item-icon" />
            <span class="item-name">{{ item.name }}</span>
            <div class="item-actions">
              <van-icon 
                :name="item.isStart ? 'flag' : 'flag-o'" 
                :style="{ color: item.isStart ? '#4a90e2' : '' }"
                class="action-btn" 
                @click.stop="handleSetStart(item.id)" 
              />
              <van-icon name="edit" class="action-btn" @click.stop="handleRenameItem(item.id)" />
              <van-icon name="delete-o" class="action-btn delete" @click.stop="handleDeleteItem(item.id)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端拖拽浮动指示器 -->
    <div v-if="dragItem && touchActive" class="touch-ghost" :style="ghostStyle">
      <van-icon name="notes-o" style="margin-right:4px" />
      {{ dragItem.name }}
    </div>
    <div v-if="dragItem && touchActive && dragOverFolder" class="touch-hint">
      → {{ dragOverFolder === '__root__' ? '未分类' : dragOverFolder }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { showToast } from 'vant';
import { useAppContext } from '@/core/AppContext';

const emit = defineEmits(['importStory']);

const ctx = useAppContext();
const storyMgr = ctx.get('storyManager');
const formatMgr = ctx.get('formatManager');
const stories = ctx.get('stories');
const allPassages = ctx.get('allPassages');
const currentStoryIdRef = ctx.get('currentStoryId');
const currentFileIdRef = ctx.get('currentFileId');

const currentStoryId = computed(() => currentStoryIdRef.value);
const currentFileId = computed(() => currentFileIdRef.value);
const currentStory = computed(() => stories.value?.find(s => s.id === currentStoryId.value));
const currentStoryName = computed(() => currentStory.value?.name || '未选择');
const currentStoryFiles = computed(() => allPassages.value?.filter(p => p.storyId === currentStoryId.value) || []);
const folders = computed(() => currentStory.value?.folders || []);
const availableFormats = computed(() => formatMgr.availableFormats.value);

const storyMenuOpen = ref(false);
const showCreateForm = ref(false);
const newStoryName = ref('');
const newStoryFormat = ref('');
const createNameInput = ref(null);

const openCreateForm = () => {
  showCreateForm.value = true;
  storyMenuOpen.value = false;
  newStoryName.value = '';
  newStoryFormat.value = availableFormats.value?.[0]?.id || '';
  setTimeout(() => createNameInput.value?.focus(), 50);
};

const submitCreate = () => {
  if (!newStoryName.value.trim()) return;
  const fmt = availableFormats.value?.find(f => f.id === newStoryFormat.value);
  storyMgr.handleAddStory({
    name: newStoryName.value.trim(),
    format: fmt?.name || '',
    formatVersion: fmt?.version || ''
  });
  showCreateForm.value = false;
};

const selectStory = (id) => {
  storyMgr.handleSelect(id, 'story');
  showToast(`进入故事：${stories.value?.find(s => s.id === id)?.name || '新世界'}`);
  storyMenuOpen.value = false;
};

const handleSelectFile = (id) => storyMgr.handleSelect(id, 'file');
const handleAddPassage = () => {
  if (!currentStoryId.value) {
    showToast('请先选择一个故事喵！');
    return;
  }
  storyMgr.handleAdd('files', currentStoryFiles.value);
};
const handleRenameItem = (id) => storyMgr.handleRenameItem(id);
const handleRenameStory = (id) => storyMgr.handleRenameStory(id);
const handleDeleteItem = (id) => storyMgr.handleDeleteItem(id);
const handleDeleteStory = (id) => storyMgr.handleDeleteStory(id);
const handleSetStart = (id) => storyMgr.handleSetStart(id, currentStoryId.value);
const handleAddFolder = () => storyMgr.handleAddFolder(currentStory.value);
const handleRenameFolder = (old) => storyMgr.handleRenameFolder(old, currentStory.value);
const handleDeleteFolder = (n) => storyMgr.handleDeleteFolder(n, currentStory.value);
const handleImportStory = () => emit('importStory');

const rootFiles = computed(() => currentStoryFiles.value.filter(i => !i.folder));
const getFilesByFolder = (folderName) => currentStoryFiles.value.filter(i => i.folder === folderName);

const collapsedFolders = ref({});
const toggleFolder = (name) => { collapsedFolders.value[name] = !collapsedFolders.value[name]; };

const dragItem = ref(null);
const dragOverFolder = ref(null);
const touchActive = ref(false);
const ghostStyle = ref({});

const onDragStart = (item) => { dragItem.value = item; };
const onDragEnd = () => { dragItem.value = null; dragOverFolder.value = null; };
const onDrop = (folderName) => {
  if (dragItem.value && dragItem.value.folder !== folderName) {
    dragItem.value.folder = folderName;
    storyMgr.handleUpdateItem(dragItem.value);
  }
  dragOverFolder.value = null;
  dragItem.value = null;
};

// --- Touch 拖拽支持（移动端） ---
let touchTimer = null;
let touchStartY = 0;

const onTouchStart = (e, item) => {
  touchStartY = e.touches[0].clientY;
  touchTimer = setTimeout(() => {
    touchActive.value = true;
    dragItem.value = item;
    const touch = e.touches[0];
    ghostStyle.value = { top: (touch.clientY - 16) + 'px', left: (touch.clientX + 10) + 'px' };
    if (navigator.vibrate) navigator.vibrate(30);
  }, 250);
};

const onTouchMove = (e) => {
  if (!touchActive.value || !dragItem.value) {
    if (Math.abs(e.touches[0].clientY - touchStartY) > 10) clearTimeout(touchTimer);
    return;
  }
  const touch = e.touches[0];
  ghostStyle.value = { top: (touch.clientY - 16) + 'px', left: (touch.clientX + 10) + 'px' };
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const folderEl = el?.closest?.('[data-folder]');
  dragOverFolder.value = folderEl ? folderEl.dataset.folder : null;
};

const onTouchEnd = () => {
  clearTimeout(touchTimer);
  if (touchActive.value && dragItem.value && dragOverFolder.value) {
    const targetFolder = dragOverFolder.value === '__root__' ? null : dragOverFolder.value;
    if (dragItem.value.folder !== targetFolder) {
      dragItem.value.folder = targetFolder;
      storyMgr.handleUpdateItem(dragItem.value);
    }
  }
  touchActive.value = false;
  dragItem.value = null;
  dragOverFolder.value = null;
};
</script>

<style scoped>
.side-panel-inner { height: 100%; display: flex; flex-direction: column; background: #252526; }

/* 故事选择器 */
.story-selector-wrapper { position: relative; z-index: 10; flex-shrink: 0; }
.story-selector { display: flex; align-items: center; padding: 8px 10px; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); background: #2d2d2d; }
.story-dropdown { flex: 1; display: flex; align-items: center; gap: 6px; padding: 4px 8px; cursor: pointer; border-radius: 3px; min-width: 0; }
.story-dropdown:hover { background: rgba(255,255,255,0.06); }
.story-icon { font-size: 14px; color: #569cd6; flex-shrink: 0; }
.story-name { flex: 1; font-size: 12px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.story-arrow { font-size: 10px; color: #666; flex-shrink: 0; }
.story-actions { display: flex; gap: 2px; flex-shrink: 0; }
.story-text-btn { font-size: 10px; color: #888; padding: 2px 6px; cursor: pointer; border-radius: 3px; white-space: nowrap; }
.story-text-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }

/* 故事下拉菜单（浮层） */
.story-menu { position: absolute; top: 100%; left: 0; right: 0; background: #1e1e1e; border: 1px solid #007acc; border-top: none; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
.story-menu-item { display: flex; align-items: center; padding: 6px 15px; font-size: 12px; color: #aaa; cursor: pointer; }
.story-menu-item:hover { background: #2a2d2e; color: #fff; }
.story-menu-item.active { background: #37373d; color: #fff; border-left: 2px solid #007acc; }
.story-menu-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.story-menu-actions { display: none; align-items: center; gap: 6px; margin-left: 4px; }
.story-menu-item:hover .story-menu-actions { display: flex; }
.story-menu-empty { padding: 12px 15px; font-size: 11px; color: #666; text-align: center; }

/* 新建故事表单（浮层） */
.create-story-form { position: absolute; top: 100%; left: 0; right: 0; padding: 10px; background: #1e1e1e; border: 1px solid #007acc; border-top: none; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
.create-input, .create-select { width: 100%; box-sizing: border-box; background: #3c3c3c; color: #ccc; border: 1px solid #3c3c3c; padding: 6px 8px; font-size: 12px; outline: none; border-radius: 3px; }
.create-input:focus, .create-select:focus { border-color: #007acc; }
.create-actions { display: flex; gap: 6px; }
.create-btn { flex: 1; padding: 5px; font-size: 11px; border: none; border-radius: 3px; cursor: pointer; }
.create-btn.confirm { background: #0e639c; color: #fff; }
.create-btn.confirm:hover { background: #1177bb; }
.create-btn.cancel { background: #3c3c3c; color: #aaa; }
.create-btn.cancel:hover { background: #4c4c4c; color: #fff; }

/* 下拉动画 */
.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: all 0.15s ease; }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; max-height: 0; }

.sidebar-action-bar { display: flex; padding: 8px 10px; gap: 5px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); }
.action-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 5px 0; font-size: 11px; color: #aaaaaa; cursor: pointer; background: rgba(255,255,255,0.03); border-radius: 3px; }
.action-item:hover { background: rgba(255,255,255,0.1); color: #ffffff; }
.list-container { flex: 1; overflow-y: auto; }
.folder-group { margin-bottom: 1px; }
.folder-title { position: relative; padding: 6px 15px; display: flex; align-items: center; font-size: 12px; color: #cccccc; cursor: pointer; }
.name-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.folder-contents { min-height: 2px; }
.drop-target { background: rgba(0, 122, 204, 0.15) !important; }
.side-item { position: relative; padding: 6px 15px 6px 35px; display: flex; align-items: center; font-size: 13px; color: #969696; cursor: grab; }
.item-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-actions { display: flex; align-items: center; gap: 6px; margin-left: 4px; visibility: hidden; }
.folder-title:hover .item-actions, .side-item:hover .item-actions { visibility: visible; }
.action-btn { font-size: 14px; color: #888; padding: 2px; }
.action-btn:hover { color: #fff; }
.action-btn.delete:hover { color: #ff4d4f; }
.folder-icon { margin: 0 6px; color: #dcb67a; font-size: 14px; }
.arrow-icon { font-size: 10px; width: 12px; }
.side-item.active { background: #37373d; color: #ffffff; }
.item-icon { margin-right: 8px; }
.side-item[draggable='true'] { cursor: grab; }
.side-item[draggable='true']:active { cursor: grabbing; opacity: 0.6; }
/* 移动端拖拽指示器 */
.touch-ghost { position: fixed; z-index: 9999; background: #007acc; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; pointer-events: none; white-space: nowrap; display: flex; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.5); opacity: 0.9; }
.touch-hint { position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); z-index: 9999; background: #0e639c; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; pointer-events: none; box-shadow: 0 2px 12px rgba(0,0,0,0.4); }
.drop-target { background: rgba(0, 122, 204, 0.25) !important; outline: 1px dashed #007acc; }
</style>
