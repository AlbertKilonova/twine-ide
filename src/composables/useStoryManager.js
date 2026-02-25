import { showToast, showConfirmDialog } from 'vant';

export function useStoryManager(stories, allPassages, currentStoryId, currentFileId, db, utils) {
  
  // --- 基础工具：获取不重复的名称 ---
  const unusedName = (name, existing) => {
    if (!existing.includes(name)) return name;
    let suffix = 1;
    while (existing.includes(`${name} ${suffix}`)) { suffix++; }
    return `${name} ${suffix}`;
  };

  // --- 1. 基础同步逻辑 (handleUpdateItem) ---
  const handleUpdateItem = async (item) => {
    if (!item || !item.id) return;
    try {
      const plainItem = JSON.parse(JSON.stringify(item));
      await db.put('passages', plainItem);
      const idx = allPassages.value.findIndex(p => p.id === item.id);
      if (idx !== -1) {
        // 使用解构确保 Vue 监听到数组项的变化
        const newArray = [...allPassages.value];
        newArray[idx] = plainItem;
        allPassages.value = newArray;
      }
    } catch (err) {
      console.error("数据同步失败：", err);
    }
  };

  // --- 2. 选择逻辑 (handleSelect) ---
  const handleSelect = (id, type) => {
    if (type === 'story') {
      currentStoryId.value = id;
      currentFileId.value = null; // 切换故事时重置选中的文件
    } else {
      currentFileId.value = id;
    }
  };

  // --- 3. 添加逻辑 (handleAdd) ---
  const handleAdd = (viewMode, currentStoryFiles) => {
    const isStory = viewMode === 'stories';
    const baseName = isStory ? "新故事" : "新片段";
    const existing = isStory ? stories.value.map(s => s.name) : currentStoryFiles.map(p => p.name);
    const name = unusedName(baseName, existing);

    if (isStory) {
      const s = { 
        id: Date.now().toString(), 
        name, 
        folders: [], 
        ifid: utils.generateUUID(),
        format: "SugarCube",
        formatVersion: "2.37.3",
        zoom: 1
      };
      stories.value.push(s);
      db.put('stories', JSON.parse(JSON.stringify(s)));
      showToast('新故事创建成功 awa');
    } else {
      const p = { 
        id: Date.now().toString(), 
        storyId: currentStoryId.value, 
        name, 
        folder: null, 
        content: `:: ${utils.escapeForTweeHeader(name)}\n`, 
        isStart: currentStoryFiles.length === 0, 
        tags: [] 
      };
      allPassages.value.push(p);
      currentFileId.value = p.id;
      db.put('passages', JSON.parse(JSON.stringify(p)));
    }
  };

  // --- 4. 重命名逻辑 (handleRenameItem / Story) ---
  const handleRenameItem = (id) => {
    const item = allPassages.value.find(p => p.id === id);
    const n = prompt("输入新片段名", item?.name);
    if (n && n !== item.name) {
      const existing = allPassages.value
        .filter(p => p.storyId === item.storyId && p.id !== id)
        .map(p => p.name);
      item.name = unusedName(n, existing);
      
      const lines = item.content.split('\n');
      if (lines[0].startsWith('::')) {
        // 保留原有的标签部分 [tags]
        const tagsMatch = lines[0].match(/\[.*?\]/);
        lines[0] = `:: ${utils.escapeForTweeHeader(item.name)}${tagsMatch ? ' ' + tagsMatch[0] : ''}`;
        item.content = lines.join('\n');
      }
      handleUpdateItem(item);
    }
  };

  const handleRenameStory = (id) => {
    const s = stories.value.find(x => x.id === id);
    const n = prompt("输入新故事名", s?.name);
    if (n && n !== s.name) {
      const existing = stories.value.filter(x => x.id !== id).map(x => x.name);
      s.name = unusedName(n, existing);
      db.put('stories', JSON.parse(JSON.stringify(s)));
      showToast('故事重命名成功！');
    }
  };

  // --- 5. 删除逻辑 (handleDeleteItem / Story) ---
  const handleDeleteItem = (id) => {
    showConfirmDialog({ message: '真的要删除这个片段吗波？' }).then(() => {
      allPassages.value = allPassages.value.filter(p => p.id !== id);
      db.delete('passages', id);
      if (currentFileId.value === id) currentFileId.value = null;
      showToast('删掉啦 awa');
    }).catch(() => {});
  };

  const handleDeleteStory = (id) => {
    showConfirmDialog({ message: '要删掉整个故事吗？波写了很久吧，想清楚哦！' }).then(() => {
      allPassages.value = allPassages.value.filter(p => p.storyId !== id);
      stories.value = stories.value.filter(s => s.id !== id);
      db.delete('stories', id);
      if (currentStoryId.value === id) currentStoryId.value = null;
      showToast('整个故事都消失了喵');
    }).catch(() => {});
  };

  // --- 6. 文件夹逻辑 (Add / Rename / Delete) ---
  const handleAddFolder = (currentStory) => {
    const n = prompt("新建一个文件夹");
    if (n && currentStory) {
      if (!currentStory.folders) currentStory.folders = [];
      currentStory.folders.push(n);
      db.put('stories', JSON.parse(JSON.stringify(currentStory)));
    }
  };

  const handleRenameFolder = (oldName, currentStory) => {
    const n = prompt("文件夹重命名", oldName);
    if (n && n !== oldName && currentStory) {
      const idx = currentStory.folders.indexOf(oldName);
      if (idx > -1) {
        currentStory.folders[idx] = n;
        // 同步修改该文件夹下所有片段的 folder 属性
        allPassages.value.forEach(p => {
          if (p.storyId === currentStory.id && p.folder === oldName) {
            p.folder = n;
            db.put('passages', JSON.parse(JSON.stringify(p)));
          }
        });
        db.put('stories', JSON.parse(JSON.stringify(currentStory)));
        showToast('文件夹改名成功！');
      }
    }
  };

  const handleDeleteFolder = (folderName, currentStory) => {
    showConfirmDialog({ message: `确定要删除文件夹 "${folderName}" 吗？里面的片段会变回未分类哦！` }).then(() => {
      if (currentStory && currentStory.folders) {
        currentStory.folders = currentStory.folders.filter(f => f !== folderName);
        allPassages.value.forEach(p => {
          if (p.storyId === currentStory.id && p.folder === folderName) {
            p.folder = null;
            db.put('passages', JSON.parse(JSON.stringify(p)));
          }
        });
        db.put('stories', JSON.parse(JSON.stringify(currentStory)));
        showToast('文件夹已拆除 awa');
      }
    }).catch(() => {});
  };

  // --- 7. 设置起点 (handleSetStart) ---
  const handleSetStart = (id, storyId) => {
    allPassages.value.forEach(p => {
      if (p.storyId === storyId) {
        p.isStart = (p.id === id);
        db.put('passages', JSON.parse(JSON.stringify(p)));
      }
    });
    showToast('起点设置成功！');
  };

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
