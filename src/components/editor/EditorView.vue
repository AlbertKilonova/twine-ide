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
import { oneDark } from '@codemirror/theme-one-dark';
import { undo, redo } from '@codemirror/commands';
import { EditorView, lineNumbers } from '@codemirror/view';

// 引入高亮三件套和我们的 Twee 喵
import { twee } from '@/utils/tweeSyntax';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';

const props = defineProps({
  modelValue: String,
  lineWrapping: Boolean,
  relativeLineNumbers: Boolean,
  activeFile: Object,
  stories: Array
});

const emit = defineEmits(['update:modelValue', 'input']);

const code = ref(props.modelValue);
const view = ref(null);

// --- 核心逻辑：变量名一定要统一喵！ ---
const extensions = computed(() => {
  // 我们统一用 exts 这个名字波
  const exts = [
    lineNumbers({
      formatNumber: (line, state) => {
        if (!props.relativeLineNumbers) return line.toString();
        try {
          const cursorLine = state.doc.lineAt(state.selection.main.head).number;
          if (line === cursorLine) return line.toString();
          return Math.abs(line - cursorLine).toString();
        } catch (e) {
          return line.toString();
        }
      }
    }),
    oneDark,
  ];

  const tags = props.activeFile?.tags || [];

  const parentStory = props.stories?.find(s => s.id === props.activeFile?.storyId);
  
  // 2. 优先用故事定义的格式，如果没有（比如新故事），就默认 sugarcube 波
  // 这里的 logic: 如果 parentStory.format 是空的，就给它个保底
  const storyFormat = parentStory?.format || 'twee';
  
  if (tags.includes('script')) {
    // 纯脚本模式波
    exts.push(javascript());
  } else if (tags.includes('stylesheet')) {
    // 纯样式模式波
    exts.push(css());
  } else {
    // 默认的混合模式，用咱们那个全能的 twee() 喵！
    exts.push(twee(storyFormat.toLowerCase()));
  }

  if (props.lineWrapping) {
    exts.push(EditorView.lineWrapping);
  }

  return exts;
});

// --- 基础函数保持不变喵 ---
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
  background: #282c34;
}
:deep(.cm-editor) {
  outline: none !important;
}
:deep(.cm-scroller) {
  font-family: 'Fira Code', 'Consolas', monospace !important;
}
:deep(.cm-header) {
  color: #fac863 !important; /* 暖黄色 */
  font-weight: bold;
  background: rgba(255, 255, 255, 0.05); /* 给标题行加个淡淡的底色，更有存在感喵 */
  display: inline-block;
  width: 100%;
}
:deep(.cm-angleBracket) { color: #56b6c2 !important; } /* 尖括号颜色 */
:deep(.cm-tagName) { color: #e06c75 !important; }      /* 标签名颜色 */
</style>
