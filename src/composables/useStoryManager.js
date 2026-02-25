import { showToast, showConfirmDialog } from 'vant';

export function useStoryManager(stories, allPassages, currentStoryId, currentFileId, db) {
  
  // 基础同步逻辑 (原 handleUpdateItem)
  const handleUpdateItem = async (item) => {
    if (!item || !item.id) return;
    try {
      const plainItem = JSON.parse(JSON.stringify(item));
      await db.put('passages', plainItem);
      const idx = allPassages.value.findIndex(p => p.id === item.id);
      if (idx !== -1) {
        const newArray = [...allPassages.value];
        newArray[idx] = plainItem;
        allPassages.value = newArray;
      }
    } catch (err) {
      console.error("数据同步失败：", err);
    }
  };
  
  // 文件夹相关逻辑
  const handleAddFolder = (currentStory) => {
    const n = prompt("新建一个文件夹");
    if (n && currentStory) {
      if (!currentStory.folders) currentStory.folders = [];
      currentStory.folders.push(n);
      db.put('stories', JSON.parse(JSON.stringify(currentStory)));
    }
  };

  const handleRenameFolder = (old, currentStory) => {
    const n = prompt("文件夹重命名", old);
    if (n && n !== old && currentStory) {
      const idx = currentStory.folders.indexOf(old);
      if (idx > -1) currentStory.folders[idx] = n;
      allPassages.value.forEach(p => { 
        if (p.storyId === currentStoryId.value && p.folder === old) { 
          p.folder = n; 
          handleUpdateItem(p); 
        } 
      });
      db.put('stories', JSON.parse(JSON.stringify(currentStory)));
    }
  };

  const handleDeleteFolder = (n, currentStory) => {
    showConfirmDialog({ message: '要拆掉这个文件夹吗？波会帮你把里面的片段搬出来，波好。' }).then(() => {
      if (!currentStory) return;
      currentStory.folders = currentStory.folders.filter(f => f !== n);
      allPassages.value.forEach(p => { 
        if (p.storyId === currentStoryId.value && p.folder === n) { 
          p.folder = null; 
          handleUpdateItem(p); 
        } 
      });
      db.put('stories', JSON.parse(JSON.stringify(currentStory)));
    });
  };

  // 段落/故事选择 (handleSelect)
  const handleSelect = (id, viewMode) => {
    if (viewMode === 'stories') {
      currentStoryId.value = id;
      const currentStoryFiles = allPassages.value.filter(p => p.storyId === id);
      const first = currentStoryFiles[0];
      if (first) currentFileId.value = first.id;
      return 'files'; 
    } else {
      currentFileId.value = id;
      return null;
    }
  };

  // 添加逻辑 (handleAdd)
  const handleAdd = (viewMode, currentStoryFiles, generateUUID) => {
    const isStory = viewMode === 'stories';
    const name = prompt(isStory ? "故事名？" : "段落名？");
    if (!name) return;
    if (isStory) {
      const s = { id: Date.now().toString(), name, folders: [], ifid: generateUUID() };
      stories.value.push(s);
      db.put('stories', JSON.parse(JSON.stringify(s)));
    } else {
      if (!currentStoryId.value) return;
      const p = { 
        id: Date.now().toString(), 
        storyId: currentStoryId.value, 
        name, 
        folder: null, 
        content: `:: ${name}\n`, 
        isStart: currentStoryFiles.length === 0 
      };
      allPassages.value.push(p);
      currentFileId.value = p.id;
      handleUpdateItem(p);
    }
  };

  // 重命名逻辑
  const handleRenameItem = (id) => {
    const item = allPassages.value.find(p => p.id === id);
    const n = prompt("输入新片段名", item?.name);
    if (n && n !== item.name) {
      item.name = n;
      const lines = item.content.split('\n');
      if (lines[0].startsWith('::')) {
        lines[0] = lines[0].replace(/^::\s*([^\[\{]+)/, `:: ${n} `);
        item.content = lines.join('\n');
      }
      handleUpdateItem(item);
    }
  };

  const handleRenameStory = (id) => {
    const s = stories.value.find(x => x.id === id);
    const n = prompt("输入新故事名", s?.name);
    if (n) { s.name = n; db.put('stories', JSON.parse(JSON.stringify(s))); }
  };

  // 删除逻辑
  const handleDeleteItem = (id) => {
    showConfirmDialog({ message: '真的要删除吗，波看你写的好棒哦' }).then(() => {
      allPassages.value = allPassages.value.filter(p => p.id !== id);
      db.delete('passages', id);
      if (currentFileId.value === id) currentFileId.value = null;
    });
  };

  const handleDeleteStory = (id) => {
    showConfirmDialog({ message: '真的要删掉整个故事吗，想清楚哦' }).then(() => {
      allPassages.value = allPassages.value.filter(p => p.storyId !== id);
      stories.value = stories.value.filter(s => s.id !== id);
      db.delete('stories', id);
      if (currentStoryId.value === id) currentStoryId.value = null;
    });
  };

  // 设置起点
  const handleSetStart = (id) => {
    allPassages.value.forEach(p => { 
      if (p.storyId === currentStoryId.value) { 
        p.isStart = (p.id === id); 
        handleUpdateItem(p); 
      } 
    });
  };

  // return 所有的函数
  return {
    handleUpdateItem,
    handleSelect,
    handleAdd,
    handleRenameItem,
    handleRenameStory,
    handleDeleteItem,
    handleDeleteStory,
    handleSetStart,
    handleAddFolder,
    handleRenameFolder,
    handleDeleteFolder
  };
}
