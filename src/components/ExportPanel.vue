<template>
  <div class="side-panel-inner export-panel">
    <div class="panel-header">发布与导出</div>

    <div class="panel-content">
      <section class="action-section">
        <div class="section-title">开发与调试</div>
        <div class="button-stack">
          <van-button block size="small" icon="play-circle-o" class="vscode-btn primary" @click="$emit('preview')">
            浏览器预览 (Run)
          </van-button>
          <van-button block size="small" icon="aim" class="vscode-btn" @click="$emit('test')">
            运行测试 (Debug)
          </van-button>
        </div>
      </section>

      <section class="action-section">
        <div class="section-title">编译</div>
        <van-button block size="small" icon="certificate" class="vscode-btn" @click="$emit('build')">
          开始构建 HTML (Build)
        </van-button>
        <p class="build-tip">将使用项目管理页设置的格式进行编译~</p>
      </section>

      <section class="action-section">
        <div class="section-title">分发</div>
        <div class="button-stack">
          <van-button block size="small" icon="records-o" class="vscode-btn secondary" @click="$emit('doExport', 'single')">
            导出 .twee 源码
          </van-button>
          <van-button block size="small" icon="cluster-o" class="vscode-btn secondary" @click="$emit('doExport', 'zip')">
            打包工程 (.zip)
          </van-button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.export-panel { height: 100%; background: #252526; color: #ccc; }
.panel-header { padding: 10px 20px; font-size: 11px; font-weight: bold; color: #888; }
.panel-content { padding: 15px; display: flex; flex-direction: column; gap: 25px; }

.section-title { font-size: 11px; color: #888; margin-bottom: 10px; text-transform: uppercase; }
.button-stack { display: flex; flex-direction: column; gap: 8px; }
.build-tip { font-size: 10px; color: #666; margin-top: 5px; text-align: center; }

/* VSCode 风格按钮 */
:deep(.vscode-btn) { background: #3c3c3c; border: none; color: #ccc; border-radius: 2px; }
:deep(.vscode-btn.primary) { background: #0e639c; color: white; }
:deep(.vscode-btn.secondary) { background: #3a3d41; }
</style>
