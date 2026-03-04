<template>
  <div class="package-manager">
    <div class="search-area">
      <input 
        v-model="searchQuery" 
        placeholder="搜索前端包..." 
        class="search-input"
        @input="handleSearch"
      />
      <van-icon v-if="!searchQuery" name="search" class="search-icon" />
      <van-icon v-else name="cross" class="search-icon clear-icon" @click="clearSearch" />
    </div>

    <div class="import-area">
      <input type="file" ref="fileInput" style="display: none" accept=".js,.css" @change="handleFileImport" />
      <van-button size="small" icon="upgrade" @click="$refs.fileInput.click()" class="import-btn">
        导入本地文件
      </van-button>
      <van-button size="small" icon="link-o" @click="showManualInput = !showManualInput" class="import-btn">
        手动添加链接
      </van-button>
    </div>

    <div v-if="showManualInput" class="manual-input-area">
      <input 
        v-model="manualUrl" 
        placeholder="输入 CDN 链接或本地路径 (如: assets/custom.js)..." 
        class="manual-input"
        @keyup.enter="handleManualImport"
      />
      <van-button size="small" type="primary" @click="handleManualImport">
        添加
      </van-button>
    </div>

    <div v-if="searchQuery" class="search-results">
      <div v-if="searchResults.length > 0">
        <div v-for="result in searchResults" :key="result.name" class="result-item">
          <div class="result-header">
            <div class="result-info">
              <div class="result-name">{{ result.name }}</div>
              <div class="result-version">v{{ result.version }}</div>
            </div>
            <van-button 
              v-if="isInstalled(result.name)"
              class="install-btn uninstall-btn" 
              size="mini" 
              @click="handleRemove(getInstalledPkgId(result.name))"
            >
              卸载
            </van-button>
            <van-button 
              v-else
              class="install-btn" 
              size="mini" 
              type="primary" 
              @click="handleInstall(result)"
            >
              安装
            </van-button>
          </div>
          <div class="result-desc">{{ result.description }}</div>
        </div>
      </div>
      <div v-else-if="searchQuery.length > 0" class="empty-hint">
        搜索中或未找到结果...
      </div>
    </div>

    <div v-show="!searchQuery" class="installed-section">
      <div class="section-header">已安装的包</div>
      <div v-if="packages.length === 0" class="empty-hint">
        还没有安装任何包喵~
      </div>
      <div v-for="(pkg, index) in packages" :key="pkg.id" class="pkg-card">
        <div class="pkg-header">
          <div class="pkg-info">
            <span class="pkg-name">{{ pkg.name }}</span>
            <span class="pkg-version">v{{ pkg.version }}</span>
            <span class="pkg-type">{{ pkg.fileType }}</span>
          </div>
          <div class="pkg-actions">
            <div class="move-controls">
              <van-icon 
                name="arrow-up" 
                class="move-icon" 
                :class="{ disabled: index === 0 }"
                @click="index > 0 && handleMove(pkg.id, 'up')" 
              />
              <van-icon 
                name="arrow-down" 
                class="move-icon" 
                :class="{ disabled: index === packages.length - 1 }"
                @click="index < packages.length - 1 && handleMove(pkg.id, 'down')" 
              />
            </div>
            <van-icon name="delete-o" class="delete-icon" @click="handleRemove(pkg.id)" />
          </div>
        </div>
        <div class="pkg-controls" v-if="!pkg.url.startsWith('assets/')">
          <div class="inline-toggle">
            <span class="toggle-label">内联模式</span>
            <van-switch 
              :model-value="pkg.inlineMode" 
              @update:model-value="handleToggleInline(pkg.id)"
              size="18px"
              active-color="#0e639c"
            />
          </div>
          <div class="pkg-hint">
            {{ pkg.inlineMode ? '资源会打包到 HTML 中' : '使用 CDN 链接' }}
          </div>
        </div>
        <div class="pkg-controls" v-else>
          <div class="pkg-hint local-hint">
            <van-icon name="info-o" size="12" />
            本地文件，内联注入到 HTML
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { showToast } from 'vant';
import { useAppContext } from '@/core/AppContext';

const ctx = useAppContext();
const packageService = ctx.get('packageManager');
const assetService = ctx.get('assetService');
const currentStoryId = ctx.get('currentStoryId');

const packages = computed(() => packageService.packages.value);
const searchResults = computed(() => packageService.searchResults.value);

const searchQuery = ref('');
const showManualInput = ref(false);
const manualUrl = ref('');
const fileInput = ref(null);
let searchTimer = null;

const handleSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    packageService.searchPackage(searchQuery.value);
  }, 500);
};

const handleInstall = async (result) => {
  if (!currentStoryId.value) {
    showToast('请先选择或创建一个故事喵！');
    return;
  }
  try {
    await packageService.installPackage(result.name, result.version, currentStoryId.value, true, result.url);
    showToast(`${result.name} 安装成功喵！`);
    searchQuery.value = '';
    packageService.searchPackage('');
  } catch (error) {
    showToast(error.message || '安装失败了 xwx');
  }
};

const handleRemove = async (id) => {
  try {
    await packageService.removePackage(id);
    showToast('卸载成功！');
  } catch (e) {
    showToast(e.message || '卸载失败了 xwx');
  }
};

const handleMove = async (id, direction) => {
  try {
    await packageService.movePackage(id, direction);
  } catch (e) {
    showToast(e.message || '移动失败了 xwx');
  }
};

const handleToggleInline = async (id) => {
  try {
    await packageService.toggleInlineMode(id);
    showToast('模式切换成功！');
  } catch (e) {
    showToast(e.message || '切换失败了 xwx');
  }
};

const clearSearch = () => {
  searchQuery.value = '';
  packageService.searchPackage('');
};

const isInstalled = (pkgName) => {
  return packages.value.some(p => p.name === pkgName);
};

const getInstalledPkgId = (pkgName) => {
  const pkg = packages.value.find(p => p.name === pkgName);
  return pkg ? pkg.id : null;
};

const handleFileImport = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!currentStoryId.value) {
    showToast('请先选择或创建一个故事喵！');
    return;
  }
  try {
    await packageService.importFromFile(file, currentStoryId.value, assetService.uploadAsset);
    showToast('导入成功喵！文件已上传到 assets');
    e.target.value = '';
  } catch (error) {
    showToast(error.message || '导入失败了 xwx');
  }
};

const handleManualImport = async () => {
  const url = manualUrl.value.trim();
  if (!url) {
    showToast('请输入链接喵~');
    return;
  }
  if (!currentStoryId.value) {
    showToast('请先选择或创建一个故事喵！');
    return;
  }
  try {
    await packageService.importFromUrl(url, currentStoryId.value, assetService.assets);
    manualUrl.value = '';
    showManualInput.value = false;
    showToast('添加成功喵~');
  } catch (error) {
    showToast(error.message || '添加失败了 xwx');
  }
};
</script>

<style scoped>
.package-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
}

.search-area {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 10px 35px 10px 12px;
  color: #d4d4d4;
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: #007acc;
}

.search-icon {
  position: absolute;
  right: 12px;
  color: #666;
  font-size: 16px;
}

.import-area {
  display: flex;
  gap: 8px;
}

.import-btn {
  flex: 1;
  background: #2d2d2d !important;
  border: 1px solid #3c3c3c !important;
  color: #ccc !important;
}

.import-btn:hover {
  background: #3c3c3c !important;
  color: #fff !important;
  border-color: #007acc !important;
}

.manual-input-area {
  display: flex;
  gap: 8px;
  padding: 10px;
  background: #2d2d2d;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
}

.manual-input {
  flex: 1;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 8px 10px;
  color: #d4d4d4;
  font-size: 12px;
}

.manual-input:focus {
  outline: none;
  border-color: #007acc;
}

.search-results {
  margin-top: 4px;
  background: #252526;
  border-radius: 4px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 3px;
}

.search-results::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

.clear-icon {
  cursor: pointer;
}

.clear-icon:hover {
  color: #d4d4d4;
}

.results-header {
  padding: 8px 12px;
  font-size: 11px;
  color: #888;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: #252526;
  z-index: 2;
}

.close-results {
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
}

.close-results:hover {
  color: #d4d4d4;
}

.result-item {
  padding: 10px 12px;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item:last-child {
  border-bottom: none;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.result-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.result-name {
  font-size: 13px;
  font-weight: bold;
  color: #4ec9b0;
  word-break: break-all;
}

.result-version {
  font-size: 10px;
  color: #666;
}

.install-btn {
  flex-shrink: 0;
}

.uninstall-btn {
  background: #3c3c3c !important;
  color: #f48771 !important;
  border-color: #4a4a4a !important;
}

.uninstall-btn:hover {
  background: #4a4a4a !important;
  color: #ff6b6b !important;
}

.result-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
  margin-top: 2px;
}

.installed-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  font-size: 12px;
  font-weight: bold;
  color: #569cd6;
}

.empty-hint {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: #666;
}

.pkg-card {
  background: #333;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pkg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pkg-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pkg-name {
  font-size: 13px;
  font-weight: bold;
  color: #4ec9b0;
}

.pkg-version {
  font-size: 10px;
  color: #666;
}

.pkg-type {
  font-size: 9px;
  color: #888;
  background: #252526;
  padding: 2px 6px;
  border-radius: 3px;
}

.pkg-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.move-controls {
  display: flex;
  gap: 8px;
}

.move-icon {
  color: #888;
  cursor: pointer;
  font-size: 14px;
}

.move-icon:hover:not(.disabled) {
  color: #d4d4d4;
}

.move-icon.disabled {
  color: #444;
  cursor: not-allowed;
}

.delete-icon {
  color: #f48771;
  cursor: pointer;
  font-size: 16px;
}

.delete-icon:hover {
  color: #ff6b6b;
}

.pkg-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inline-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-label {
  font-size: 11px;
  color: #999;
}

.pkg-hint {
  font-size: 10px;
  color: #666;
}

.local-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #4ec9b0;
  font-size: 10px;
}
</style>
