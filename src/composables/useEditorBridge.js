import { computed, watch } from 'vue';

export function useEditorBridge(activeFile, handleUpdateItem, unescapeTwee, escapeTwee) {
  
  // 核心：强制检查并生成 :: 首行
  const _ensureHeader = (item) => {
    if (!item || item.content === undefined) return;
    const lines = item.content.split('\n');
    const firstLine = lines[0] || '';
    
    // 如果没有 :: 开头，就给它安一个标准头
    if (!firstLine.trim().startsWith('::')) {
      const tagStr = (item.tags && item.tags.length > 0) 
        ? ` [${item.tags.join(' ')}]` 
        : '';
      // 确保使用传入的转义函数
      const safeName = typeof escapeTwee === 'function' ? escapeTwee(item.name, true) : item.name;
      const correctHeader = `:: ${safeName}${tagStr}`;
      lines.unshift(correctHeader);
      item.content = lines.join('\n');
    }
  };

  // 监听切换：只要波波点击列表，就执行兜底检查
  watch(() => activeFile.value?.id, (newId) => {
    if (newId && activeFile.value) {
      _ensureHeader(activeFile.value);
    }
  }, { immediate: true });

  const syncData = async () => {
    if (!activeFile.value) return;
    
    _ensureHeader(activeFile.value);
    
    const lines = activeFile.value.content.split('\n');
    const firstLine = lines[0];
    
    // 捕获标题名：匹配 :: 后面直到 [ 或 { 或 行尾的内容
    const match = firstLine.match(/^::\s*([^\[\{]+)/);
    if (match && match[1]) {
      const rawName = match[1].trim();
      // 安全调用反转义
      const newName = typeof unescapeTwee === 'function' ? unescapeTwee(rawName, true) : rawName;
      
      if (activeFile.value.name !== newName) {
        activeFile.value.name = newName;
      }
    }
    
    await handleUpdateItem(activeFile.value);
  };

  const currentPassageTags = computed(() => {
    if (!activeFile.value || !activeFile.value.content) return [];
    
    const lines = activeFile.value.content.split('\n');
    const firstLine = lines[0] || '';
    const match = firstLine.match(/\[(.*?)\]/);
    
    if (match && match[1]) {
      const tags = match[1].split(/\s+/).filter(t => t);
      // 重点：在这里增加类型检查，防止 map 崩溃
      return tags.map(tag => {
        if (typeof unescapeTwee === 'function') {
          return unescapeTwee(tag, true);
        }
        return tag;
      });
    }
    return [];
  });

  const updateHeader = (newTags) => {
    if (!activeFile.value) return;
    
    const lines = activeFile.value.content.split('\n');
    const safeName = typeof escapeTwee === 'function' ? escapeTwee(activeFile.value.name, true) : activeFile.value.name;
    
    const tagStr = newTags.length > 0 ? ` [${newTags.join(' ')}]` : '';
    const titlePart = `:: ${safeName}`;
    
    if (lines[0] && lines[0].trim().startsWith('::')) {
      lines[0] = `${titlePart}${tagStr}`;
    } else {
      lines.unshift(`${titlePart}${tagStr}`);
    }
    
    activeFile.value.content = lines.join('\n');
    activeFile.value.tags = newTags;
    
    handleUpdateItem(activeFile.value);
  };

  const addTag = (tagName) => {
    const val = tagName.trim();
    const current = [...currentPassageTags.value];
    if (val && !current.includes(val)) {
      updateHeader([...current, val]);
    }
  };

  const removeTag = (tagName) => {
    updateHeader(currentPassageTags.value.filter(t => t !== tagName));
  };

  return { 
    syncData, 
    currentPassageTags, 
    updateHeader, 
    addTag, 
    removeTag 
  };
}
