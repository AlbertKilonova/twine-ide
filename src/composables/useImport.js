import { showLoadingToast, closeToast, showToast } from 'vant';
import JSZip from 'jszip';
import { parseTwee } from '../utils/tweeParser';
import { generateUUID, escapeHeader } from '../utils/tweeUtils';

export function useImport(db, stories, allPassages, assets, packages) {

  const importFile = (onSuccess) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.twee,.tw,.zip,.txt,.html';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showLoadingToast({ message: '导入中...', forbidClick: true });

      try {
        let fTitle = file.name.replace(/\.[^/.]+$/, "");
        let fIfid = generateUUID();
        let fStart = null;
        let ps = [];
        let fRawMeta = {};
        let zipAssets = [];
        let zipFolders = [];
        let zipPackages = [];
        let extraScripts = null;

        if (file.name.endsWith('.html')) {
          const result = await importFromHtml(file, fTitle, fIfid);
          ({ fTitle, fIfid, fStart, ps, fRawMeta } = result);
        } else if (file.name.endsWith('.zip')) {
          const result = await importFromZip(file, fTitle, fIfid);
          ({ fTitle, fIfid, fRawMeta, ps, zipAssets, zipFolders, zipPackages } = result);
          if (result.extraScripts) extraScripts = result.extraScripts;
        } else {
          const result = await importFromTwee(file, fTitle, fIfid);
          ({ fTitle, fIfid, fRawMeta, ps } = result);
        }

        const newS = {
          id: Date.now().toString(),
          name: fTitle,
          folders: zipFolders,
          ifid: fIfid,
          format: fRawMeta.format || "",
          formatVersion: fRawMeta['format-version'] || fRawMeta.formatVersion || "",
          zoom: fRawMeta.zoom || 1,
          extraMetadata: {},
          ...(extraScripts ? { extraScripts } : {})
        };

        await db.put('stories', JSON.parse(JSON.stringify(newS)));
        stories.value.push(newS);

        for (const p of ps) {
          const isStart = p.isStart || (fStart ? p.name === fStart : (p.name === 'Start' || p.name === 'start'));
          const newP = {
            id: (Date.now() + Math.random()).toString(),
            storyId: newS.id,
            name: p.name,
            tags: p.tags || [],
            folder: p.folder || null,
            content: p.content,
            isStart
          };
          await db.put('passages', JSON.parse(JSON.stringify(newP)));
          allPassages.value.push(newP);
        }

        await saveAssets(zipAssets, newS.id);
        await savePackages(zipPackages, newS.id);

        closeToast();
        showToast('导入完成了喵！');
        onSuccess(newS.id);
      } catch (err) {
        console.error(err);
        closeToast();
        showToast('导入失败了喵 xwx');
      }
    };
    input.click();
  };

  const importFromHtml = async (file, fTitle, fIfid) => {
    const htmlText = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const storyData = doc.querySelector('tw-storydata');

    let fStart = null;
    let fRawMeta = {};
    let ps = [];

    if (storyData) {
      fTitle = storyData.getAttribute('name') || fTitle;
      fIfid = storyData.getAttribute('ifid') || fIfid;
      fStart = storyData.getAttribute('startnode');
      fRawMeta = {
        format: storyData.getAttribute('format'),
        'format-version': storyData.getAttribute('format-version'),
        zoom: parseFloat(storyData.getAttribute('zoom')) || 1
      };

      const script = doc.querySelector('[role=script]')?.textContent;
      if (script?.trim()) {
        ps.push({
          name: 'StoryScript',
          tags: ['script'],
          content: `:: StoryScript [script]\n${script.trim()}`
        });
      }

      const style = doc.querySelector('[role=stylesheet]')?.textContent;
      if (style?.trim()) {
        ps.push({
          name: 'StoryStylesheet',
          tags: ['stylesheet'],
          content: `:: StoryStylesheet [stylesheet]\n${style.trim()}`
        });
      }

      const passageEls = Array.from(doc.querySelectorAll('tw-passagedata'));
      ps.push(...passageEls.map(el => {
        const pName = el.getAttribute('name') || 'Untitled';
        const pTags = el.getAttribute('tags')?.split(/\s+/).filter(t => t) || [];
        const tagStr = pTags.length > 0 ? ` [${pTags.join(' ')}]` : '';
        return {
          name: pName,
          tags: pTags,
          content: `:: ${escapeHeader(pName)}${tagStr}\n${el.textContent || ''}`,
          isStart: el.getAttribute('pid') === fStart
        };
      }));
    }

    return { fTitle, fIfid, fStart, fRawMeta, ps };
  };

  const importFromZip = async (file, fTitle, fIfid) => {
    const zip = await JSZip.loadAsync(file);

    let fRawMeta = {};
    let extraScripts = null;
    let zipPackages = [];

    // 1. 优先读取 twide.json 获取项目配置
    if (zip.files['twide.json']) {
      try {
        const configText = await zip.files['twide.json'].async("string");
        const config = JSON.parse(configText);
        if (config.story) {
          fTitle = config.story.name || fTitle;
          fIfid = config.story.ifid || fIfid;
          fRawMeta = {
            format: config.story.format,
            'format-version': config.story.formatVersion,
            zoom: config.story.zoom || 1
          };
        }
        if (config.extraScripts) {
          extraScripts = config.extraScripts;
        }
        // 读取 packages 配置（内联包的内容从 packages/ 目录读取）
        if (config.packages && config.packages.length > 0) {
          for (const pkgMeta of config.packages) {
            const ext = pkgMeta.fileType === 'css' ? 'css' : 'js';
            const pkgFileName = `packages/${pkgMeta.name}@${pkgMeta.version}.${ext}`;
            let content = '';
            if (pkgMeta.inlineMode && zip.files[pkgFileName]) {
              content = await zip.files[pkgFileName].async("string");
            }
            zipPackages.push({
              name: pkgMeta.name,
              version: pkgMeta.version,
              fileType: pkgMeta.fileType,
              url: pkgMeta.url || '',
              content,
              inlineMode: !!pkgMeta.inlineMode
            });
          }
        }
      } catch (e) {
        console.warn("twide.json 解析失败，将从 twee 文件恢复元数据", e);
      }
    }

    // 2. 解析 twee/txt 文件获取片段
    const tweeFiles = Object.keys(zip.files).filter(name =>
      (name.endsWith('.twee') || name.endsWith('.txt')) && name !== 'story_metadata.twee'
    );

    let ps = [];
    const folderSet = new Set();

    for (const name of tweeFiles) {
      const res = parseTwee(await zip.files[name].async("string"));
      // 如果 twide.json 没有提供元数据，从 twee 文件中回退获取
      if (!fRawMeta.format) {
        if (res.meta.title) fTitle = res.meta.title;
        if (res.meta.ifid) fIfid = res.meta.ifid;
        fRawMeta = { ...fRawMeta, ...res.meta.rawData };
      }

      const parts = name.replace(/\\/g, '/').split('/');
      let folder = null;
      if (parts.length >= 3 && parts[0] === 'passages') {
        folder = parts.slice(1, parts.length - 1).join('/');
        folderSet.add(folder);
      }
      res.items.forEach(item => { item.folder = folder; });
      ps.push(...res.items);
    }

    // 3. 如果没有从 twide.json 读到元数据，尝试从 story_metadata.twee 获取
    if (!fRawMeta.format && zip.files['story_metadata.twee']) {
      const metaRes = parseTwee(await zip.files['story_metadata.twee'].async("string"));
      if (metaRes.meta.title) fTitle = metaRes.meta.title;
      if (metaRes.meta.ifid) fIfid = metaRes.meta.ifid;
      fRawMeta = { ...fRawMeta, ...metaRes.meta.rawData };
    }

    // 4. 提取 assets
    const assetFiles = Object.keys(zip.files).filter(name => name.startsWith('assets/') && !zip.files[name].dir);
    const zipAssets = [];
    for (const name of assetFiles) {
      const blob = await zip.files[name].async("blob");
      const assetName = name.replace(/^assets\//, '');
      zipAssets.push({ name: assetName, blob });
    }

    return { fTitle, fIfid, fRawMeta, ps, zipAssets, zipFolders: Array.from(folderSet), zipPackages, extraScripts };
  };

  const importFromTwee = async (file, fTitle, fIfid) => {
    const res = parseTwee(await file.text());
    return {
      fTitle: res.meta.title || fTitle,
      fIfid: res.meta.ifid || fIfid,
      fRawMeta: res.meta.rawData,
      ps: res.items
    };
  };

  const saveAssets = async (zipAssets, storyId) => {
    const extMimeMap = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', mp3: 'audio/mpeg', wav: 'audio/wav',
      mp4: 'video/mp4', webm: 'video/webm', json: 'application/json', txt: 'text/plain',
      css: 'text/css', js: 'application/javascript', ttf: 'font/ttf', woff: 'font/woff'
    };

    for (const a of zipAssets) {
      const ext = a.name.split('.').pop().toLowerCase();
      const mimeType = a.blob.type || extMimeMap[ext] || 'application/octet-stream';
      const typedBlob = new Blob([a.blob], { type: mimeType });
      const id = "asset_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
      const assetData = {
        id, storyId,
        name: a.name,
        type: mimeType,
        size: typedBlob.size,
        data: typedBlob,
        createdAt: Date.now()
      };
      await db.put('assets', assetData);
      if (assets) {
        assets.value.push({ ...assetData, url: URL.createObjectURL(typedBlob) });
      }
    }
  };

  const savePackages = async (zipPackages, storyId) => {
    for (const pkg of zipPackages) {
      const pkgData = {
        id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        storyId,
        name: pkg.name,
        version: pkg.version,
        fileType: pkg.fileType,
        url: pkg.url || '',
        content: pkg.content || '',
        inlineMode: !!pkg.inlineMode,
        order: Date.now(),
        createdAt: Date.now()
      };
      await db.put('packages', JSON.parse(JSON.stringify(pkgData)));
      if (packages && packages.value) {
        packages.value.push(pkgData);
      }
    }
  };

  return { importFile };
}
