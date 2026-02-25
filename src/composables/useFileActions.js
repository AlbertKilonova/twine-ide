import { showToast, showLoadingToast, closeToast } from 'vant';
import JSZip from 'jszip';

export function useFileActions(db, stories, allPassages, currentStoryId) {
  const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));

  const downloadBlob = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  };

  const handleExport = async (type, currentStoryName, currentStory, currentStoryFiles) => {
    if (currentStoryFiles.length === 0) return;
    const zip = type === 'zip' ? new JSZip() : null;
    const startP = currentStoryFiles.find(p => p.isStart) || currentStoryFiles[0];
    const storyTitle = `:: StoryTitle\n${currentStoryName}\n\n`;
    const storyData = `:: StoryData\n{"ifid": "${currentStory?.ifid || generateUUID()}", "format": "SugarCube", "format-version": "2.37.3", "start": "${startP.name}", "zoom": 1}\n\n`;
    
    if (type === 'single') {
      let res = storyTitle + storyData;
      currentStoryFiles.forEach(f => res += f.content + '\n\n');
      downloadBlob(new Blob([res]), `${currentStoryName}.twee`);
    } else {
      currentStoryFiles.forEach(f => zip.file(`${f.folder || 'passages'}/${f.name}.twee`, f.content));
      zip.file(`story_metadata.twee`, storyTitle + storyData);
      downloadBlob(await zip.generateAsync({ type: 'blob' }), `${currentStoryName}.zip`);
    }
  };

  const handleImportFile = (onSuccess) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.twee,.zip,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showLoadingToast({ message: '导入中...阿波正在将你的代码搬进来awa', forbidClick: true });
      try {
        let fTitle = file.name.replace(/\.[^/.]+$/, ""), fIfid = generateUUID(), fStart = null, ps = [];
        const parseTwee = (text) => {
          const sections = text.split(/^::/m);
          let meta = {}; let items = [];
          sections.forEach(sec => {
            const lines = sec.split('\n'); const h = lines[0].trim(); const c = lines.slice(1).join('\n').trim();
            if (!h) return;
            if (h === 'StoryTitle') meta.title = c;
            else if (h === 'StoryData') { try { const d = JSON.parse(c); meta.ifid = d.ifid; meta.start = d.start; } catch {} }
            else items.push({ name: h.match(/^([^\[\{]+)/)?.[1].trim() || h, full: `:: ${h}\n${c}` });
          });
          return { meta, items };
        };

        if (file.name.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          for (const name of Object.keys(zip.files)) {
            if (name.endsWith('.twee') || name.endsWith('.txt')) {
              const res = parseTwee(await zip.files[name].async("string"));
              if (res.meta.title) fTitle = res.meta.title;
              if (res.meta.ifid) fIfid = res.meta.ifid;
              if (res.meta.start) fStart = res.meta.start;
              ps.push(...res.items);
            }
          }
        } else {
          const res = parseTwee(await file.text());
          if (res.meta.title) fTitle = res.meta.title;
          if (res.meta.ifid) fIfid = res.meta.ifid;
          fStart = res.meta.start; ps = res.items;
        }

        const newS = { id: Date.now().toString(), name: fTitle, folders: [], ifid: fIfid };
        await db.put('stories', JSON.parse(JSON.stringify(newS)));
        stories.value.push(newS);
        
        for (const p of ps) {
          const isStart = fStart ? p.name === fStart : (p.name === 'Start' || p.name === 'start');
          const newP = { id: (Date.now() + Math.random()).toString(), storyId: newS.id, name: p.name, folder: null, content: p.full, isStart };
          await db.put('passages', JSON.parse(JSON.stringify(newP)));
          allPassages.value.push(newP);
        }
        closeToast();
        onSuccess(newS.id);
        showToast('导入完成，累死波了 awa');
      } catch (err) {
        closeToast();
        showToast('导入失败，啊呀波弄丢了 QAQ');
        console.error(err);
      }
    };
    input.click();
  };

  return { handleExport, handleImportFile, generateUUID };
}
