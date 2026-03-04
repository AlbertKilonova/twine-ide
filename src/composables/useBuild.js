import { showToast, showLoadingToast, closeToast } from 'vant';
import JSZip from 'jszip';
import { generateUUID } from '../utils/tweeUtils';
import { buildResourceTags, buildResourceTagsForPackage } from '../utils/resourceBuilder';
import { minifyCode } from '../utils/codeMinifier';
import { downloadBlob } from '../utils/downloadHelper';
import interceptorRaw from '../utils/assetInterceptor.js?raw';

export function useBuild(assets, packages) {

  const coreBuild = async (story, passages, formatMgr, isDebug, isPreview, skipInject) => {
    let startP = passages.find(p => p.isStart) || passages[0] || { name: 'Start' };

    const storyData = {
      ifid: story.ifid || generateUUID(),
      format: story.format,
      "format-version": story.formatVersion,
      start: startP.name || 'Start'
    };

    let tweeSource = ":: StoryData\n" + JSON.stringify(storyData, null, 2) + "\n\n";
    tweeSource += ":: StoryTitle\n" + (story.name || "Untitled") + "\n\n";

    passages.forEach(p => {
      const contentStr = p.content || "";
      if (contentStr.trim().indexOf('::') === 0) {
        tweeSource += contentStr + "\n\n";
      } else {
        const tags = (p.tags && p.tags.length) ? " [" + p.tags.join(' ') + "]" : '';
        tweeSource += ":: " + p.name + tags + "\n" + contentStr + "\n\n";
      }
    });

    const id = (story.format || "").toLowerCase() + "-" + (story.formatVersion || "");
    const rawFormatCode = await formatMgr.getRawCode(id);

    if (!rawFormatCode) {
      throw new Error("未找到故事格式代码喵！请在项目设置中选择一个格式（如 Harlowe、SugarCube）");
    }

    const mod = await import('tweers-core');
    const buildResult = await mod.build({
      sources: [{ type: 'text', name: 'compile.tw', content: tweeSource }],
      format_info: { name: story.format, version: story.formatVersion, source: rawFormatCode },
      is_debug: !!isDebug
    });

    if (skipInject) return buildResult;
    const finalHtml = await injectResources(buildResult.html, story, isPreview);
    return { ...buildResult, html: finalHtml };
  };

  const injectResources = async (html, story, isPreview) => {
    const extra = story.extraScripts || {};

    // 1. 资源映射（预览模式）
    let assetMapScript = '';
    if (isPreview) {
      const assetList = (assets && assets.value) ? assets.value : [];
      const assetMap = {};
      assetList.forEach(a => { assetMap[a.name] = a.url; });
      assetMapScript = `<script>window.__ASSET_MAP__=${JSON.stringify(assetMap)};</script>`;
    }

    // 2. 拦截脚本（预览模式）
    let interceptorScript = '';
    if (isPreview) {
      interceptorScript = `<script>${interceptorRaw}</script>`;
    }

    if (assetMapScript || interceptorScript) {
      html = html.replace('<head>', '<head>' + assetMapScript + interceptorScript);
    }

    // 3. 头部脚本
    const minifiedTop = await minifyCode(extra.topScript);
    const topScriptTag = minifiedTop ? `<script>${minifiedTop}</script>` : '';

    // 4. CDN 和包
    const storyPackages = (packages && packages.value)
      ? packages.value.filter(p => p.storyId === story.id)
      : [];
    const { styles, scripts: cdnScripts } = buildResourceTags(extra.cdns, storyPackages);
    const headAssets = (topScriptTag + styles + cdnScripts).replace(/>\s+</g, '><');

    if (headAssets.trim()) {
      const metaMatch = html.match(/<meta[^>]*>/g);
      if (metaMatch) {
        const lastMeta = metaMatch[metaMatch.length - 1];
        html = html.replace(lastMeta, lastMeta + headAssets);
      } else {
        html = html.replace('<head>', '<head>' + headAssets);
      }
    }

    // 5. 尾部脚本
    let bottomInjection = '';
    if (Array.isArray(extra.footerScripts)) {
      const minifiedFooters = await Promise.all(
        extra.footerScripts.map(async (s) => {
          if (!s.content) return '';
          const mini = await minifyCode(s.content);
          return `<script>${mini}</script>`;
        })
      );
      bottomInjection = minifiedFooters.join('');
    }

    if (bottomInjection) {
      if (html.toLowerCase().includes('</body>')) {
        html = html.replace(/<\/body>/i, bottomInjection + '</body>');
      } else {
        html += bottomInjection;
      }
    }

    return html;
  };

  const preview = async (story, passages, formatMgr, isDebug) => {
    try {
      const result = await coreBuild(story, passages, formatMgr, isDebug, true);
      const url = URL.createObjectURL(new Blob([result.html], { type: 'text/html' }));
      if (import.meta.env.VITE_BUILD_TARGET === 'apk') return url;
      const win = window.open(url, '_blank');
      win ? showToast('看喵！') : showToast('被拦截了波');
      return null;
    } catch (err) {
      console.error("预览失败:", err);
      showToast("预览失败波: " + (err.message || err));
      return null;
    }
  };

  const build = async (story, passages, formatMgr) => {
    try {
      showLoadingToast({ message: '正在构建...', forbidClick: true });
      const result = await coreBuild(story, passages, formatMgr, false, false);
      const assetList = (assets && assets.value) ? assets.value.filter(a => a.storyId === story.id) : [];

      if (assetList.length > 0) {
        const zip = new JSZip();
        zip.file(story.name + ".html", result.html);
        const folder = zip.folder("assets");
        assetList.forEach(a => { folder.file(a.name, a.data); });
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, story.name + "_package.zip");
      } else {
        downloadBlob(new Blob([result.html], { type: 'text/html' }), story.name + ".html");
      }

      closeToast();
      showToast('构建完成波喵！');
    } catch (err) {
      console.error("构建失败:", err);
      closeToast();
      showToast("构建失败了波: " + (err.message || err));
    }
  };

  const buildSingleFile = async (story, passages, formatMgr) => {
    try {
      showLoadingToast({ message: '正在打包...', forbidClick: true });

      // 获取原始 HTML（跳过资源注入）
      const result = await coreBuild(story, passages, formatMgr, false, false, true);
      let html = result.html;

      const zipFiles = [];
      const extra = story.extraScripts || {};

      // 1. 收集资源文件 → assets/
      const assetList = (assets && assets.value) ? assets.value.filter(a => a.storyId === story.id) : [];
      assetList.forEach(a => {
        zipFiles.push({ path: 'assets/' + a.name, data: a.data });
      });

      // 2. 头部脚本 → 存为文件，用 <script src> 链接
      let headInjection = '';
      if (extra.topScript) {
        const minified = await minifyCode(extra.topScript);
        if (minified) {
          zipFiles.push({ path: 'assets/top-script.js', data: minified });
          headInjection += `<script src="assets/top-script.js"></script>`;
        }
      }

      // 3. CDN 保持外链，inline 包存为文件用相对路径
      const storyPackages = (packages && packages.value)
        ? packages.value.filter(p => p.storyId === story.id)
        : [];
      const { styles, scripts: pkgScripts, files } = buildResourceTagsForPackage(extra.cdns, storyPackages);
      headInjection += styles + pkgScripts;
      files.forEach(f => zipFiles.push(f));

      // 注入头部
      if (headInjection.trim()) {
        const metaMatch = html.match(/<meta[^>]*>/g);
        if (metaMatch) {
          const lastMeta = metaMatch[metaMatch.length - 1];
          html = html.replace(lastMeta, lastMeta + headInjection);
        } else {
          html = html.replace('<head>', '<head>' + headInjection);
        }
      }

      // 4. 尾部脚本 → 存为文件，用 <script src> 链接
      let bottomInjection = '';
      if (Array.isArray(extra.footerScripts)) {
        for (let i = 0; i < extra.footerScripts.length; i++) {
          const s = extra.footerScripts[i];
          if (!s.content) continue;
          const mini = await minifyCode(s.content);
          if (!mini) continue;
          const fileName = `footer-script-${i + 1}.js`;
          zipFiles.push({ path: 'assets/' + fileName, data: mini });
          bottomInjection += `<script src="assets/${fileName}"></script>`;
        }
      }

      if (bottomInjection) {
        if (html.toLowerCase().includes('</body>')) {
          html = html.replace(/<\/body>/i, bottomInjection + '</body>');
        } else {
          html += bottomInjection;
        }
      }

      // 5. 打包 ZIP
      const zip = new JSZip();
      zip.file(story.name + '.html', html);
      zipFiles.forEach(f => zip.file(f.path, f.data));
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, story.name + '_package.zip');

      closeToast();
      showToast('打包完成波喵！');
    } catch (err) {
      console.error("打包失败:", err);
      closeToast();
      showToast("打包失败了波: " + (err.message || err));
    }
  };

  return { coreBuild, preview, build, buildSingleFile };
}
