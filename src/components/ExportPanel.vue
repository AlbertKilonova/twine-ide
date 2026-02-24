<template>
  <div class="export-panel">
    <div class="panel-header">发布故事</div>
    <div class="panel-content">
      <div class="info-card">
        <div class="info-item">
          <span class="label">当前故事</span>
          <span class="value">{{ storyName }}</span>
        </div>
        <div class="info-item">
          <span class="label">段落总数</span>
          <span class="value">{{ count }}</span>
        </div>
      </div>

      <div class="action-group">
        <div class="section-title">预览</div>
        <van-button block size="small" icon="play-circle-o" class="vscode-btn" @click="$emit('preview')">
          在浏览器中运行
        </van-button>
      </div>

      <div class="action-group">
        <div class="section-title">导出</div>
        <van-button block size="small" icon=" points" class="vscode-btn secondary" @click="$emit('doExport', 'single')">
          导出单文件 (.twee)
        </van-button>
        <van-button block size="small" icon="records-o" class="vscode-btn secondary" @click="$emit('doExport', 'zip')">
          导出工程压缩包 (.zip)
        </van-button>
      </div>
      
      <div class="export-tips">
        <van-icon name="info-o" />
        <span>导出的文件符合 Twee2 标准，可直接用于 Twine 编译器喔！</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps(['storyName', 'count']);
defineEmits(['preview', 'doExport']);
</script>

<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #252526;
  color: #cccccc;
}

.panel-header {
  padding: 10px 20px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
}

.panel-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
  border: 1px solid #333;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 8px;
}

.info-item:last-child { margin-bottom: 0; }

.info-item .label { color: #888; }
.info-item .value { color: #569cd6; font-weight: bold; }

.section-title {
  font-size: 11px;
  color: #888;
  margin-bottom: 10px;
  padding-left: 2px;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 仿 VSCode 的按钮样式 */
.vscode-btn {
  background: #0e639c !important;
  border: none !important;
  color: white !important;
  height: 28px !important;
  border-radius: 2px !important;
  font-size: 12px !important;
}

.vscode-btn:active {
  opacity: 0.8;
}

.vscode-btn.secondary {
  background: #3a3d41 !important;
}

.vscode-btn.secondary:hover {
  background: #45494e !important;
}

.export-tips {
  margin-top: 10px;
  font-size: 10px;
  color: #666;
  display: flex;
  gap: 5px;
  line-height: 1.4;
}
</style>
