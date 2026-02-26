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
        <select v-model="story.format" @change="$emit('saveOnly')" class="vscode-select">
          <option value="SugarCube">SugarCube</option>
          <option value="Harlowe">Harlowe</option>
          <option value="Chapbook">Chapbook</option>
          <option value="Snowman">Snowman</option>
        </select>
      </div>

      <div class="setting-item">
        <label>格式版本</label>
        <input 
          v-model="story.formatVersion" 
          @input="$emit('saveOnly')"
          placeholder="例如 2.36.1"
          class="vscode-input" 
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(['story', 'count']);
const emit = defineEmits(['update', 'saveOnly']); // 增加一个只保存不弹窗的事件

const regenIFID = () => {
  // 加上确认，防止点错
  if(confirm("确定要刷新 IFID 吗？这可能会导致旧档失效喵 qwq")) {
    props.story.ifid = crypto.randomUUID().toUpperCase();
    emit('saveOnly');
  }
};
</script>

<style scoped>
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
