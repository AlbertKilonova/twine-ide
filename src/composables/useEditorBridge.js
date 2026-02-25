import { computed } from 'vue';

export function useEditorBridge(activeFile, handleUpdateItem, unescapeTwee, escapeTwee) {
  
  const syncData = async () => {
    if (!activeFile.value) return;
    const lines = activeFile.value.content.split('\n');
    const firstLine = lines[0];
    
    // 提取标题并进行反转义处理
    const match = firstLine.match(/^::\s*([^\[\{]+)/);
    if (match) {
      activeFile.value.name = unescapeTwee(match[1].trim(), true);
    }
    await handleUpdateItem(activeFile.value);
  };

  const currentPassageTags = computed(() => {
    if (!activeFile.value) return [];
    const firstLine = activeFile.value.content.split('\n')[0];
    const match = firstLine.match(/\[(.*?)\]/);
    return match ? match[1].split(/\s+/).filter(t => t) : [];
  });

  const updateHeader = (newTags) => {
    if (!activeFile.value) return;
    const lines = activeFile.value.content.split('\n');
    const tagStr = newTags.length > 0 ? ` [${newTags.join(' ')}]` : '';
    
    // 仅保留标题和标签，彻底无视元数据
    const titlePart = `:: ${escapeTwee(activeFile.value.name, true)}`;
    lines[0] = `${titlePart}${tagStr}`.trim();
    
    activeFile.value.content = lines.join('\n');
    activeFile.value.tags = newTags;
    syncData();
  };

  const addTag = (tagName) => {
    const val = tagName.trim();
    const current = currentPassageTags.value;
    if (val && !current.includes(val)) updateHeader([...current, val]);
  };

  const removeTag = (tagName) => {
    updateHeader(currentPassageTags.value.filter(t => t !== tagName));
  };

  return { syncData, currentPassageTags, addTag, removeTag };
}
