<template>
  <div class="side-panel-inner asset-manager">
    <div class="panel-header">资源管理 (Assets)</div>
    
    <div class="sidebar-action-bar">
      <div class="action-item" @click="$refs.fileInput.click()">
        <van-icon name="plus" />
        <span>上传素材</span>
      </div>
      <input type="file" ref="fileInput" hidden @change="handleUpload" multiple />
    </div>

    <div class="syntax-hint">
      引用语法：<span>@{文件名}</span>
    </div>

    <div class="asset-list scrollable">
      <div v-for="asset in assets" :key="asset.id" class="asset-item">
        <div class="preview-box">
          <img v-if="asset.type.startsWith('image/')" :src="asset.url" />
          <van-icon v-else name="music-o" size="20" />
        </div>
        <div class="asset-info">
          <span class="asset-name">{{ asset.name }}</span>
          <div class="asset-actions">
            <van-button size="mini" @click="handleRename(asset)">重命名</van-button>
            <van-icon name="delete-o" class="del-btn" @click="$emit('delete', asset.id)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(['assets']);
const emit = defineEmits(['upload', 'delete', 'rename']);

const handleUpload = (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => emit('upload', file));
  e.target.value = '';
};

const handleRename = (asset) => {
  // 简单的原生弹窗就足够用了波
  const newName = prompt('请输入新的资源名称喵：', asset.name);
  if (newName && newName.trim() !== '' && newName !== asset.name) {
    emit('rename', asset.id, newName.trim());
  }
};
</script>

<style scoped>
/* 整体容器：深色极简风喵 */
.asset-manager { 
  height: 100%; 
  background: #1e1e1e; 
  display: flex; 
  flex-direction: column; 
  color: #cccccc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* 顶部标题喵 */
.panel-header {
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #858585;
}

/* 操作栏：增加点间距和悬浮感喵 */
.sidebar-action-bar {
  display: flex;
  padding: 0 16px 12px;
  gap: 8px;
}

.action-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  font-size: 12px;
  color: #e1e1e1;
  cursor: pointer;
  background: #333333;
  border-radius: 4px;
  transition: background 0.2s ease, transform 0.1s active;
}

.action-item:hover {
  background: #454545;
}

.action-item:active {
  transform: scale(0.98);
}

/* 语法提示条喵 */
.syntax-hint {
  margin: 0 16px 12px;
  padding: 8px;
  background: rgba(78, 201, 176, 0.05);
  border-radius: 4px;
  font-size: 11px;
  color: #888;
  border: 1px dashed rgba(78, 201, 176, 0.2);
  text-align: center;
}

.syntax-hint span {
  color: #4ec9b0;
  font-family: 'Fira Code', monospace;
  font-weight: bold;
}

/* 列表容器喵 */
.asset-list { 
  flex: 1; 
  overflow-y: auto; 
  padding: 0 16px 16px; 
}

/* 自定义滚动条波 */
.asset-list::-webkit-scrollbar { width: 5px; }
.asset-list::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
.asset-list::-webkit-scrollbar-track { background: transparent; }

/* 资源卡片：更加轻薄和扁平喵 */
.asset-item { 
  display: flex; 
  align-items: center;
  gap: 12px; 
  padding: 8px; 
  background: #252526; 
  margin-bottom: 8px; 
  border-radius: 4px; 
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.asset-item:hover {
  background: #2d2d2d;
  border-color: #404040;
}

/* 预览框：棋盘格背景喵 */
.preview-box { 
  width: 42px; 
  height: 42px; 
  background-color: #1a1a1a;
  background-image: 
    linear-gradient(45deg, #222 25%, transparent 25%), 
    linear-gradient(-45deg, #222 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #222 75%), 
    linear-gradient(-45deg, transparent 75%, #222 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px 4px, 4px 0;
  display: flex; 
  align-items: center; 
  justify-content: center; 
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
}

.preview-box img { 
  max-width: 90%; 
  max-height: 90%; 
  object-fit: contain;
  image-rendering: pixelated; /* 如果是小像素画会很清晰波 */
}

/* 资源信息区喵 */
.asset-info { 
  flex: 1; 
  min-width: 0; 
}

.asset-name { 
  display: block;
  font-size: 12px; 
  color: #cccccc; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
  margin-bottom: 4px;
  transition: color 0.2s;
}

.asset-item:hover .asset-name {
  color: #ffffff;
}

/* 按钮组：平时隐藏，悬停显示喵 */
.asset-actions { 
  display: flex; 
  align-items: center; 
  gap: 10px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
}

.asset-item:hover .asset-actions {
  opacity: 1;
  transform: translateX(0);
}

/* 迷你重命名按钮波 */
:deep(.van-button--mini) {
  height: 20px;
  padding: 0 6px;
  background: #3e3e3e;
  border: none;
  color: #bbb;
  border-radius: 2px;
}

:deep(.van-button--mini):hover {
  background: #505050;
  color: #fff;
}

/* 删除图标喵 */
.del-btn { 
  font-size: 14px;
  color: #666; 
  cursor: pointer; 
  transition: color 0.2s;
}

.del-btn:hover { 
  color: #f14c4c; 
}

/* 空状态喵 */
.empty-state {
  margin-top: 40px;
  text-align: center;
  color: #555;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>