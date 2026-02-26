export function usePersistence(db, stories, allPassages) {
  
  // 同步片段到数据库和响应式数组
  const syncPassage = async (item) => {
    if (!item || !item.id) return;
    const plain = JSON.parse(JSON.stringify(item));
    await db.put('passages', plain);
    const idx = allPassages.value.findIndex(p => p.id === item.id);
    if (idx !== -1) {
      const newArr = [...allPassages.value];
      newArr[idx] = plain;
      allPassages.value = newArr;
    }
  };

  // 同步故事到数据库和响应式数组
  const syncStory = async (story) => {
    if (!story || !story.id) return;
    const plain = JSON.parse(JSON.stringify(story));
    await db.put('stories', plain);
    const idx = stories.value.findIndex(s => s.id === story.id);
    if (idx !== -1) {
      const newArr = [...stories.value];
      newArr[idx] = plain;
      stories.value = newArr;
    }
  };

  // 级联删除：删除故事及其所有片段
  const cascadeDeleteStory = async (storyId) => {
    await db.delete('stories', storyId);
    stories.value = stories.value.filter(s => s.id !== storyId);
    
    // 找出所有属于该故事的片段并删除
    const toDelete = allPassages.value.filter(p => p.storyId === storyId);
    for (const p of toDelete) {
      await db.delete('passages', p.id);
    }
    allPassages.value = allPassages.value.filter(p => p.storyId !== storyId);
  };

  // 删除单个片段
  const removePassage = async (id) => {
    await db.delete('passages', id);
    allPassages.value = allPassages.value.filter(p => p.id !== id);
  };
  
  const syncMultiplePassages = async (items) => {
    for (const item of items) {
      // 必须 JSON 化，否则 IndexedDB 可能会因为 Proxy 对象报错
      const plain = JSON.parse(JSON.stringify(item));
      await db.put('passages', plain);
    }
    
    // 关键：通过 map 创建一个全新的对象数组，强制 Vue 触发深度更新
    allPassages.value = allPassages.value.map(p => {
      const updated = items.find(item => item.id === p.id);
      return updated ? JSON.parse(JSON.stringify(updated)) : p;
    });
  };

  return { syncPassage, syncStory, cascadeDeleteStory, removePassage, syncMultiplePassages };
}
