<template>
  <div class="side-panel-inner">
    <div class="panel-header">
      <span class="title-text">{{ title }}</span>
    </div>

    <div class="sidebar-action-bar">
      <template v-if="title === '段落'">
        <div class="action-item" @click.stop="$emit('addFolder')">
          <van-icon name="folder-add-o" />
          <span>新文件夹</span>
        </div>
        <div class="action-item" @click.stop="$emit('add')">
          <van-icon name="plus" />
          <span>新段落</span>
        </div>
      </template>
      
      <template v-else>
        <div class="action-item" @click.stop="$emit('add')">
          <van-icon name="plus" />
          <span>新建故事</span>
        </div>
        <div class="action-item" @click.stop="$emit('importStory')">
          <van-icon name="back-top" style="transform: rotate(180deg)" />
          <span>导入故事</span>
        </div>
      </template>
    </div>

    <div class="list-container">
      <template v-if="title === '段落'">
        <div v-for="folder in folders" :key="folder" class="folder-group">
          <div class="folder-title" @click="toggleFolder(folder)">
            <van-icon :name="collapsedFolders[folder] ? 'arrow' : 'arrow-down'" class="arrow-icon" />
            <van-icon name="folder-o" class="folder-icon" />
            <span class="name-text">{{ folder }}</span>
            <div class="item-actions">
              <van-icon name="edit" class="action-btn" @click.stop="$emit('renameFolder', folder)" />
              <van-icon name="cross" class="action-btn delete" @click.stop="$emit('deleteFolder', folder)" />
            </div>
          </div>
          
          <draggable 
            v-show="!collapsedFolders[folder]"
            :list="getFilesByFolder(folder)"
            group="passages"
            item-key="id"
            :animation="250"
            ghost-class="ghost-item"
            class="drag-area"
            @change="(e) => onDragChange(e, folder)"
          >
            <template #item="{ element }">
              <div :class="['side-item', { active: activeId === element.id }]" @click="$emit('select', element.id)">
                <van-icon name="notes-o" class="item-icon" />
                <span class="item-name">{{ element.name }}</span>
                <div class="item-actions">
                  <van-icon 
                    :name="element.isStart ? 'flag' : 'flag-o'" 
                    :style="{ color: element.isStart ? '#4a90e2' : '' }"
                    class="action-btn" 
                    @click.stop="$emit('setStart', element.id)" 
                  />
                  <van-icon name="edit" class="action-btn" @click.stop="$emit('renameItem', element.id)" />
                  <van-icon name="delete-o" class="action-btn delete" @click.stop="$emit('deleteItem', element.id)" />
                </div>
              </div>
            </template>
          </draggable>
        </div>

        <div class="folder-group">
          <div class="folder-title" @click="toggleFolder('root')">
            <van-icon :name="collapsedFolders['root'] ? 'arrow' : 'arrow-down'" class="arrow-icon" />
            <span class="name-text">未分类段落</span>
          </div>
          <draggable 
            v-show="!collapsedFolders['root']"
            :list="rootFiles"
            group="passages"
            item-key="id"
            :animation="250"
            ghost-class="ghost-item"
            class="drag-area"
            @change="(e) => onDragChange(e, null)"
          >
            <template #item="{ element }">
              <div :class="['side-item', { active: activeId === element.id }]" @click="$emit('select', element.id)">
                <van-icon name="notes-o" class="item-icon" />
                <span class="item-name">{{ element.name }}</span>
                <div class="item-actions">
                  <van-icon 
                    :name="element.isStart ? 'flag' : 'flag-o'" 
                    :style="{ color: element.isStart ? '#4a90e2' : '' }"
                    class="action-btn" 
                    @click.stop="$emit('setStart', element.id)" 
                  />
                  <van-icon name="edit" class="action-btn" @click.stop="$emit('renameItem', element.id)" />
                  <van-icon name="delete-o" class="action-btn delete" @click.stop="$emit('deleteItem', element.id)" />
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </template>

      <template v-else>
        <div v-for="item in items" :key="item.id" :class="['side-item', { active: activeId === item.id }]" @click="$emit('select', item.id)">
          <van-icon :name="icon" class="item-icon" />
          <span class="item-name">{{ item.name }}</span>
          <div class="item-actions">
            <van-icon name="edit" class="action-btn" @click.stop="$emit('renameStory', item.id)" />
            <van-icon name="delete-o" class="action-btn delete" @click.stop="$emit('deleteStory', item.id)" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps(['title', 'items', 'activeId', 'icon', 'folders']);
const emit = defineEmits([
  'select', 'add', 'addFolder', 'updateItem', 
  'deleteItem', 'deleteFolder', 'deleteStory', 
  'renameItem', 'renameFolder', 'renameStory', 'setStart', 'importStory'
]);

const rootFiles = computed(() => props.items.filter(i => !i.folder));
const getFilesByFolder = (folderName) => props.items.filter(i => i.folder === folderName);

const collapsedFolders = ref({});
const toggleFolder = (name) => { collapsedFolders.value[name] = !collapsedFolders.value[name]; };

const onDragChange = (evt, folderName) => {
  if (evt.added) {
    const item = evt.added.element;
    emit('updateItem', { ...item, folder: folderName });
  }
};
</script>

<style scoped>
.side-panel-inner { height: 100%; display: flex; flex-direction: column; background: #252526; }
.panel-header { padding: 10px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.title-text { font-size: 11px; color: #cccccc; text-transform: uppercase; }
.sidebar-action-bar { display: flex; padding: 8px 10px; gap: 5px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); }
.action-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 5px 0; font-size: 11px; color: #aaaaaa; cursor: pointer; background: rgba(255,255,255,0.03); border-radius: 3px; }
.action-item:hover { background: rgba(255,255,255,0.1); color: #ffffff; }
.list-container { flex: 1; overflow-y: auto; }
.folder-group { margin-bottom: 1px; }
.folder-title { position: relative; padding: 6px 15px; display: flex; align-items: center; font-size: 12px; color: #cccccc; cursor: pointer; }
.name-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drag-area { min-height: 5px; }
.side-item { position: relative; padding: 6px 15px 6px 35px; display: flex; align-items: center; font-size: 13px; color: #969696; cursor: grab; }
.item-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-actions { display: none; align-items: center; gap: 6px; margin-left: 4px; }
.folder-title:hover .item-actions, .side-item:hover .item-actions { display: flex; }
.action-btn { font-size: 14px; color: #888; padding: 2px; }
.action-btn:hover { color: #fff; }
.action-btn.delete:hover { color: #ff4d4f; }
.folder-icon { margin: 0 6px; color: #dcb67a; font-size: 14px; }
.arrow-icon { font-size: 10px; width: 12px; }
.side-item.active { background: #37373d; color: #ffffff; }
.item-icon { margin-right: 8px; }
.ghost-item { opacity: 0.3; background: #007acc !important; }
</style>
