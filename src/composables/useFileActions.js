import { showToast, showLoadingToast, closeToast } from 'vant';
import JSZip from 'jszip';

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

  // --- Twee 转义/反转义逻辑 (补全逻辑) ---
  const escapeForTweeHeader = (value) => value.replace(/\\/g, '\\\\').replace(/([[\]{}])/g, '\\$1');
  const escapeForTweeText = (value) => value.replace(/^::/gm, '\\::');
  const unescapeForTweeHeader = (value) => value.replace(/\\([[\]{}])/g, '$1').replace(/\\\\/g, '\\');
  const unescapeForTweeText = (value) => value.replace(/^\\:/gm, ':');

  // --- 核心解析逻辑：全量解析 + 自动切除元数据 ---
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
        } catch (e) { console.warn("StoryData解析失败"); }
      } else {
        // 精准切割：匹配标题和[标签]，但彻底丢弃后面的{坐标}等元数据
        const match = headerLine.match(/^([^\[\{]+)(?:\s*\[(.*?)\])?(?:\s*\{.*?\})?/);
        const name = match ? match[1].trim() : headerLine;
        const tags = match?.[2] ? match[2].split(/\s+/).filter(t => t).map(unescapeForTweeHeader) : [];
        
        items.push({ 
          name: unescapeForTweeHeader(name), 
          tags,
          content: unescapeForTweeText(content)
        });
      }
    });
    return { meta, items };
  };

  // --- 导出逻辑：支持单文件与ZIP整理 ---
  const handleExport = async (type, currentStoryName, currentStory, currentStoryFiles) => {
    if (currentStoryFiles.length === 0) {
      showToast('没有可以导出的内容哦波');
      return;
    }
    const zip = type === 'zip' ? new JSZip() : null;
    const startP = currentStoryFiles.find(p => p.isStart) || currentStoryFiles[0];
    
    const storyTitle = `:: StoryTitle\n${escapeForTweeText(currentStoryName)}\n\n`;
    const storyDataObj = {
      ifid: currentStory?.ifid || generateUUID(),
      format: currentStory?.format || "SugarCube",
      "format-version": currentStory?.formatVersion || "2.37.3",
      start: startP?.name || "Start",
      zoom: currentStory?.zoom || 1,
      ...(currentStory?.extraMetadata || {}) 
    };
    const storyData = `:: StoryData\n${JSON.stringify(storyDataObj, null, 2)}\n\n`;
    
    if (type === 'single') {
      let res = storyTitle + storyData;
      currentStoryFiles.forEach(f => {
        const escapedName = escapeForTweeHeader(f.name);
        const tagStr = f.tags?.length ? ` [${f.tags.map(escapeForTweeHeader).join(' ')}]` : '';
        res += `:: ${escapedName}${tagStr}\n${escapeForTweeText(f.content)}\n\n`;
      });
      downloadBlob(new Blob([res]), `${currentStoryName}.twee`);
    } else {
      // ZIP 模式：按文件夹存放
      for (const f of currentStoryFiles) {
        const escapedName = escapeForTweeHeader(f.name);
        const tagStr = f.tags?.length ? ` [${f.tags.map(escapeForTweeHeader).join(' ')}]` : '';
        const body = `:: ${escapedName}${tagStr}\n${escapeForTweeText(f.content)}`;
        // 如果有文件夹则放入文件夹，没有则统一放在 passages/
        const filePath = f.folder ? `${f.folder}/${f.name}.twee` : `passages/${f.name}.twee`;
        zip.file(filePath, body);
      }
      zip.file(`story_metadata.twee`, storyTitle + storyData);
      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, `${currentStoryName}.zip`);
    }
    showToast('导出成功啦！波波最棒！');
  };

  // --- 导入逻辑：ZIP 递归处理 + 数据库写入 + 响应式推送 ---
  const handleImportFile = (onSuccess) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.twee,.zip,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showLoadingToast({ message: '阿波正在努力搬运中...', forbidClick: true });
      
      try {
        let fTitle = file.name.replace(/\.[^/.]+$/, ""), 
            fIfid = generateUUID(), 
            fStart = null, 
            ps = [], 
            fRawMeta = {};

        if (file.name.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          // 遍历 ZIP 里的所有有效 twee 文件
          const files = Object.keys(zip.files).filter(name => !zip.files[name].dir && (name.endsWith('.twee') || name.endsWith('.txt')));
          for (const name of files) {
            const fileContent = await zip.files[name].async("string");
            const res = parseTwee(fileContent);
            if (res.meta.title) fTitle = res.meta.title;
            if (res.meta.ifid) fIfid = res.meta.ifid;
            if (res.meta.start) fStart = res.meta.start;
            fRawMeta = { ...fRawMeta, ...res.meta.rawData };
            ps.push(...res.items);
          }
        } else {
          const res = parseTwee(await file.text());
          fTitle = res.meta.title || fTitle;
          fIfid = res.meta.ifid || fIfid;
          fStart = res.meta.start;
          fRawMeta = res.meta.rawData;
          ps = res.items;
        }

        // 1. 创建故事实体
        const newS = { 
          id: Date.now().toString(), 
          name: fTitle, 
          folders: [], 
          ifid: fIfid, 
          format: fRawMeta.format || "SugarCube", 
          formatVersion: fRawMeta['format-version'] || "2.37.3",
          zoom: fRawMeta.zoom || 1,
          extraMetadata: fRawMeta 
        };
        
        await db.put('stories', JSON.parse(JSON.stringify(newS)));
        stories.value.push(newS);

        // 2. 批量处理片段实体
        for (const p of ps) {
          const isStart = fStart ? p.name === fStart : (p.name === 'Start' || p.name === 'start');
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
        showToast('导入坏掉了，波波快看看文件对不对 QwQ');
      }
    };
    input.click();
  };

  return { handleExport, handleImportFile, generateUUID, escapeForTweeHeader, escapeForTweeText, unescapeForTweeHeader, unescapeForTweeText };
}