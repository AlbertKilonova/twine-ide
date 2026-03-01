<template>
  <div class="editor-container">
    <div class="line-numbers" ref="lineNumsRef">
      <div v-for="n in lineCount" :key="n" class="ln-item">{{ n }}</div>
    </div>

    <div class="editor-scroll-area" ref="scrollBoxRef" @scroll="syncScroll">
      <div class="editor-content-wrapper">
        <div class="highlighter-layer">
          <div v-for="(line, idx) in editorLines" :key="idx" 
               :class="['line-text', { 'header-highlight': line.startsWith('::') }]">
            {{ line }}&nbsp;
          </div>
        </div>
        <textarea 
          ref="textareaRef"
          :value="modelValue" 
          class="real-textarea" 
          spellcheck="false"
          wrap="off"
          @input="handleInput"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue', 'input']);

const textareaRef = ref(null);
const scrollBoxRef = ref(null);
const lineNumsRef = ref(null);

// 计算行数
const editorLines = computed(() => props.modelValue?.split('\n') || []);
const lineCount = computed(() => editorLines.value.length || 1);

// 同步滚动
const syncScroll = () => {
  if (scrollBoxRef.value && lineNumsRef.value) {
    lineNumsRef.value.scrollTop = scrollBoxRef.value.scrollTop;
  }
};

// 处理输入
const handleInput = (e) => {
  emit('update:modelValue', e.target.value);
  setTimeout(() => {
    el.focus();
    const newPos = start + str.length;
    el.setSelectionRange(newPos, newPos);
    
    // 触发外部可能需要的同步逻辑
    emit('input');
  }, 0);
};

// 暴露插入文字的能力给波波用
const insertText = (str) => {
  const el = textareaRef.value;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const val = props.modelValue || '';
  const newVal = val.slice(0, start) + str + val.slice(end);
  
  emit('update:modelValue', newVal);
  // 必须要在 DOM 更新后触发同步逻辑
  setTimeout(() => emit('input'), 0);
};

defineExpose({ insertText });
</script>

<style scoped>
.editor-container { flex: 1; display: flex; overflow: hidden; position: relative; font-family: 'Fira Code', monospace; }
.line-numbers { width: 45px; background: #1e1e1e; color: #858585; text-align: right; padding: 10px 10px 10px 0; font-size: 12px; line-height: 22px; user-select: none; border-right: 1px solid #333; overflow: hidden; }
.editor-scroll-area { flex: 1; overflow: auto; position: relative; }
.editor-content-wrapper { min-width: 100%; display: inline-block; position: relative; min-height: 100%; }
.real-textarea, .highlighter-layer { 
  width: 100%; height: 100%; padding: 10px; border: none; outline: none; 
  font-size: 14px; line-height: 22px; font-family: inherit; white-space: pre; 
  overflow: hidden; box-sizing: border-box; display: block;
}
.real-textarea { position: absolute; top: 0; left: 0; background: transparent; color: transparent; caret-color: #aeafad; resize: none; z-index: 2; }
.highlighter-layer { position: relative; background: #1e1e1e; color: #d4d4d4; z-index: 1; pointer-events: none; }
.header-highlight { color: #569cd6; font-weight: bold; }
.ln-item { height: 22px; }
</style>