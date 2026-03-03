import { showToast } from 'vant';
import JSZip from 'jszip';
import { generateUUID } from '../utils/tweeUtils';
import { downloadBlob } from '../utils/downloadHelper';

export function useExport(assets, packages, currentStoryId) {

  const exportStory = async (type, currentStoryName, currentStory, currentStoryFiles) => {
    if (!currentStoryFiles || currentStoryFiles.length === 0) {
      showToast('空的喵');
      return;
    }

    const startP = currentStoryFiles.find(f => f.isStart) || currentStoryFiles[0];
    const storyTitle = ":: StoryTitle\n" + currentStoryName + "\n\n";
    const storyData = ":: StoryData\n" + JSON.stringify({
      ifid: currentStory.ifid || generateUUID(),
      format: currentStory.format || "",
      "format-version": currentStory.formatVersion || "",
      start: startP.name || "Start",
      zoom: currentStory.zoom || 1
    }, null, 2) + "\n\n";

    if (type === 'single') {
      let res = storyTitle + storyData;
      currentStoryFiles.forEach(f => { res += f.content.trim() + "\n\n"; });
      downloadBlob(new Blob([res]), currentStoryName + ".twee");
    } else {
      const zip = new JSZip();

      currentStoryFiles.forEach(f => {
        const body = f.content.trim();
        const path = f.folder ? `passages/${f.folder}/${f.name}.twee` : `passages/${f.name}.twee`;
        zip.file(path, body + "\n\n");
      });

      if (assets && assets.value) {
        assets.value.forEach(a => {
          if (a.storyId === currentStoryId.value) {
            zip.file("assets/" + a.name, a.data);
          }
        });
      }

      const storyPackages = (packages && packages.value)
        ? packages.value.filter(p => p.storyId === currentStoryId.value)
        : [];
      if (storyPackages.length > 0) {
        storyPackages.forEach(pkg => {
          if (pkg.inlineMode && pkg.content) {
            const ext = pkg.fileType === 'css' ? 'css' : 'js';
            zip.file(`packages/${pkg.name}@${pkg.version}.${ext}`, pkg.content);
          }
        });
      }

      const twideConfig = {
        version: "1.0",
        story: {
          name: currentStoryName,
          ifid: currentStory.ifid || generateUUID(),
          format: currentStory.format || "",
          formatVersion: currentStory.formatVersion || "",
          start: startP.name || "Start",
          zoom: currentStory.zoom || 1
        },
        packages: storyPackages.map(pkg => ({
          name: pkg.name,
          version: pkg.version,
          fileType: pkg.fileType,
          url: pkg.url,
          inlineMode: pkg.inlineMode
        })),
        extraScripts: currentStory.extraScripts || { topScript: "", cdns: [], footerScripts: [] }
      };
      zip.file("twide.json", JSON.stringify(twideConfig, null, 2));
      zip.file("story_metadata.twee", storyTitle + storyData);

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, currentStoryName + ".zip");
    }

    showToast('导出成功波！');
  };

  return { exportStory };
}
