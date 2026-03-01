export function usePersistence(dbRef, stories, allPassages, assets) {
  
  // 辅助函数：不管是 ref 还是 dbIntf，都能温柔解开波
  const getDB = () => {
    if (!dbRef) return null;
    return dbRef.value !== undefined ? dbRef.value : dbRef;
  };

  const syncPassage = async (item) => {
    const db = getDB();
    if (!db || !item?.id) return;
    const plain = JSON.parse(JSON.stringify(item));
    await db.put('passages', plain);
    const idx = allPassages.value.findIndex(p => p.id === item.id);
    if (idx !== -1) allPassages.value[idx] = plain;
  };

  const syncStory = async (story) => {
    const db = getDB();
    if (!db || !story?.id) return;
    const plain = JSON.parse(JSON.stringify(story));
    await db.put('stories', plain);
    const idx = stories.value.findIndex(s => s.id === story.id);
    if (idx !== -1) stories.value[idx] = plain;
  };

  // --- 静态资源管理 (Assets) 私有化增强版喵 ---
  
  // 1. 加载资源时，必须传入 storyId，否则阿波不知道该加载哪家的宝贝波
  const loadAssets = async (storyId) => {
    const db = getDB();
    if (!db || typeof db.getAll !== 'function') return;
    if (!storyId) {
      assets.value = [];
      return;
    }

    const list = await db.getAll('assets');
    
    // 清理旧的 Blob URL，防止内存像气球一样炸掉波
    assets.value.forEach(a => {
      if (a.url) URL.revokeObjectURL(a.url);
    });

    // 关键：在这里进行私有化过滤喵！只留下属于当前故事的资源
    assets.value = list
      .filter(a => a.storyId === storyId)
      .map(a => ({
        ...a,
        url: URL.createObjectURL(a.data)
      }));
  };

  // 2. 上传资源，强制要求绑定 storyId 波
  const syncAsset = async (file, storyId) => {
    const db = getDB();
    if (!db || !storyId) return;
    
    const id = "asset_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    const assetData = {
      id, 
      storyId, // 绑定项目身份证喵
      name: file.name, 
      type: file.type, 
      size: file.size, 
      data: file, 
      createdAt: Date.now()
    };
    
    await db.put('assets', assetData);
    
    // 生成预览地址并推送到当前的响应式列表里喵
    const assetForUI = { ...assetData, url: URL.createObjectURL(file) };
    if (assets) assets.value.push(assetForUI);
    
    return assetForUI;
  };

  const removeAsset = async (id) => {
    const db = getDB();
    if (!db || !assets) return;
    await db.delete('assets', id);
    const idx = assets.value.findIndex(a => a.id === id);
    if (idx !== -1) {
      if (assets.value[idx].url) URL.revokeObjectURL(assets.value[idx].url);
      assets.value.splice(idx, 1);
    }
  };
  
  const renameAsset = async (id, newName) => {
    const db = getDB();
    if (!db || !assets) return;
    
    // 从数据库里捞出来喵
    const assetData = await db.get('assets', id);
    if (assetData) {
      assetData.name = newName;
      await db.put('assets', assetData); // 把改好名字的塞回去波
    }

    // 也要更新界面上的列表喵，这样 @{文件名} 引用才能即时刷新
    const idx = assets.value.findIndex(a => a.id === id);
    if (idx !== -1) {
      assets.value[idx].name = newName;
    }
  };

  // --- 其他逻辑 ---

  const cascadeDeleteStory = async (storyId) => {
    const db = getDB();
    if (!db) return;
    
    // 删故事
    await db.delete('stories', storyId);
    stories.value = stories.value.filter(s => s.id !== storyId);
    
    // 删段落
    const toDeletePassages = allPassages.value.filter(p => p.storyId === storyId);
    for (const p of toDeletePassages) {
      await db.delete('passages', p.id);
    }
    allPassages.value = allPassages.value.filter(p => p.storyId !== storyId);

    // 删资源波！既然项目没了，资源也要一起打包带走喵
    const allAssets = await db.getAll('assets');
    const toDeleteAssets = allAssets.filter(a => a.storyId === storyId);
    for (const a of toDeleteAssets) {
      await db.delete('assets', a.id);
    }
    // assets 列表的清理由 App.vue 切换 storyId 时触发的 loadAssets 负责波
  };

  const removePassage = async (id) => {
    const db = getDB();
    if (!db) return;
    await db.delete('passages', id);
    allPassages.value = allPassages.value.filter(p => p.id !== id);
  };
  
  const syncMultiplePassages = async (items) => {
    const db = getDB();
    if (!db) return;
    
    if (typeof db.transaction !== 'function') {
      console.error("数据库对象里没有 transaction 方法喵！", db);
      return;
    }

    const tx = db.transaction('passages', 'readwrite');
    for (const item of items) {
      await tx.store.put(JSON.parse(JSON.stringify(item)));
    }
    await tx.done;
    
    items.forEach(item => {
      const idx = allPassages.value.findIndex(p => p.id === item.id);
      if (idx !== -1) allPassages.value[idx] = JSON.parse(JSON.stringify(item));
    });
  };

  return { 
    syncPassage, syncStory, cascadeDeleteStory, removePassage, 
    syncMultiplePassages, syncAsset, removeAsset, loadAssets, renameAsset
  };
}
