<template>
  <div class="side-panel-inner project-settings">
    <div class="panel-header">项目配置</div>
    
    <div class="panel-content scrollable" v-if="story">
      <div class="section-title">概览</div>
      <div class="info-card">
        <div class="info-row">
          <span>当前段落数量</span>
          <span class="value">{{ count }}</span>
        </div>
      </div>

      <div class="divider-line"></div>

      <div class="section-title">基础信息</div>
      <div class="setting-item">
        <label>故事标题 (StoryTitle)</label>
        <input v-model="story.name" @input="$emit('saveOnly')" class="vscode-input highlight" placeholder="输入故事名字喵..." />
      </div>

      <div class="setting-item">
        <label>故事格式 (StoryFormat)</label>
        <div class="input-with-btn">
          <select v-model="selectedFormatKey" @change="handleFormatChange" class="vscode-select">
            <option v-if="displayFormats.length === 0" disabled value="">正在寻找衣柜中的衣服...</option>
            <option v-for="fmt in displayFormats" :key="fmt.id" :value="fmt.id">
              {{ fmt.name }} ({{ fmt.version }}) {{ fmt.isCustom ? '★' : '' }}
            </option>
          </select>
          <input type="file" ref="formatInput" style="display: none" accept=".js" @change="onFormatFileChange" />
          <button @click="$refs.formatInput.click()" class="icon-btn-highlight" title="上传自定义格式">
            <van-icon name="plus" />
          </button>
        </div>
      </div>

      <div class="divider-line"></div>

      <div class="section-title">编辑器偏好</div>
      <div class="pref-card">
        <div class="pref-row">
          <div class="pref-info">
            <span class="pref-label">自动换行</span>
          </div>
          <van-switch 
            :model-value="story.settings?.lineWrapping || false" 
            @update:model-value="val => updateSetting('lineWrapping', val)" 
            size="20px"
            active-color="#0e639c"
            inactive-color="#3c3c3c"
          />
        </div>
        <br/>
        <div class="pref-row">
          <div class="pref-info">
            <span class="pref-label">相对行号</span>
          </div>
          <van-switch 
            :model-value="story.settings?.relativeLineNumbers || false" 
            @update:model-value="val => updateSetting('relativeLineNumbers', val)" 
            size="20px"
            active-color="#0e639c"
            inactive-color="#3c3c3c"
          />
        </div>
      </div>

      <div class="divider-line"></div>

      <div class="section-title">高级</div>
      <div class="setting-item">
        <label>故事 IFID (唯一标识)</label>
        <div class="input-with-btn">
          <input :value="story.ifid" readonly class="vscode-input readonly" />
          <button @click.stop="regenIFID" class="icon-btn-highlight" title="重新生成">
            <van-icon name="refresh" />
          </button>
        </div>
      </div>
      
      <van-collapse v-model="activeNames" ghost>
          <van-collapse-item name="scripts">
            <template #title>
              <div class="collapse-title">
                <van-icon name="description-o" />
                <span>脚本管理 (Script Injection)</span>
              </div>
            </template>
        
            <div class="script-section-box">
              <van-collapse v-model="topScriptExpanded" ghost>
                <van-collapse-item name="top">
                  <template #title>
                    <div class="sub-label blue-text">顶级脚本 (Head Top)</div>
                  </template>
                  <div class="desc-text">插入在 head 标签最顶部，在所有 CDN 库之前运行波。</div>
                  <MiniEditor 
                    v-model="safeScripts.topScript" 
                    :settings="story.settings"
                    @change="$emit('saveOnly')" 
                  />
                </van-collapse-item>
              </van-collapse>
        
              <div class="divider-line mini"></div>
        
              <div class="sub-label blue-text">CDN 资源库 (External Assets)</div>
                <div class="desc-text">粘贴链接后，阿波会自动帮你识别库的名字和版本喵。</div>
                
                <div class="cdn-list">
                  <div v-for="(url, index) in safeScripts.cdns" :key="'cdn'+index" class="cdn-card">
                    <div class="cdn-info">
                      <van-icon name="points" class="drag-handle" />
                      <div class="cdn-meta">
                        <span class="lib-name">{{ identifyLib(url).name }}</span>
                        <span class="lib-ver" v-if="identifyLib(url).version">{{ identifyLib(url).version }}</span>
                      </div>
                      <van-icon name="clear" class="delete-icon-mini" @click="safeScripts.cdns.splice(index, 1); $emit('saveOnly')" />
                    </div>
                    <input 
                      v-model="safeScripts.cdns[index]" 
                      placeholder="粘贴 CDN 链接波..." 
                      class="cdn-input-field"
                      @input="$emit('saveOnly')"
                    />
                  </div>
                </div>
                
                <van-button size="mini" block icon="plus" class="add-btn-outline" @click="safeScripts.cdns.push(''); $emit('saveOnly')">
                  添加外部资源
                </van-button>
        
              <div class="divider-line mini"></div>
        
              <div class="sub-label blue-text">尾部脚本 (Body End)</div>
              <div class="desc-text">会按顺序插入到 body 标签末尾波。</div>
              
              <div v-for="(s, index) in safeScripts.footerScripts" :key="'fs'+index" class="script-card-box">
                <van-collapse v-model="s.isExpanded" ghost>
                  <van-collapse-item name="expanded">
                    <template #title>
                      <div class="card-top" @click.stop>
                        <input v-model="s.name" placeholder="脚本名称" class="card-name-input" @input="$emit('saveOnly')" />
                        <van-icon name="delete-o" class="delete-icon" @click="safeScripts.footerScripts.splice(index, 1); $emit('saveOnly')" />
                      </div>
                    </template>
                    <MiniEditor 
                      v-model="s.content" 
                      :settings="story.settings"
                      @change="$emit('saveOnly')" 
                    />
                  </van-collapse-item>
                </van-collapse>
              </div>
              
              <van-button size="mini" block icon="plus" class="add-btn-dark" @click="addFooterScript">
                添加自定义脚本
              </van-button>
            </div>
          </van-collapse-item>
        </van-collapse>
    </div>
  </div>
</template>

<script setup>
import MiniEditor from './MiniEditor.vue';
import { ref, onMounted, computed, watch } from 'vue';

const props = defineProps(['story', 'count', 'formatMgr']);
const emit = defineEmits(['saveOnly']);

const selectedFormatKey = ref('');
const activeNames = ref([]);
const topScriptExpanded = ref(['top']); // 默认展开顶级脚本波

const addFooterScript = () => {
  safeScripts.value.footerScripts.push({
    name: '新脚本',
    content: '',
    isExpanded: ['expanded'] // 新加的默认展开喵
  });
  emit('saveOnly');
};

// 脚本存储初始化逻辑喵！
const safeScripts = computed(() => {
  if (!props.story.extraScripts) {
    props.story.extraScripts = { topScript: "", cdns: [], footerScripts: [] };
  }
  return props.story.extraScripts;
});

const displayFormats = computed(() => {
  return props.formatMgr?.availableFormats.value || [];
});

onMounted(async () => {
  if (props.formatMgr) {
    await props.formatMgr.scanFormats();
    if (props.story) {
      selectedFormatKey.value = `${props.story.format.toLowerCase()}-${props.story.formatVersion}`;
    }
  }
});

watch(displayFormats, (newList) => {
  if (newList.length > 0 && props.story && !selectedFormatKey.value) {
    selectedFormatKey.value = `${props.story.format.toLowerCase()}-${props.story.formatVersion}`;
  }
}, { immediate: true });

const handleFormatChange = () => {
  const target = displayFormats.value.find(f => f.id === selectedFormatKey.value);
  if (target) {
    props.story.format = target.name;
    props.story.formatVersion = target.version;
    emit('saveOnly');
  }
};

const onFormatFileChange = async (e) => {
  const file = e.target.files[0];
  if (file && props.formatMgr) {
    await props.formatMgr.uploadFormat(file);
    e.target.value = ''; 
  }
};

const regenIFID = () => {
  props.story.ifid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));
  emit('saveOnly');
};

const updateSetting = (key, value) => {
  if (!props.story.settings) props.story.settings = {};
  props.story.settings[key] = value;
  emit('saveOnly');
};

const identifyLib = (url) => {
  if (!url || typeof url !== 'string') {
    return { name: '新资源库', version: '' };
  }

  try {
    // 清理URL
    const cleanUrl = url.split('?')[0].split('#')[0];
    let name = '';
    let version = '';

    // 1. 尝试从URL中提取@版本格式
    if (cleanUrl.includes('@')) {
      const urlParts = cleanUrl.split('/');
      
      for (let i = 0; i < urlParts.length; i++) {
        const part = urlParts[i];
        if (part.includes('@')) {
          const atIndex = part.lastIndexOf('@');
          const beforeAt = part.substring(0, atIndex);
          const afterAt = part.substring(atIndex + 1);
          
          // 处理作用域包 (@angular/core)
          if (i > 0 && urlParts[i-1] && urlParts[i-1].startsWith('@')) {
            name = `${urlParts[i-1]}/${beforeAt}`;
          } else {
            name = beforeAt || part.substring(0, atIndex);
          }
          
          version = afterAt;
          break;
        }
      }
    }

    // 2. 尝试从路径中提取版本号
    if (!version) {
      const pathParts = cleanUrl.split('/');
      
      // 查找版本号模式 (x.x.x 或 x.x)
      for (let i = 0; i < pathParts.length; i++) {
        const versionMatch = pathParts[i].match(/^(\d+\.\d+(?:\.\d+)?(?:-[a-z0-9.-]+)?)$/i);
        if (versionMatch) {
          version = versionMatch[1];
          // 版本号前一个部分很可能是包名
          if (i > 0) {
            // 处理作用域包
            if (pathParts[i-1] && urlParts[i-1].startsWith('@') && i-2 >= 0) {
              name = `${urlParts[i-2]}/${urlParts[i-1]}`;
            } else {
              name = pathParts[i-1];
            }
          }
          break;
        }
      }
    }

    // 3. 从文件名中提取
    if (!name || !version) {
      const fileName = cleanUrl.split('/').pop() || '';
      
      // 从文件名中匹配版本号
      const versionMatch = fileName.match(/(\d+\.\d+(?:\.\d+)?(?:-[a-z0-9.-]+)?)/i);
      if (versionMatch) {
        if (!version) version = versionMatch[1];
        
        if (!name) {
          // 从文件名中提取库名（排除版本号）
          name = fileName
            .replace(new RegExp(`[-_.]?${versionMatch[1]}[-_.]?`, 'i'), '')  // 移除版本号及其周围分隔符
            .replace(/\.(min|js|css|bundle|global|umd|esm|cjs|production|development)\.?(min)?$/gi, '')  // 移除扩展名
            .replace(/^[-_.]+|[-_.]+$/g, '');  // 清理前后分隔符
        }
      } else if (!name) {
        // 没有版本号，只清理文件名
        name = fileName
          .replace(/\.(min|js|css|bundle|global|umd|esm|cjs|production|development)\.?(min)?$/gi, '')
          .replace(/^[-_.]+|[-_.]+$/g, '');
      }
    }

    // 4. 格式化结果
    if (name) {
      // 处理特殊情况
      if (name === '' || name === 'dist' || name === 'lib') {
        // 尝试从URL中获取有意义的名称
        const pathParts = cleanUrl.split('/');
        for (let i = pathParts.length - 2; i >= 0; i--) {
          if (pathParts[i] && !pathParts[i].match(/^\d/) && 
              !['dist', 'lib', 'umd', 'esm', 'cjs', 'bundles'].includes(pathParts[i].toLowerCase())) {
            name = pathParts[i];
            break;
          }
        }
      }
      
      // 清理和格式化名称
      name = name
        .split('/').pop()  // 取最后一部分
        .replace(/^[-_.]+|[-_.]+$/g, '')  // 移除前后的分隔符
        .toLowerCase()
        .replace(/(?:^|\s|-|_|\.)\w/g, char => char.toUpperCase())  // 每个单词首字母大写
        .replace(/-/g, '');  // 移除连字符
      
      // 特殊处理常见库名
      const libMap = {
        'Jquery': 'jQuery',
        'React': 'React',
        'Reactdom': 'ReactDOM',
        'Vue': 'Vue',
        'Angular': 'Angular',
        'Axios': 'Axios',
        'Lodash': 'Lodash',
        'Moment': 'Moment.js',
        'Bootstrap': 'Bootstrap',
        'Tailwindcss': 'Tailwind CSS',
        'Chart': 'Chart.js',
        'D3': 'D3.js',
        'Three': 'Three.js',
        'Popper': 'Popper.js',
        'Swiper': 'Swiper',
        'Alpine': 'Alpine.js',
        'Uuid': 'UUID'
      };
      
      name = libMap[name] || name;
      
      // 如果名字以.min结尾，去掉它
      if (name.toLowerCase().endsWith('.min')) {
        name = name.substring(0, name.length - 4);
      }
      
      // 如果名字以.js/.css结尾，去掉扩展名
      name = name.replace(/\.(js|css)$/i, '');
    } else {
      name = '新资源库';
    }
    
    // 格式化版本号
    if (version && !version.startsWith('v')) {
      version = 'v' + version;
    }

    return { 
      name: name || '新资源库', 
      version: version || ''
    };
    
  } catch (error) {
    console.warn('CDN识别失败:', error, url);
    return { name: '新资源库', version: '' };
  }
};

</script>

<style scoped>
/* 保持波波原来的所有样式波！ */
.project-settings { height: 100%; background: #252526; color: #cccccc; display: flex; flex-direction: column; }
.panel-header { padding: 10px 15px; font-size: 11px; text-transform: uppercase; color: #858585; border-bottom: 1px solid rgba(255,255,255,0.05); }
.panel-content { flex: 1; overflow-y: auto; padding: 20px 15px; display: flex; flex-direction: column; gap: 20px; }
.scrollable::-webkit-scrollbar { width: 4px; }
.scrollable::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
.section-title { font-size: 11px; font-weight: bold; color: #569cd6; margin-bottom: -10px; }
.divider-line { height: 1px; background: rgba(255,255,255,0.05); margin: 5px 0; }
.divider-line.mini { margin: 15px 0; background: rgba(255,255,255,0.03); }
.info-card, .pref-card { background: #2d2d2d; padding: 12px; border-radius: 4px; border: 1px solid #3c3c3c; }
.info-row { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; }
.info-row .value { color: #4ec9b0; font-family: 'Consolas', monospace; }
.pref-row { display: flex; align-items: center; justify-content: space-between; }
.pref-info { display: flex; flex-direction: column; gap: 2px; }
.pref-label { font-size: 13px; color: #ccc; }
.setting-item label { display: block; font-size: 11px; color: #858585; margin-bottom: 8px; }
.vscode-input, .vscode-select { 
  width: 100%; box-sizing: border-box; background: #3c3c3c; color: #ccc; 
  border: 1px solid #3c3c3c; padding: 7px 10px; font-size: 13px; outline: none; transition: border 0.2s;
}
.vscode-input:focus, .vscode-select:focus { border-color: #007acc; }
.input-with-btn { display: flex; gap: 4px; }
.icon-btn-highlight { background: #3c3c3c; color: #ccc; border: 1px solid #3c3c3c; padding: 0 12px; cursor: pointer; transition: all 0.2s; }
.readonly { background: #252526; color: #666; border-color: transparent; cursor: not-allowed; }

/* 脚本管理面板统一蓝色风格喵 */
:deep(.van-collapse-item__title) { 
  background: transparent !important; 
  color: #858585 !important; 
  padding: 10px 0 !important; 
  font-size: 11px !important;
  text-transform: uppercase;
}

:deep(.van-collapse-item__title--expanded) {
  color: #569cd6 !important; /* 展开时变蓝色波 */
}

:deep(.van-collapse-item__content) { 
  background: transparent !important; 
  padding: 0 !important; 
}

.collapse-title { display: flex; align-items: center; gap: 8px; }
.collapse-title span { font-weight: bold; }

.script-section-box { 
  padding: 12px; 
  background: #2d2d2d; 
  border-radius: 4px; 
  border: 1px solid #3c3c3c;
  margin-bottom: 15px;
}

.sub-label { 
  font-size: 11px; 
  color: #569cd6; /* 统一成蓝色波 */
  font-weight: bold; 
  margin-bottom: 6px; 
}

.desc-text { 
  font-size: 10px; 
  color: #666; 
  margin-bottom: 10px; 
  line-height: 1.4; 
}

.list-item-row { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  margin-bottom: 8px; 
}

.mini-input { 
  padding: 5px 10px !important; 
  font-size: 12px !important; 
  background: #3c3c3c !important;
  border: 1px solid #3c3c3c !important;
}

.mini-input:focus {
  border-color: #007acc !important;
}

.delete-icon { 
  color: #f44336; 
  font-size: 14px; 
  cursor: pointer; 
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-icon:hover { opacity: 1; }

.add-btn-dark { 
  background: #3a3d41 !important; 
  border: none !important; 
  color: #ccc !important; 
  margin-top: 5px; 
  font-size: 11px !important;
  height: 24px !important;
}

.add-btn-dark:hover {
  background: #454545 !important;
  color: #fff !important;
}

.script-card-box { 
  background: #3c3c3c; 
  border-radius: 4px; 
  padding: 10px; 
  margin-bottom: 10px; 
  border-left: 3px solid #007acc; /* 标志性的蓝色侧边波 */
}

.card-top { 
  display: flex; 
  justify-content: space-between; 
  margin-bottom: 8px; 
  align-items: center;
}

.card-name-input { 
  background: transparent; 
  border: none; 
  border-bottom: 1px solid #555; 
  color: #4ec9b0; /* 变量名青色 */
  font-size: 11px; 
  outline: none; 
  width: 70%; 
  padding: 2px 0;
}

.card-name-input:focus {
  border-bottom-color: #007acc;
}

.code-font :deep(textarea) { 
  font-family: 'Consolas', 'Monaco', monospace !important; 
  font-size: 12px !important; 
  color: #d4d4d4 !important; 
  background: #1e1e1e !important; 
  padding: 8px !important;
  border-radius: 2px;
}
.blue-text { color: #569cd6 !important; margin-bottom: 0 !important; }

/* 让折叠块的头部看起来更紧凑波 */
:deep(.script-card-box .van-collapse-item__title) {
  padding: 5px 0 !important;
  border: none !important;
}

:deep(.script-card-box .van-cell__right-icon) {
  font-size: 12px;
  color: #569cd6;
}

.card-top {
  display: flex;
  flex: 1;
  justify-content: space-between;
  align-items: center;
  padding-right: 10px;
}

/* 彻底消灭 Vant 的默认边框和背景干扰喵 */
:deep(.van-cell), 
:deep(.van-collapse-item__content),
:deep(.van-hairline--top-bottom)::after,
:deep(.van-hairline--bottom)::after,
:deep(.van-cell)::after {
  border: none !important;
  background: transparent !important;
  background-color: transparent !important;
}

/* 修复折叠动画：确保高度计算正确，不要溢出波 */
:deep(.van-collapse-item__wrapper) {
  transition: height 0.3s ease-in-out !important;
  will-change: height;
}

/* 保持卡片感但不要线条波 */
.script-card-box { 
  background: #333; /* 稍微深一点点，和背景区分开波 */
  border-radius: 4px; 
  padding: 0 8px 8px 8px; /* 调整内边距让它更好看喵 */
  margin-bottom: 12px; 
  border-left: 3px solid #007acc; 
  overflow: hidden; /* 必须加这个，动画才顺滑波 */
}

/* 移除折叠标题栏自带的底线波 */
:deep(.van-cell__title) {
  border: none !important;
}

/* CDN 卡片美化喵 */
.cdn-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }

/* CDN 卡片容器强制不换行波 */
.cdn-card {
  background: #333;
  border-radius: 4px;
  padding: 8px;
  border: 1px solid #3c3c3c;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden; /* 防止溢出喵 */
}

.cdn-info {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 左右撑开波 */
  width: 100%;
  gap: 8px;
}

.cdn-meta {
  flex: 1; 
  display: flex; 
  align-items: baseline; 
  gap: 6px;
  min-width: 0; /* 这里的 min-width 是防止子元素撑开的关键喵！ */
}

.lib-name { 
  font-size: 11px; 
  font-weight: bold; 
  color: #4ec9b0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* 名字太长就打省略号波 */
}

.lib-ver { 
  font-size: 9px; 
  color: #666; 
  flex-shrink: 0; /* 版本号不许缩水波 */
}

.cdn-input-field {
  width: 100% !important;
  box-sizing: border-box !important; /* 算上边距波 */
  background: #1e1e1e !important;
  border: 1px solid #252526 !important;
  color: #888;
  font-size: 10px !important;
  padding: 4px 8px !important;
  outline: none;
}

.delete-icon-mini { 
  flex-shrink: 0; /* 重点！不许被顶飞波 */
  font-size: 14px; 
  color: #666; 
  cursor: pointer;
  padding: 2px;
}

.cdn-card:hover { border-color: #007acc; }

.drag-handle { color: #555; font-size: 12px; cursor: move; }

.cdn-input-field {
  width: 100%;
  background: #1e1e1e !important;
  border: 1px solid #252526 !important;
  color: #888;
  font-size: 10px !important;
  padding: 4px 8px !important;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}

.delete-icon-mini:hover { color: #f44336; }

.add-btn-outline {
  background: transparent !important;
  border: 1px dashed #444 !important;
  color: #888 !important;
  font-size: 11px !important;
}
.add-btn-outline:hover { border-color: #007acc !important; color: #007acc !important; }
</style>