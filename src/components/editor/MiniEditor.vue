<template>
  <div class="mini-cm-wrapper" ref="editorHost"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { keymap, lineNumbers } from "@codemirror/view"; // 引入行号波
import { Compartment } from "@codemirror/state"; // 用于动态更新设置喵

const props = defineProps(['modelValue', 'settings']); // 接收波波的设置
const emit = defineEmits(['update:modelValue', 'change']);
const editorHost = ref(null);
let view = null;

// 创建两个隔间，用来动态开关换行和行号波
const lineWrappingComp = new Compartment();
const relativeLineNumbersComp = new Compartment();

const getExtensions = () => [
  basicSetup,
  javascript(),
  autocompletion({ activateOnTyping: true }),
  keymap.of(completionKeymap),
  oneDark,
  // 动态配置自动换行喵
  lineWrappingComp.of(props.settings?.lineWrapping ? EditorView.lineWrapping : []),
  // 动态配置行号波 (CM6 原生不支持相对行号，我们先开起基础行号，波波如果主编辑器用了特殊插件，阿波下次再补波)
  lineNumbers(), 
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const newValue = update.state.doc.toString();
      if (newValue !== props.modelValue) {
        emit('update:modelValue', newValue);
        emit('change', newValue);
      }
    }
  }),
  EditorView.theme({
    "&": { height: "auto", minHeight: "80px", fontSize: "12px", background: "#1e1e1e" },
    "&.cm-focused": { outline: "1px solid #007acc" },
    ".cm-gutters": { background: "#1e1e1e", border: "none", color: "#6e7681" }
  })
];

onMounted(() => {
  view = new EditorView({
    doc: props.modelValue || "",
    extensions: getExtensions(),
    parent: editorHost.value
  });
});

// 监听设置变化，实时同步波波的操作波！
watch(() => props.settings, (newSettings) => {
  if (!view) return;
  view.dispatch({
    effects: [
      lineWrappingComp.reconfigure(newSettings?.lineWrapping ? EditorView.lineWrapping : []),
    ]
  });
}, { deep: true });

watch(() => props.modelValue, (newVal) => {
  if (!view) return;
  const currentVal = view.state.doc.toString();
  if (newVal !== currentVal) {
    view.dispatch({ changes: { from: 0, to: currentVal.length, insert: newVal || "" } });
  }
});

onBeforeUnmount(() => { if (view) view.destroy(); });
</script>

<style scoped>
.mini-cm-wrapper {
  border: 1px solid #3c3c3c;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 5px;
}
</style>