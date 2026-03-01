<template>
  <div class="editor-container">
    <codemirror
      v-model="code"
      :style="{ height: '100%', width: '100%' }"
      :autofocus="true"
      :indent-with-tab="true"
      :tab-size="2"
      :extensions="extensions"
      @ready="handleReady"
      @change="onCodeChange"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { undo, redo } from '@codemirror/commands';
import { EditorView, lineNumbers } from '@codemirror/view'; // 合并引入喵

// 1. Props 接收设置
const props = defineProps({
  modelValue: String,
  lineWrapping: Boolean,
  relativeLineNumbers: Boolean
});

const emit = defineEmits(['update:modelValue', 'input']);

const code = ref(props.modelValue);
const view = ref(null);

// --- 2. 核心逻辑：合并所有扩展配置 ---
const extensions = computed(() => {
  const exts = [
    // 动态行号配置喵
    lineNumbers({
      formatNumber: (line, state) => {
        if (!props.relativeLineNumbers) return line.toString();
        
        // 计算相对行号：当前行显示绝对值，其他显示差值
        try {
          const cursorLine = state.doc.lineAt(state.selection.main.head).number;
          if (line === cursorLine) return line.toString();
          return Math.abs(line - cursorLine).toString();
        } catch (e) {
          return line.toString();
        }
      }
    }),
    markdown(),
    oneDark,
  ];

  // 自动换行开关
  if (props.lineWrapping) {
    exts.push(EditorView.lineWrapping);
  }

  return exts;
});

// --- 3. 基础函数 ---

watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal;
  }
});

const handleReady = (payload) => {
  view.value = payload.view;
};

const onCodeChange = (val) => {
  emit('update:modelValue', val);
  emit('input'); 
};

const handleUndo = () => view.value && undo(view.value);
const handleRedo = () => view.value && redo(view.value);

const insertText = (text) => {
  if (!view.value) return;
  const { state } = view.value;
  const range = state.selection.main;
  view.value.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: { anchor: range.from + text.length },
    scrollIntoView: true
  });
  view.value.focus();
};

defineExpose({ insertText, undo: handleUndo, redo: handleRedo });
</script>

<style scoped>
.editor-container {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #282c34; /* One Dark 背景色 */
}
/* 深度调整 CM6 的内部样式，让它更契合 VSCode 风格喵 */
:deep(.cm-editor) {
  outline: none !important;
}
:deep(.cm-scroller) {
  font-family: 'Fira Code', 'Consolas', monospace !important;
}
</style>
