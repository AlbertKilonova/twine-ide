import { showToast, showConfirmDialog } from 'vant';
import * as utils from '../utils/tweeUtils';

export function useStoryManager(storyRepo, passageRepo, stories, allPassages, currentStoryId, currentFileId) {

  // --- 内部辅助：确保内容有首行 (防丢失兜底) ---
  const _ensureContentHeader = (item) => {
    if (!item.content || !item.content.trim().startsWith('::')) {
      const tagStr = (item.tags && item.tags.length > 0) ? ` [${item.tags.join(' ')}]` : '';
      const header = `:: ${utils.escapeHeader(item.name)}${tagStr}\n`;
      item.content = header + (item.content || '');
    }
    return item;
  };
  
  const handleUpdateItem = async (item) => {
    if (item.storyId) {
      const saved = await passageRepo.save(item);
      const idx = allPassages.value.findIndex(p => p.id === item.id);
      if (idx !== -1) allPassages.value[idx] = saved;
    } else {
      const saved = await storyRepo.save(item);
      const idx = stories.value.findIndex(s => s.id === item.id);
      if (idx !== -1) stories.value[idx] = saved;
    }
  };

  // --- 基础选择 ---
  const handleSelect = async (id, type) => {
    if (type === 'story') {
      currentStoryId.value = id;
      currentFileId.value = null;

      return 'project';
    } else {
      currentFileId.value = id;
      // 切换瞬间检查一次，防止因为旧数据导致不显示
      const item = allPassages.value.find(p => p.id === id);
      if (item) {
        _ensureContentHeader(item);
        await passageRepo.save(item);
      }
    }
  };

  // --- 新增逻辑 ---
  const handleAdd = async (viewMode, currentStoryFiles) => {
    if (viewMode === 'stories') {
      const name = utils.unusedName("新故事", stories.value.map(s => s.name));
      const s = {
        id: Date.now().toString(),
        name,
        extraMetadata: {},
        folders: [],
        ifid: utils.generateUUID(),
        format: "",
        formatVersion: "",
        zoom: 1
      };
      stories.value.push(s);
      await storyRepo.save(s);
      showToast('新故事创建成功喵！');
    } else {
      const name = utils.unusedName("新片段", currentStoryFiles.map(p => p.name));
      const p = {
        id: Date.now().toString(),
        storyId: currentStoryId.value,
        name,
        folder: null,
        content: `:: ${utils.escapeHeader(name)}\n\n在这里写下故事吧！`,
        isStart: currentStoryFiles.length === 0,
        tags: []
      };
      allPassages.value.push(p);
      currentFileId.value = p.id;
      await passageRepo.save(p);
      showToast('新片段创建成功喵！');
    }
  };

  // --- 新建故事（带格式） ---
  const handleAddStory = async ({ name, format, formatVersion } = {}) => {
    const finalName = utils.unusedName(name || '新故事', stories.value.map(s => s.name));
    const s = {
      id: Date.now().toString(),
      name: finalName,
      extraMetadata: {},
      folders: [],
      ifid: utils.generateUUID(),
      format: format || '',
      formatVersion: formatVersion || '',
      zoom: 1
    };
    stories.value.push(s);
    currentStoryId.value = s.id;
    currentFileId.value = null;
    await storyRepo.save(s);
    showToast('新故事创建成功喵！');
  };

  // --- 重命名逻辑 ---
  const handleRenameItem = async (id) => {
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
      await passageRepo.save(item);
    }
  };

  const handleRenameStory = async (id) => {
    const s = stories.value.find(x => x.id === id);
    const n = prompt("输入新故事名", s?.name);
    if (n && n !== s.name) {
      const existing = stories.value.filter(x => x.id !== id).map(x => x.name);
      s.name = utils.unusedName(n, existing);
      await storyRepo.save(s);
    }
  };

  // --- 删除逻辑 ---
  const handleDeleteItem = async (id) => {
    showConfirmDialog({ message: '真的要删除这个片段吗？' }).then(async () => {
      await passageRepo.delete(id);
      allPassages.value = allPassages.value.filter(p => p.id !== id);
      if (currentFileId.value === id) currentFileId.value = null;
      showToast('删掉啦');
    }).catch(() => {});
  };

  const handleDeleteStory = async (id) => {
    showConfirmDialog({ message: '要删掉整个故事吗？想清楚哦！' }).then(async () => {
      await storyRepo.delete(id);
      stories.value = stories.value.filter(s => s.id !== id);

      // 级联删除段落
      const passagesToDelete = allPassages.value.filter(p => p.storyId === id);
      for (const p of passagesToDelete) {
        await passageRepo.delete(p.id);
      }
      allPassages.value = allPassages.value.filter(p => p.storyId !== id);

      if (currentStoryId.value === id) currentStoryId.value = null;
      showToast('故事已销毁');
    }).catch(() => {});
  };

  // --- 文件夹逻辑 ---
  const handleAddFolder = async (currentStory) => {
    const n = prompt("新建文件夹");
    if (n && currentStory) {
      if (!currentStory.folders) currentStory.folders = [];
      currentStory.folders.push(n);
      await storyRepo.save(currentStory);
    }
  };

  const handleRenameFolder = async (oldName, currentStory) => {
    const n = prompt("文件夹重命名", oldName);
    if (n && n !== oldName && currentStory) {
      const idx = currentStory.folders.indexOf(oldName);
      if (idx > -1) {
        currentStory.folders[idx] = n;
        const passagesToUpdate = allPassages.value.filter(p => p.storyId === currentStory.id && p.folder === oldName);
        for (const p of passagesToUpdate) {
          p.folder = n;
          await passageRepo.save(p);
        }
        await storyRepo.save(currentStory);
      }
    }
  };

  const handleDeleteFolder = async (folderName, currentStory) => {
    showConfirmDialog({ message: '要删除文件夹吗？里面的片段会被拆到未分类里哦。' }).then(async () => {
      if (currentStory && currentStory.folders) {
        currentStory.folders = currentStory.folders.filter(f => f !== folderName);
        const passagesToUpdate = allPassages.value.filter(p => p.storyId === currentStory.id && p.folder === folderName);
        for (const p of passagesToUpdate) {
          p.folder = null;
          await passageRepo.save(p);
        }
        await storyRepo.save(currentStory);
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
      await passageRepo.saveMany(storyPassages);
    } catch (err) {
      console.error("设置起点失败喵:", err);
      showToast('起点设置失败了 xwx');
    }
  };

  return { 
    handleUpdateItem,
    handleSelect,
    handleAdd,
    handleAddStory,
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
