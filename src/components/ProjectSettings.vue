<template>
  <div class="side-panel-inner project-settings">
    <div class="panel-header">项目配置中心</div>
    
    <div class="panel-content" v-if="story">
      <div class="info-card">
        <div class="info-row">
          <span class="label">当前段落数量</span>
          <span class="value">{{ count }}</span>
        </div>
      </div>

      <div class="setting-item">
        <label>故事标题 (StoryTitle)</label>
        <input 
          v-model="story.name" 
          @input="$emit('saveOnly')"
          class="vscode-input highlight" 
        />
      </div>

      <div class="setting-item">
        <label>故事 IFID (唯一标识)</label>
        <div class="input-with-btn">
          <input :value="story.ifid" readonly class="vscode-input readonly" />
          <button @click.stop="regenIFID" class="icon-btn-highlight">
            <van-icon name="refresh" />
          </button>
        </div>
      </div>

      <div class="setting-item">
        <label>故事格式 (StoryFormat)</label>
        <select 
          v-model="selectedFormatKey" 
          @change="handleFormatChange" 
          class="vscode-select"
        >
          <option v-if="availableFormats.length === 0" disabled value="">正在寻找衣柜中的衣服...</option>
          
          <option 
            v-for="fmt in availableFormats" 
            :key="fmt.id" 
            :value="fmt.id"
          >
            {{ fmt.name }} ({{ fmt.version }})
          </option>
        </select>
      </div>

      <div class="setting-item">
        <label>当前版本说明</label>
        <div class="format-desc">
          {{ currentDesc || '这个格式还没有描述喵 qwq' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // 记得导入 computed 喵！
import { useFormatManager } from '../composables/useFormatManager';

const props = defineProps(['story', 'count']);
const emit = defineEmits(['update', 'saveOnly']);

const { availableFormats, scanFormats } = useFormatManager();

// 1. 创建一个计算属性来处理选择框的 ID
// 因为我们故事里存的是 SugarCube，但衣服 ID 可能是 sugarcube-2.37.3
const selectedFormatKey = computed({
  get() {
    if (!props.story) return '';
    return `${props.story.format.toLowerCase()}-${props.story.formatVersion}`;
  },
  set(val) {
    // 这里的逻辑移到了 handleFormatChange 里统一处理喵
  }
});

// 2. 获取当前选中格式的描述（可选，让 IDE 更专业波）
const currentDesc = computed(() => {
  const fmt = availableFormats.value.find(f => f.id === selectedFormatKey.value);
  return fmt ? fmt.description : '';
});

onMounted(async () => {
  await scanFormats();
});

// 3. 当波波切换下拉框时，同步更新故事的数据
const handleFormatChange = (e) => {
  const selectedId = e.target.value;
  const fmt = availableFormats.value.find(f => f.id === selectedId);
  
  if (fmt) {
    props.story.format = fmt.name;
    props.story.formatVersion = fmt.version;
    emit('saveOnly');
    console.log(`波波换装成功！现在是 ${fmt.name} 喵！`);
  }
};

const regenIFID = () => {
  if(confirm("确定要刷新 IFID 吗？这可能会导致旧档失效喵 qwq")) {
    props.story.ifid = crypto.randomUUID().toUpperCase();
    emit('saveOnly');
  }
};
</script>

<style scoped>
/* 阿波加了一个描述文本的样式波 */
.format-desc {
  font-size: 11px;
  color: #888;
  background: #2d2d2d;
  padding: 8px;
  border-radius: 4px;
  line-height: 1.4;
  border-left: 3px solid #0e639c;
}

.project-settings { height: 100%; background: #252526; color: #cccccc; }
.panel-header { padding: 12px 20px; font-size: 11px; font-weight: bold; color: #aaa; border-bottom: 1px solid #333; }
.panel-content { padding: 15px; display: flex; flex-direction: column; gap: 18px; }

/* 调亮卡片 */
.info-card { background: #333333; padding: 12px; border: 1px solid #444; border-radius: 4px; }
.info-row { display: flex; justify-content: space-between; font-size: 12px; }
.info-row .value { color: #4ec9b0; font-weight: bold; }

.setting-item label { display: block; font-size: 11px; color: #569cd6; margin-bottom: 6px; }

/* 调亮输入框和下拉框 */
/* 找到对应的样式位置修改 */
.vscode-input, .vscode-select { 
  width: 100%; 
  /* 关键属性：让宽度包含 padding 和 border */
  box-sizing: border-box; 
  
  background: #3c3c3c; 
  color: #ffffff; 
  border: 1px solid #555; 
  padding: 6px 10px; 
  font-size: 13px; 
  outline: none;
  /* 防止手机端输入框默认圆角 */
  border-radius: 2px;
}

/* 顺便检查一下这个组合容器，确保它不换行 */
.input-with-btn { 
  display: flex; 
  width: 100%;
  box-sizing: border-box;
  gap: 0; /* 甚至可以设为 0，让按钮贴着输入框 */
}

/* 确保只读框也不会撑开 */
.readonly {
  flex: 1; /* 让 IFID 输入框占据剩余空间 */
  min-width: 0; /* 防止 flex 容器溢出 */
}
.vscode-input:focus { border-color: #007acc; background: #444; }
.readonly { color: #888; background: #2d2d2d; border-color: #333; }

/* 调亮刷新按钮 */
.icon-btn-highlight {
  background: #0e639c; /* VSCode 蓝色按钮 */
  border: none;
  color: white;
  padding: 0 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.icon-btn-highlight:hover { background: #1177bb; }

.input-with-btn { display: flex; gap: 4px; }
</style>
