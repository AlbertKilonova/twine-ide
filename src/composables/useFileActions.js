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
  // --- 导入逻辑：支持 .twee, .zip 和 .html (Twine 编译成品) ---
  const handleImportFile = (onSuccess) => {
    const input = document.createElement('input');
    input.type = 'file';
    // 加上 .html 接收
    input.accept = '.twee,.zip,.txt,.html';
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

        // --- 分支 1: 处理 HTML 格式 (从成品解析) ---
        if (file.name.endsWith('.html')) {
          const htmlText = await file.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          const storyData = doc.querySelector('tw-storydata');

          if (storyData) {
            fTitle = storyData.getAttribute('name') || fTitle;
            fIfid = storyData.getAttribute('ifid') || fIfid;
            fStart = storyData.getAttribute('startnode'); // 这里的 startnode 是 pid
            
            fRawMeta = {
              format: storyData.getAttribute('format') || "SugarCube",
              'format-version': storyData.getAttribute('format-version') || "2.37.3",
              zoom: parseFloat(storyData.getAttribute('zoom')) || 1,
              script: doc.querySelector('[role=script]')?.textContent || '',
              stylesheet: doc.querySelector('[role=stylesheet]')?.textContent || ''
            };

            const passageEls = Array.from(doc.querySelectorAll('tw-passagedata'));
            ps = passageEls.map(el => {
              const pName = el.getAttribute('name') || 'Untitled';
              const pTags = el.getAttribute('tags')?.split(/\s+/).filter(t => t) || [];
              const pPid = el.getAttribute('pid');
              const pRawText = el.textContent || '';
              
              // 重点：缝合首行！波波的编辑器必须要有 :: 才能识别标题喵
              const tagStr = pTags.length > 0 ? ` [${pTags.join(' ')}]` : '';
              // 使用你已有的 escapeForTweeHeader 确保标题安全
              const header = `:: ${escapeForTweeHeader(pName)}${tagStr}\n`;
              
              return {
                name: pName,
                tags: pTags,
                content: header + pRawText, // 缝合后的内容
                isStart: pPid === fStart // 如果 pid 匹配，标记为起点
              };
            });
          } else {
            throw new Error('找不到 tw-storydata 节点喵');
          }

        // --- 分支 2: 处理 ZIP 格式 ---
        } else if (file.name.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          const files = Object.keys(zip.files).filter(name => !zip.files[name].dir && (name.endsWith('.twee') || name.endsWith('.txt')));
          for (const name of files) {
            const fileContent = await zip.files[name].async("string");
            const res = parseTwee(fileContent);
            if (res.meta.title) fTitle = res.meta.title;
            if (res.meta.ifid) fIfid = res.meta.ifid;
            if (res.meta.start) fStart = res.meta.start;
            fRawMeta = { ...fRawMeta, ...res.meta.rawData };
            ps.push(...res.items.map(item => ({ ...item, content: item.content }))); 
            // Twee 解析出来的 content 已经是带 :: 的了，不需要缝合
          }

        // --- 分支 3: 处理单文件 Twee ---
        } else {
          const res = parseTwee(await file.text());
          fTitle = res.meta.title || fTitle;
          fIfid = res.meta.ifid || fIfid;
          fStart = res.meta.start;
          fRawMeta = res.meta.rawData;
          // parseTwee 的逻辑里 items 里的 content 是不带 :: 的，所以需要补一下
          ps = res.items.map(item => {
             const tagStr = item.tags?.length ? ` [${item.tags.join(' ')}]` : '';
             return {
               ...item,
               content: `:: ${escapeForTweeHeader(item.name)}${tagStr}\n${item.content}`
             }
          });
        }

        // --- 统一写入数据库 ---
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

        for (const p of ps) {
          // 如果是 HTML 导入，isStart 已经算好了；如果是 Twee，则按名字匹配
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
        showToast('导入坏掉了，波波快看看文件对不对 QwQ');
      }
    };
    input.click();
  };

  return { handleExport, handleImportFile, generateUUID, escapeForTweeHeader, escapeForTweeText, unescapeForTweeHeader, unescapeForTweeText };
}