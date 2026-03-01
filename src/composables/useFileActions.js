import { showToast, showLoadingToast, closeToast } from 'vant'; 
import JSZip from 'jszip';

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

  // --- 核心编译引擎 ---
  const _coreBuild = async function(story, passages, formatMgr, isDebug, isPreview, isBase64, base64Map) {
    var startP = null;
    if (passages && passages.length > 0) {
      for (var i = 0; i < passages.length; i++) {
        if (passages[i].isStart) { startP = passages[i]; break; }
      }
      if (!startP) startP = passages;
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
    return mod.build({
      sources: [{ type: 'text', name: 'compile.tw', content: tweeSource }],
      format_info: { name: story.format, version: story.formatVersion, source: rawFormatCode },
      is_debug: !!isDebug
    });
  };

  // --- Twee 解析器 ---
  const parseTwee = function(text) {
    var sections = text.split(/^::/m);
    var meta = { rawData: {} }; 
    var items = [];
    sections.forEach(function(sec) {
      var lines = sec.split(/\r?\n/);
      if (lines.length === 0) return;
      var headerLine = lines.trim();
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
        var name = match ? match.trim() : headerLine;
        var tags = (match && match) ? match.split(/\s+/).filter(function(t) { return t; }).map(unescapeForTweeHeader) : [];
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
            fRawMeta = {};

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
          const files = Object.keys(zip.files).filter(name => name.endsWith('.twee') || name.endsWith('.txt'));
          for (const name of files) {
            const res = parseTwee(await zip.files[name].async("string"));
            if (res.meta.title) fTitle = res.meta.title;
            if (res.meta.ifid) fIfid = res.meta.ifid;
            fRawMeta = { ...fRawMeta, ...res.meta.rawData };
            ps.push(...res.items);
          }
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
          folders: [], 
          ifid: fIfid, 
          format: fRawMeta.format || "", 
          formatVersion: fRawMeta['format-version'] || "",
          zoom: fRawMeta.zoom || 1,
          extraMetadata: {} // 脚本和样式已经拿走，这里变干净了喵！
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
            folder: null, 
            content: p.content, 
            isStart 
          };
          await db.put('passages', JSON.parse(JSON.stringify(newP)));
          allPassages.value.push(newP);
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
    var startP = currentStoryFiles.find(function(f) { return f.isStart; }) || currentStoryFiles;
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
