import { computed } from 'vue';

export function useEditorBridge(activeFile, handleUpdateItem) {
  
  // 1. 同步标题和数据 (syncData)
  const syncData = async () => {
    if (!activeFile.value) return;
    const lines = activeFile.value.content.split('\n');
    const firstLine = lines[0];
    
    // 匹配 :: 后的标题部分，不包括 [标签] 和 {元数据}
    const match = firstLine.match(/^::\s*([^\[\{]+)/);
    if (match) {
      activeFile.value.name = match[1].trim();
    }
    await handleUpdateItem(activeFile.value);
  };

  // 2. 获取当前片段的标签
  const currentPassageTags = computed(() => {
    if (!activeFile.value) return [];
    const firstLine = activeFile.value.content.split('\n')[0];
    const match = firstLine.match(/\[(.*?)\]/);
    return match ? match[1].split(' ').filter(t => t) : [];
  });

  // 3. 更新头部整行内容 (updateHeader)
  const updateHeader = (newTags) => {
    if (!activeFile.value) return;
    const lines = activeFile.value.content.split('\n');
    const tagStr = newTags.length > 0 ? ` [${newTags.join(' ')}]` : '';
    
    // 提取旧的标题部分和元数据部分
    const titlePart = lines[0].match(/^::\s*([^\[\{]+)/)?.[0].trimEnd() || ':: NewPassage';
    const metaPart = lines[0].match(/\{.*\}$/)?.[0] || '';
    
    // 拼接成新的一行
    lines[0] = `${titlePart}${tagStr} ${metaPart}`.replace(/\s+/g, ' ').trimEnd();
    activeFile.value.content = lines.join('\n');
    syncData();
  };

  // 4. 添加标签
  const addTag = (tagName) => {
    const val = tagName.trim();
    const current = currentPassageTags.value;
    if (val && !current.includes(val)) {
      updateHeader([...current, val]);
    }
  };

  // 5. 删除标签
  const removeTag = (tagName) => {
    updateHeader(currentPassageTags.value.filter(t => t !== tagName));
  };

  return {
    syncData,
    currentPassageTags,
    addTag,
    removeTag
  };
}