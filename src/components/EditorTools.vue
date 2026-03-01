<template>
  <div class="tools-container">
    <div class="tools">
      <div class="tool-group highlight">
        <button 
          v-for="t in primarySymbols" 
          :key="t" 
          class="t-btn primary" 
          @click="onInsert(t)"
        >{{ t }}</button>
      </div>

      <div class="divider"></div>

      <div class="tool-group">
        <button 
          v-for="t in secondarySymbols" 
          :key="t" 
          class="t-btn" 
          @click="onInsert(t)"
          v-html="getDisplay(t)"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { showToast } from 'vant'; // 如果波波想在长按时提示的话

const emit = defineEmits(['insert']);

// 分成两个数组，方便给不同的样式波
const primarySymbols = ['[[', ']]', '<<', '>>', '->', '<-', '|'];
const secondarySymbols = [
  ':: ', '/', '+', '-', '*', '=',
  '<', '>', '"', "'", ';',
  '\\', '(', ')', '[', ']', '{', '}'
];

const displayMap = {
  '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '\\': '&#92;'
};

const getDisplay = (symbol) => displayMap[symbol] || symbol;

const onInsert = (t) => {
  // 如果在手机端，尝试触发微小震动喵！
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(10); 
  }
  emit('insert', t);
};
</script>

<style scoped>
/* 外层容器，处理阴影和背景喵 */
.tools-container {
  background: #252526;
  border-bottom: 1px solid #333;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 10;
}

.tools { 
  display: flex; 
  align-items: center;
  gap: 6px; 
  padding: 6px 10px; 
  overflow-x: auto; 
  /* 隐藏滚动条，但保留滑动功能喵 */
  scrollbar-width: none; 
}
.tools::-webkit-scrollbar { display: none; }

.tool-group {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 分隔竖线 */
.divider {
  width: 1px;
  height: 20px;
  background: #444;
  margin: 0 4px;
  flex-shrink: 0;
}

.t-btn { 
  background: #3c3c3c; 
  color: #cccccc; 
  border: 1px solid #454545; 
  padding: 6px 12px; 
  border-radius: 4px; 
  font-family: 'Consolas', monospace; 
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.1s;
  user-select: none;
  -webkit-tap-highlight-color: transparent; /* 去掉移动端点击蓝框喵 */
}

/* 重点符号的特殊颜色波 */
.t-btn.primary {
  background: #2d4a6d; /* 暗蓝色，很像 VSCode 的逻辑块颜色波 */
  color: #9cdcfe;
  border-color: #3e5a7d;
  font-weight: bold;
}

.t-btn:active {
  background: #505050;
  transform: translateY(1px); /* 点击落下的感觉喵 */
  border-color: #007acc;
}

.t-btn.primary:active {
  background: #365a8d;
}
</style>