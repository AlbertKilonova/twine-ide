import { showToast, showConfirmDialog } from 'vant';
import * as utils from '../utils/tweeUtils';
import { usePersistence } from './usePersistence';

export function useStoryManager(stories, allPassages, currentStoryId, currentFileId, db) {
  
  const { 
    syncPassage, 
    syncStory, 
    syncMultiplePassages, 
    cascadeDeleteStory, 
    removePassage 
  } = usePersistence(db, stories, allPassages);

  // --- 内部辅助：确保内容有首行 (防丢失兜底) ---
  const _ensureContentHeader = (item) => {
    if (!item.content || !item.content.trim().startsWith('::')) {
      const tagStr = (item.tags && item.tags.length > 0) ? ` [${item.tags.join(' ')}]` : '';
      const header = `:: ${utils.escapeHeader(item.name)}${tagStr}\n`;
      item.content = header + (item.content || '');
    }
    return item;
  };

  // --- 基础选择 ---
  const handleSelect = (id, type) => {
    if (type === 'story') {
      currentStoryId.value = id;
      currentFileId.value = null;
    } else {
      currentFileId.value = id;
      // 切换瞬间检查一次，防止因为旧数据导致不显示
      const item = allPassages.value.find(p => p.id === id);
      if (item) {
        _ensureContentHeader(item);
        syncPassage(item);
      }
    }
  };

  // --- 新增逻辑 ---
  const handleAdd = (viewMode, currentStoryFiles) => {
    if (viewMode === 'stories') {
      const name = utils.unusedName("新故事", stories.value.map(s => s.name));
      const s = { 
        id: Date.now().toString(), 
        name, 
        folders: [], 
        ifid: utils.generateUUID(), 
        format: "SugarCube", 
        zoom: 1 
      };
      stories.value.push(s);
      syncStory(s);
      showToast('新故事创建成功喵！');
    } else {
      const name = utils.unusedName("新片段", currentStoryFiles.map(p => p.name));
      const p = { 
        id: Date.now().toString(), 
        storyId: currentStoryId.value, 
        name, 
        folder: null, 
        // 初始内容一定要带换行，给波波留好写字的地方
        content: `:: ${utils.escapeHeader(name)}\n\n在这里写下故事吧波！`, 
        isStart: currentStoryFiles.length === 0, 
        tags: [] 
      };
      allPassages.value.push(p);
      currentFileId.value = p.id;
      syncPassage(p);
    }
  };

  // --- 重命名逻辑 ---
  const handleRenameItem = (id) => {
    const item = allPassages.value.find(p => p.id === id);
    const n = prompt("输入新片段名", item?.name);
    if (n && n !== item.name) {
      const existing = allPassages.value
        .filter(p => p.storyId === item.storyId && p.id !== id)
        .map(p => p.name);
      item.name = utils.unusedName(n, existing);
      
      const lines = item.content.split('\n');
      const { tags } = utils.parseHeader(lines[0].startsWith('::') ? lines[0] : `:: ${item.name}`);
      lines[0] = utils.buildHeader(item.name, tags);
      item.content = lines.join('\n');
      syncPassage(item);
    }
  };

  const handleRenameStory = (id) => {
    const s = stories.value.find(x => x.id === id);
    const n = prompt("输入新故事名", s?.name);
    if (n && n !== s.name) {
      const existing = stories.value.filter(x => x.id !== id).map(x => x.name);
      s.name = utils.unusedName(n, existing);
      syncStory(s);
    }
  };

  // --- 删除逻辑 ---
  const handleDeleteItem = (id) => {
    showConfirmDialog({ message: '真的要删除这个片段吗波？' }).then(() => {
      removePassage(id);
      if (currentFileId.value === id) currentFileId.value = null;
      showToast('删掉啦');
    }).catch(() => {});
  };

  const handleDeleteStory = (id) => {
    showConfirmDialog({ message: '要删掉整个故事吗？想清楚哦！' }).then(() => {
      cascadeDeleteStory(id);
      if (currentStoryId.value === id) currentStoryId.value = null;
      showToast('故事已销毁');
    }).catch(() => {});
  };

  // --- 文件夹逻辑 ---
  const handleAddFolder = (currentStory) => {
    const n = prompt("新建一个文件夹");
    if (n && currentStory) {
      if (!currentStory.folders) currentStory.folders = [];
      currentStory.folders.push(n);
      syncStory(currentStory);
    }
  };

  const handleRenameFolder = (oldName, currentStory) => {
    const n = prompt("文件夹重命名", oldName);
    if (n && n !== oldName && currentStory) {
      const idx = currentStory.folders.indexOf(oldName);
      if (idx > -1) {
        currentStory.folders[idx] = n;
        allPassages.value.forEach(p => {
          if (p.storyId === currentStory.id && p.folder === oldName) {
            p.folder = n;
            syncPassage(p);
          }
        });
        syncStory(currentStory);
      }
    }
  };

  const handleDeleteFolder = (folderName, currentStory) => {
    showConfirmDialog({ message: '要删除文件夹吗？里面的片段会变回未分类哦。' }).then(() => {
      if (currentStory && currentStory.folders) {
        currentStory.folders = currentStory.folders.filter(f => f !== folderName);
        allPassages.value.forEach(p => {
          if (p.storyId === currentStory.id && p.folder === folderName) {
            p.folder = null;
            syncPassage(p);
          }
        });
        syncStory(currentStory);
      }
    }).catch(() => {});
  };

  // --- 设置起点 ---
  const handleSetStart = async (id, storyId) => {
    const storyPassages = allPassages.value
      .filter(p => p.storyId === storyId)
      .map(p => {
        const updated = { ...p, isStart: p.id === id };
        return _ensureContentHeader(updated); // 设置起点时也顺便修复一下首行
      });

    try {
      await syncMultiplePassages(storyPassages);
      showToast('起点已经插好旗子啦！');
    } catch (err) {
      console.error("设置起点失败喵:", err);
      showToast('设置失败了 xwx');
    }
  };

  return { 
    handleUpdateItem: syncPassage,
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
