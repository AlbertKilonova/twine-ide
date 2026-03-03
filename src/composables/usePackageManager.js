import { ref } from 'vue';

export function usePackageManager(packageRepo) {
  const packages = ref([]);
  const searchResults = ref([]);

  const loadPackages = async (storyId) => {
    if (!storyId) {
      packages.value = [];
      return;
    }
    packages.value = await packageRepo.getByStoryId(storyId);
  };

  const searchPackage = async (query) => {
    if (!query || query.trim() === '') {
      searchResults.value = [];
      return;
    }
    
    try {
      // 改用 cdnjs 搜索前端直接可用的包，避免搜出太多 node.js 的纯工具库
      const response = await fetch(`https://api.cdnjs.com/libraries?search=${encodeURIComponent(query)}&fields=version,description,latest&limit=15`);
      const data = await response.json();
      
      searchResults.value = data.results.map(obj => ({
        name: obj.name,
        version: obj.version,
        description: obj.description || '',
        url: obj.latest
      }));
    } catch (error) {
      console.error('搜索包失败:', error);
      searchResults.value = [];
    }
  };

  const downloadPackage = async (pkgName, version = 'latest', customUrl = null) => {
    try {
      const url = customUrl || `https://unpkg.com/${pkgName}@${version}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }
      
      const content = await response.text();
      const contentType = response.headers.get('content-type') || '';
      
      let fileType = 'js';
      if (contentType.includes('css') || url.endsWith('.css')) {
        fileType = 'css';
      }
      
      return {
        content,
        fileType,
        url
      };
    } catch (error) {
      console.error('下载包失败:', error);
      throw error;
    }
  };

  const installPackage = async (pkgName, version, storyId, inlineMode = true, customUrl = null) => {
    if (!storyId) return;

    const duplicate = packages.value.find(p => p.name === pkgName && p.storyId === storyId);
    if (duplicate) {
      throw new Error(`已安装 ${pkgName} 了喵！`);
    }

    const { content, fileType, url } = await downloadPackage(pkgName, version, customUrl);

    const pkgData = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      storyId,
      name: pkgName,
      version,
      fileType,
      url,
      content: inlineMode ? content : '',
      inlineMode,
      order: Date.now(),
      createdAt: Date.now()
    };

    await packageRepo.save(pkgData);
    packages.value.push(pkgData);

    return pkgData;
  };

  const removePackage = async (id) => {
    await packageRepo.delete(id);
    packages.value = packages.value.filter(p => p.id !== id);
  };

  const movePackage = async (id, direction) => {
    const index = packages.value.findIndex(p => p.id === id);
    if (index === -1) return;

    // 确保所有包都有 order
    for (let i = 0; i < packages.value.length; i++) {
      if (packages.value[i].order === undefined) {
        packages.value[i].order = packages.value[i].createdAt;
      }
    }

    if (direction === 'up' && index > 0) {
      const current = packages.value[index];
      const prev = packages.value[index - 1];

      const tempOrder = current.order;
      current.order = prev.order;
      prev.order = tempOrder;

      await packageRepo.save(current);
      await packageRepo.save(prev);

      packages.value.splice(index - 1, 2, current, prev);
    } else if (direction === 'down' && index < packages.value.length - 1) {
      const current = packages.value[index];
      const next = packages.value[index + 1];

      const tempOrder = current.order;
      current.order = next.order;
      next.order = tempOrder;

      await packageRepo.save(current);
      await packageRepo.save(next);

      packages.value.splice(index, 2, next, current);
    }
  };

  const toggleInlineMode = async (id) => {
    const pkg = await packageRepo.getById(id);
    if (!pkg) return;

    pkg.inlineMode = !pkg.inlineMode;

    if (pkg.inlineMode && !pkg.content) {
      const { content } = await downloadPackage(pkg.name, pkg.version);
      pkg.content = content;
    }

    await packageRepo.save(pkg);

    const idx = packages.value.findIndex(p => p.id === id);
    if (idx !== -1) {
      packages.value[idx] = pkg;
    }
  };

  const importFromFile = async (file, storyId, syncAsset) => {
    if (!storyId) return;

    // 1. 先上传文件到 assets（供其他资源引用）
    if (syncAsset) {
      await syncAsset(file, storyId);
    }

    // 2. 读取文件内容用于内联注入
    const content = await file.text();
    const fileName = file.name;
    const fileType = fileName.endsWith('.css') ? 'css' : 'js';

    // 从文件名提取包名（去掉扩展名和版本号）
    const pkgName = fileName
      .replace(/\.(js|css)$/i, '')
      .replace(/[-._](\d+\.\d+(\.\d+)?)/g, '')
      .replace(/\.(min|bundle|production|development)$/gi, '');

    // 3. 创建包记录，使用内联模式直接注入
    const pkgData = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      storyId,
      name: pkgName || fileName,
      version: 'local',
      fileType,
      url: `assets/${fileName}`,
      content,  // 存储文件内容用于内联注入
      inlineMode: true,  // 使用内联模式，像其他脚本一样注入
      order: Date.now(),
      createdAt: Date.now()
    };

    await packageRepo.save(pkgData);
    packages.value.push(pkgData);

    return pkgData;
  };

  const importFromUrl = async (url, storyId, assets) => {
    if (!storyId) return;

    // 判断是本地路径还是远程URL
    const isRemote = url.startsWith('http://') || url.startsWith('https://');
    const isLocalAssets = url.startsWith('assets/');
    const fileType = url.endsWith('.css') ? 'css' : 'js';

    let content = '';
    let pkgName = '';

    if (isLocalAssets) {
      // 本地 assets 路径：检查文件是否存在
      const fileName = url.replace('assets/', '');
      const assetExists = assets && assets.value && assets.value.some(a => a.name === fileName);

      if (!assetExists) {
        throw new Error(`文件 ${fileName} 不存在于 assets 中，请先上传喵！`);
      }

      pkgName = fileName.replace(/\.(js|css)$/i, '');
    } else if (isRemote) {
      // 远程URL：下载内容
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`下载失败: ${response.statusText}`);
        }
        content = await response.text();
      } catch (error) {
        console.error('下载包失败:', error);
        throw error;
      }

      // 从URL提取包名
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      pkgName = fileName
        .replace(/\.(js|css)$/i, '')
        .replace(/[-._](\d+\.\d+(\.\d+)?)/g, '')
        .replace(/\.(min|bundle|production|development)$/gi, '');
    } else {
      // 其他本地路径
      const pathParts = url.split('/');
      const fileName = pathParts[pathParts.length - 1];
      pkgName = fileName.replace(/\.(js|css)$/i, '');
    }

    const pkgData = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      storyId,
      name: pkgName || 'custom',
      version: isLocalAssets ? 'local' : (isRemote ? 'custom' : 'local'),
      fileType,
      url,
      content: isRemote ? content : '',  // 只有远程URL才存储内容
      inlineMode: isRemote,  // 只有远程URL使用内联模式
      order: Date.now(),
      createdAt: Date.now()
    };

    await packageRepo.save(pkgData);
    packages.value.push(pkgData);

    return pkgData;
  };

  return {
    packages,
    searchResults,
    loadPackages,
    searchPackage,
    installPackage,
    removePackage,
    movePackage,
    toggleInlineMode,
    importFromFile,
    importFromUrl
  };
}
