import { showToast, showLoadingToast, closeToast } from 'vant'; 
import JSZip from 'jszip';
import { unref } from 'vue';

export function useFileActions(db, stories, allPassages, currentStoryId) {
  // --- 工具函数：UUID 生成 ---
  const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));
  
  // --- 工具函数：触发下载 ---
  const downloadBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };

  // --- Twee 转义逻辑 ---
  const escapeForTweeHeader = (value) => value.replace(/\\/g, '\\\\').replace(/([[\]{}])/g, '\\$1');
  const escapeForTweeText = (value) => value.replace(/^::/gm, '\\::');
  const unescapeForTweeHeader = (value) => value.replace(/\\([[\]{}])/g, '$1').replace(/\\\\/g, '\\');
  const unescapeForTweeText = (value) => value.replace(/^\\:/gm, ':');

  // --- 核心解析逻辑 ---
  const parseTwee = (text) => {
    const sections = text.split(/^::/m);
    let meta = { rawData: {} }; 
    let items = [];
    sections.forEach(sec => {
      const lines = sec.split(/\r?\n/);
      const headerLine = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      if (!headerLine) return;

      if (headerLine === 'StoryTitle') {
        meta.title = unescapeForTweeText(content);
      } else if (headerLine === 'StoryData') {
        try { 
          meta.rawData = JSON.parse(content); 
          meta.ifid = meta.rawData.ifid; 
          meta.start = meta.rawData.start; 
        } catch (e) { console.warn("StoryData解析失败喵"); }
      } else {
        const match = headerLine.match(/^([^\[\{]+)(?:\s*\[(.*?)\])?(?:\s*\{.*?\})?/);
        const name = match ? match[1].trim() : headerLine;
        const tags = match?.[2] ? match[2].split(/\s+/).filter(t => t).map(unescapeForTweeHeader) : [];
        
        // 注意：这里导出的 content 是为了让编辑器识别，所以要带上 :: 头
        const fullHeader = `:: ${headerLine}\n`;
        items.push({ 
          name: unescapeForTweeHeader(name), 
          tags,
          content: fullHeader + unescapeForTweeText(content)
        });
      }
    });
    return { meta, items };
  };

  // --- 导出逻辑：现在变得超轻量了喵！ ---
  const handleExport = async (type, currentStoryName, currentStory, currentStoryFiles) => {
    if (currentStoryFiles.length === 0) {
      showToast('没有可以导出的内容哦波');
      return;
    }
    const zip = type === 'zip' ? new JSZip() : null;
    const startP = currentStoryFiles.find(p => p.isStart) || currentStoryFiles[0];
    
    // 1. 准备元数据部分
    const storyTitle = `:: StoryTitle\n${currentStoryName}\n\n`;
    const storyDataObj = {
      ifid: currentStory?.ifid || generateUUID(),
      format: currentStory?.format || "SugarCube",
      "format-version": currentStory?.formatVersion || "2.37.3",
      start: startP?.name || "Start",
      zoom: currentStory?.zoom || 1
    };
    const storyData = `:: StoryData\n${JSON.stringify(storyDataObj, null, 2)}\n\n`;
    
    // 辅助函数：导出时确保内容干净
    const formatPassageForExport = (p) => {
      // 因为数据库里的 content 已经自带了 :: 标题行，直接 trim 拼接即可
      return p.content.trim() + "\n\n";
    };

    if (type === 'single') {
      let res = storyTitle + storyData;
      currentStoryFiles.forEach(f => {
        res += formatPassageForExport(f);
      });
      downloadBlob(new Blob([res]), `${currentStoryName}.twee`);
    } else {
      // ZIP 模式
      for (const f of currentStoryFiles) {
        const body = formatPassageForExport(f);
        const filePath = f.folder ? `${f.folder}/${f.name}.twee` : `passages/${f.name}.twee`;
        zip.file(filePath, body);
      }
      zip.file(`story_metadata.twee`, storyTitle + storyData);
      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, `${currentStoryName}.zip`);
    }
    showToast('导出成功啦！波波最棒！');
  };

  // --- 导入逻辑：将 Script 和 Style 转化为普通段落 ---
  const handleImportFile = (onSuccess) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.twee,.zip,.txt,.html';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showLoadingToast({ message: '阿波搬运中...', forbidClick: true });
      
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
          format: fRawMeta.format || "SugarCube", 
          formatVersion: fRawMeta['format-version'] || "2.37.3",
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
        showToast('导入失败了波 xwx');
      }
    };
    input.click();
  };
  
  const handlePreview = async (story, passages, formatMgr) => {
    if (!story || passages.length === 0) {
      showToast('没有段落可以预览喵 xwx');
      return;
    }

    try {
      showToast('阿波正在裁剪新衣服... (。•ω•。)');

      // --- 1. 准备 Twee 源码 ---
      // 构造 StoryData
      const storyData = {
        ifid: story.ifid,
        format: story.format,
        "format-version": story.formatVersion,
        start: passages.find(p => p.isStart)?.name || passages[0]?.name || 'Start'
      };

      let tweeSource = `:: StoryData\n${JSON.stringify(storyData, null, 2)}\n\n`;
      tweeSource += `:: StoryTitle\n${story.name}\n\n`;

      passages.forEach(p => {
        const tags = (p.tags && p.tags.length) ? ` [${p.tags.join(' ')}]` : '';
        tweeSource += `:: ${p.name}${tags}\n${p.content}\n\n`;
      });

      // --- 2. 获取故事格式的【原始JS源码】 ---
      // 重点：tweers-core 的 build 必须在 source 里看到 window.storyFormat
      const id = `${story.format.toLowerCase()}-${story.formatVersion}`;
      let rawFormatCode = "";

      // A. 先去私人衣橱（数据库）里翻翻
      const di = unref(db);
      if (di && di.getAll) {
        try {
          const customs = await di.getAll('custom_formats');
          const found = customs.find(c => c.id === `custom-${id}`);
          if (found && found.raw) {
            rawFormatCode = found.raw;
            console.log("从私人衣橱拿到了原始衣服波！");
          }
        } catch (e) { console.warn("私人衣橱暂时打不开波", e); }
      }

      // B. 如果私人衣橱没有，去公共衣橱（系统资源）里翻翻
      if (!rawFormatCode && formatMgr) {
        // 波波，请确保在 useFormatManager 里加一个 getRawLoader 方法喵！
        // 或者这里通过 formatMgr 暴露的 loaders 直接加载
        try {
          rawFormatCode = await formatMgr.getRawCode(id);
          console.log("从公共衣橱拿到了系统衣服波！");
        } catch (e) { console.warn("公共衣橱也没这件衣服喵", e); }
      }

      if (!rawFormatCode) {
        throw new Error(`找不到格式 ${story.format} 的原始源码波！`);
      }

      // --- 3. 召唤编译引擎 ---
      const mod = await import('tweers-core');
      
      // 检查 WASM 是否初始化（这步波波如果已经在 onMounted 做过了可以略过喵）
      // if (!mod.isInitialized) { ... } 

      const config = {
        sources: [{ type: 'text', name: 'preview.tw', content: tweeSource }],
        format_info: {
          name: story.format,
          version: story.formatVersion,
          source: rawFormatCode // 这里必须是包含 window.storyFormat 的原始 JS 喵！
        }
      };

      // 编译！
      const result = mod.build(config);

      // --- 4. 开启新窗口展示 ---
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      
      if (!win) {
        showToast('预览被浏览器拦截了喵 xwx');
      } else {
        showToast('预览准备就绪！biu~');
      }

    } catch (err) {
      console.error("预览失败喵:", err);
      showToast(`预览失败: ${err.message}`);
    }
  };
  return { handleExport, handleImportFile, generateUUID, escapeForTweeHeader, escapeForTweeText, unescapeForTweeHeader, unescapeForTweeText, handlePreview };
}
