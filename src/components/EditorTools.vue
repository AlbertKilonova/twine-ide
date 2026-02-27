<template>
  <div class="tools">
    <button 
      v-for="t in symbolList" 
      :key="t" 
      class="t-btn" 
      @click="$emit('insert', t)"
      v-html="getDisplay(t)"
    ></button>
  </div>
</template>

<script setup>
defineEmits(['insert']);

// 原始数组，保持接口不变
const originalSymbols = [
'[[', '<-', '|', '->', ']]',
':: ', '<<', '>>',
'/', '+', '-', '*', '=',
'<', '>', '"', "'", ';',
'\\', '(', ')', '[', ']', '{', '}'
];

// 用于显示的HTML实体映射
const displayMap = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '\\': '&#92;'
};

// 显示符号的方法
const getDisplay = (symbol) => {
  return displayMap[symbol] || symbol;
};

// 导出给模板使用
const symbolList = originalSymbols;
</script>

<style scoped>
.tools { 
  display: flex; 
  gap: 4px; 
  padding: 8px; 
  background: #2d2d2d; 
  overflow-x: auto; 
  border-bottom: 1px solid #333; 
}

.t-btn { 
  background: #3c3c3c; 
  color: #ccc; 
  border: 1px solid #444; 
  padding: 4px 10px; 
  border-radius: 3px; 
  font-family: monospace; 
  cursor: pointer;
}

.t-btn:hover {
  background: #4a4a4a;
  border-color: #555;
}
</style>