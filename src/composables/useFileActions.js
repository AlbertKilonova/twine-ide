import { showToast, showLoadingToast, closeToast } from 'vant'; 
import JSZip from 'jszip';
import { minify } from 'terser';

export function useFileActions(db, stories, allPassages, currentStoryId, assets) {
  
  // --- 基础工具函数 ---
  const generateUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  const downloadBlob = function(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
  };

  // --- Twee 转义逻辑 ---
  const escapeForTweeHeader = function(v) { return (v || "").replace(/\\/g, '\\\\').replace(/([[\]{}])/g, '\\$1'); };
  const escapeForTweeText = function(v) { return (v || "").replace(/^::/gm, '\\::'); };
  const unescapeForTweeHeader = function(v) { return (v || "").replace(/\\([[\]{}])/g, '$1').replace(/\\\\/g, '\\'); };
  const unescapeForTweeText = function(v) { return (v || "").replace(/^\\:/gm, ':'); };

  // --- 资源路径处理 ---
  const processAssetLinks = function(content, isPreview, isBase64, base64Map) {
    if (!content) return "";
    var assetList = (assets && assets.value) ? assets.value : [];
    return content.replace(/@\{([^}]+)\}/g, function(match, fileName) {
      if (isBase64 && base64Map && base64Map[fileName]) return base64Map[fileName];
      var asset = null;
      for (var i = 0; i < assetList.length; i++) {
        if (assetList[i].name === fileName) { asset = assetList[i]; break; }
      }
      if (!asset) return match; 
      return isPreview ? asset.url : "assets/" + fileName;
    });
  };
  
  // 这是一个专门用来把 URL 数组转换成 HTML 标签字符串的内部魔法波
  const buildResourceTags = (cdns) => {
    if (!cdns || !Array.isArray(cdns)) return { styles: '', scripts: '' };
    
    let styles = '';
    let scripts = '';
   
    cdns.forEach(url => {
      if (!url || !url.trim()) return;
        
      const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
      // 再次祭出阿波的类型识别大法喵！
      const isCSS = cleanUrl.endsWith('.css') || cleanUrl.includes('.css/');
    
      if (isCSS) {
        styles += `    <link rel="stylesheet" href="${url}">\n`;
      } else {
        // 这里的脚本不加 async，保证按波波填写的顺序执行波
        scripts += `    <script src="${url}"></script>\n`;
      }
    });
    return { styles, scripts };
  };

  // --- 核心编译引擎 ---
  const _coreBuild = async function(story, passages, formatMgr, isDebug, isPreview, isBase64, base64Map) {
    var startP = null;
    if (passages && passages.length > 0) {
      for (var i = 0; i < passages.length; i++) {
        if (passages[i].isStart) { startP = passages[i]; break; }
      }
      if (!startP) startP = passages[0];
    }
    if (!startP) startP = { name: 'Start' };

    var storyData = {
      ifid: story.ifid || generateUUID(),
      format: story.format,
      "format-version": story.formatVersion,
      start: startP.name || 'Start'
    };
    
    var tweeSource = ":: StoryData\n" + JSON.stringify(storyData, null, 2) + "\n\n";
    tweeSource += ":: StoryTitle\n" + (story.name || "Untitled") + "\n\n";
    
    passages.forEach(function(p) {
      var contentStr = p.content || "";
      var processedContent = processAssetLinks(contentStr, isPreview, isBase64, base64Map);
      if (processedContent.trim().indexOf('::') === 0) {
        tweeSource += processedContent + "\n\n";
      } else {
        var tags = (p.tags && p.tags.length) ? " [" + p.tags.join(' ') + "]" : '';
        tweeSource += ":: " + p.name + tags + "\n" + processedContent + "\n\n";
      }
    });
    
    var id = (story.format || "").toLowerCase() + "-" + (story.formatVersion || "");
    var rawFormatCode = await formatMgr.getRawCode(id);
    var mod = await import('tweers-core');
    const buildResult = await mod.build({
      sources: [{ type: 'text', name: 'compile.tw', content: tweeSource }],
      format_info: { name: story.format, version: story.formatVersion, source: rawFormatCode },
      is_debug: !!isDebug
    });

    const extra = story.extraScripts || {};
  let finalHtml = buildResult.html;

  // 这是阿波的 Terser 压缩魔法机波！
  const doMinify = async (code) => {
    if (!code || !code.trim()) return '';
    try {
      const result = await minify(code, {
        compress: {
          dead_code: true,
          drop_console: false, // 如果波波想删掉 console.log 可以改成 true 波
          passes: 2
        },
        format: {
          comments: false, // 这行就是用来杀掉所有注释的波！
          beautify: false  // 绝对不美化，就要挤在一起喵
        },
        mangle: false // 暂时不混淆变量名，防止波波的代码引用出问题喵
      });
      return result.code || code;
    } catch (e) {
      console.warn('Terser 压缩失败了喵，可能是代码有语法错误:', e);
      return code; // 失败了就原样返回，不让波波的故事卡死波
    }
  };

  // 1. 处理头部 (顶级脚本压缩)
  const minifiedTop = await doMinify(extra.topScript);
  const topScriptTag = minifiedTop ? `<script>${minifiedTop}</script>` : '';
  
  const { styles, scripts: cdnScripts } = buildResourceTags(extra.cdns);
  // 把 CDN 标签之间的换行也顺手干掉波
  const headAssets = (topScriptTag + styles + cdnScripts).replace(/>\s+</g, '><');

  if (headAssets.trim()) {
    const metaMatch = finalHtml.match(/<meta[^>]*>/g);
    if (metaMatch) {
      const lastMeta = metaMatch[metaMatch.length - 1];
      finalHtml = finalHtml.replace(lastMeta, lastMeta + headAssets);
    } else {
      finalHtml = finalHtml.replace('<head>', '<head>' + headAssets);
    }
  }

  // 2. 处理尾部 (footerScripts 数组循环压缩)
  let bottomInjection = '';
  if (Array.isArray(extra.footerScripts)) {
    // 波波你看！阿波用 map 和 Promise.all 保证顺序，而且每个都是独立的波！
    const minifiedFooters = await Promise.all(
      extra.footerScripts.map(async (s) => {
        if (!s.content) return '';
        const mini = await doMinify(s.content);
        return `<script>${mini}</script>`;
      })
    );
    bottomInjection = minifiedFooters.join('');
  }

  // 3. 最后的注入
  if (bottomInjection) {
    if (finalHtml.toLowerCase().includes('</body>')) {
      finalHtml = finalHtml.replace(/<\/body>/i, bottomInjection + '</body>');
    } else {
      finalHtml += bottomInjection;
    }
  }

    return { ...buildResult, html: finalHtml };
  };

  // --- Twee 解析器 ---
  const parseTwee = function(text) {
    var sections = text.split(/^::/m);
    var meta = { rawData: {} }; 
    var items = [];
    sections.forEach(function(sec) {
      var lines = sec.split(/\r?\n/);
      if (lines.length === 0) return;
      var headerLine = lines[0].trim();
      var content = lines.slice(1).join('\n').trim();
      if (!headerLine) return;
      if (headerLine === 'StoryTitle') {
        meta.title = unescapeForTweeText(content);
      } else if (headerLine === 'StoryData') {
        try { 
          meta.rawData = JSON.parse(content); 
          meta.ifid = meta.rawData.ifid; 
          meta.start = meta.rawData.start; 
        } catch (e) { console.warn("StoryData解析失败"); }
      } else {
        var match = headerLine.match(/^([^\[\{]+)(?:\s*\[(.*?)\])?(?:\s*\{.*?\})?/);
        var name = match ? match[1].trim() : headerLine;
        var tags = (match && match[2]) ? match[2].split(/\s+/).filter(function(t) { return t; }).map(unescapeForTweeHeader) : [];
        items.push({ 
          name: unescapeForTweeHeader(name), 
          tags: tags,
          content: ":: " + headerLine + "\n" + unescapeForTweeText(content)
        });
      }
    });
    return { meta: meta, items: items };
  };

  // --- 导入功能 (修复了 Blob 类型错误的终极版) ---
  const handleImportFile = (onSuccess) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.twee,.zip,.txt,.html';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showLoadingToast({ message: '导入中...', forbidClick: true });
      
      try {
        let fTitle = file.name.replace(/\.[^/.]+$/, ""), 
            fIfid = generateUUID(), 
            fStart = null, 
            ps = [], 
            fRawMeta = {},
            zipAssets = [],
            zipFolders = [];

        if (file.name.endsWith('.html')) {
          const htmlText = await file.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          const storyData = doc.querySelector('tw-storydata');

          if (storyData) {
            fTitle = storyData.getAttribute('name') || fTitle;
            fIfid = storyData.getAttribute('ifid') || fIfid;
            fStart = storyData.getAttribute('startnode');
            fRawMeta = {
              format: storyData.getAttribute('format'),
              'format-version': storyData.getAttribute('format-version'),
              zoom: parseFloat(storyData.getAttribute('zoom')) || 1
            };

            // 【关键改动】将脚本和样式表直接转为特殊段落喵
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
                content: `:: ${escapeForTweeHeader(pName)}${tagStr}\n${el.textContent || ''}`,
                isStart: el.getAttribute('pid') === fStart
              };
            }));
          }
        } else if (file.name.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          const tweeFiles = Object.keys(zip.files).filter(name => name.endsWith('.twee') || name.endsWith('.txt'));
          const folderSet = new Set();
          for (const name of tweeFiles) {
            const res = parseTwee(await zip.files[name].async("string"));
            if (res.meta.title) fTitle = res.meta.title;
            if (res.meta.ifid) fIfid = res.meta.ifid;
            fRawMeta = { ...fRawMeta, ...res.meta.rawData };
            // 从路径中提取文件夹归属：passages/folder/name.twee → folder
            const parts = name.replace(/\\/g, '/').split('/');
            let folder = null;
            if (parts.length >= 3 && parts[0] === 'passages') {
              folder = parts.slice(1, parts.length - 1).join('/');
              folderSet.add(folder);
            }
            res.items.forEach(item => { item.folder = folder; });
            ps.push(...res.items);
          }
          // 导入 assets/ 目录下的资源文件
          const assetFiles = Object.keys(zip.files).filter(name => name.startsWith('assets/') && !zip.files[name].dir);
          for (const name of assetFiles) {
            const blob = await zip.files[name].async("blob");
            const assetName = name.replace(/^assets\//, '');
            zipAssets.push({ name: assetName, blob });
          }
          zipFolders = Array.from(folderSet);
        } else {
          const res = parseTwee(await file.text());
          fTitle = res.meta.title || fTitle;
          fIfid = res.meta.ifid || fIfid;
          fRawMeta = res.meta.rawData;
          ps = res.items;
        }

        const newS = { 
          id: Date.now().toString(), 
          name: fTitle, 
          folders: zipFolders, 
          ifid: fIfid, 
          format: fRawMeta.format || "", 
          formatVersion: fRawMeta['format-version'] || "",
          zoom: fRawMeta.zoom || 1,
          extraMetadata: {}
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

        // 导入 zip 中的资源文件（Blob 不能 JSON 序列化，直接存入 IndexedDB）
        const extMimeMap = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
          webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
          mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4',
          webm: 'video/webm', json: 'application/json', txt: 'text/plain',
          css: 'text/css', js: 'application/javascript', html: 'text/html',
          ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2'
        };
        for (const a of zipAssets) {
          const ext = a.name.split('.').pop().toLowerCase();
          const mimeType = a.blob.type || extMimeMap[ext] || 'application/octet-stream';
          const typedBlob = new Blob([a.blob], { type: mimeType });
          const id = "asset_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
          const assetData = {
            id,
            storyId: newS.id,
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

  // --- 导出、预览、构建逻辑 ---
  const handleExport = async function(type, currentStoryName, currentStory, currentStoryFiles) {
    if (!currentStoryFiles || currentStoryFiles.length === 0) { showToast('空的喵'); return; }
    var zip = type === 'zip' ? new JSZip() : null;
    var startP = currentStoryFiles.find(function(f) { return f.isStart; }) || currentStoryFiles[0];
    var storyTitle = ":: StoryTitle\n" + currentStoryName + "\n\n";
    var storyData = ":: StoryData\n" + JSON.stringify({ ifid: currentStory.ifid || generateUUID(), format: currentStory.format || "", "format-version": currentStory.formatVersion || "", start: startP.name || "Start", zoom: currentStory.zoom || 1 }, null, 2) + "\n\n";

    if (type === 'single') {
      var res = storyTitle + storyData;
      currentStoryFiles.forEach(function(f) { res += processAssetLinks(f.content.trim(), false) + "\n\n"; });
      downloadBlob(new Blob([res]), currentStoryName + ".twee");
    } else {
      currentStoryFiles.forEach(function(f) {
        var body = processAssetLinks(f.content.trim(), false);
        var path = f.folder ? "passages/" + f.folder + "/" + f.name + ".twee" : "passages/" + f.name + ".twee";
        zip.file(path, body + "\n\n");
      });
      if (assets && assets.value) {
        assets.value.forEach(function(a) { if (a.storyId === currentStoryId.value) zip.file("assets/" + a.name, a.data); });
      }
      zip.file("story_metadata.twee", storyTitle + storyData);
      var blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, currentStoryName + ".zip");
    }
    showToast('导出成功波！');
  };

  const handlePreview = async function(story, passages, formatMgr, isDebug) {
    try {
      var result = await _coreBuild(story, passages, formatMgr, isDebug, true);
      var url = URL.createObjectURL(new Blob([result.html], { type: 'text/html' }));
      if (import.meta.env.VITE_BUILD_TARGET === 'apk') return url;
      var win = window.open(url, '_blank');
      win ? showToast('看喵！') : showToast('被拦截了波');
      return null;
    } catch (err) { showToast("预览失败波"); return null; }
  };

  const handleBuild = async function(story, passages, formatMgr) {
    try {
      showLoadingToast({ message: '正在构建...', forbidClick: true });
      var result = await _coreBuild(story, passages, formatMgr, false, false);
      var assetList = (assets && assets.value) ? assets.value.filter(function(a) { return a.storyId === story.id; }) : [];
      if (assetList.length > 0) {
        var zip = new JSZip();
        zip.file(story.name + ".html", result.html);
        var folder = zip.folder("assets");
        assetList.forEach(function(a) { folder.file(a.name, a.data); });
        var blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, story.name + "_package.zip");
      } else {
        downloadBlob(new Blob([result.html], { type: 'text/html' }), story.name + ".html");
      }
      closeToast();
      showToast('构建完成波喵！');
    } catch (err) { closeToast(); showToast("构建失败了波"); }
  };

  const handleBuildSingleFile = async function(story, passages, formatMgr) {
    try {
      showLoadingToast({ message: 'Base64 转换中...', forbidClick: true });
      var assetList = (assets && assets.value) ? assets.value.filter(function(a) { return a.storyId === story.id; }) : [];
      var base64Pairs = await Promise.all(assetList.map(function(a) {
        return new Promise(function(resolve) {
          var reader = new FileReader();
          reader.onloadend = function() { resolve({ name: a.name, data: reader.result }); };
          reader.readAsDataURL(new Blob([a.data]));
        });
      }));
      var base64Map = {};
      base64Pairs.forEach(function(p) { base64Map[p.name] = p.data; });
      var result = await _coreBuild(story, passages, formatMgr, false, false, true, base64Map);
      downloadBlob(new Blob([result.html], { type: 'text/html' }), story.name + "_single.html");
      closeToast();
      showToast('单文件构建成功波！');
    } catch (err) { closeToast(); showToast("单文件构建失败喵"); }
  };
  
  return { handleExport, handleImportFile, generateUUID, escapeForTweeHeader, escapeForTweeText, unescapeForTweeHeader, unescapeForTweeText, handlePreview, handleBuild, handleBuildSingleFile };
}
