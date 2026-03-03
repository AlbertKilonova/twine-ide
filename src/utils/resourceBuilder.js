export function buildResourceTags(cdns, storyPackages) {
  let styles = '';
  let scripts = '';

  if (!cdns || !Array.isArray(cdns)) cdns = [];

  cdns.forEach(url => {
    if (!url || !url.trim()) return;
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    const isCSS = cleanUrl.endsWith('.css') || cleanUrl.includes('.css/');

    if (isCSS) {
      styles += `    <link rel="stylesheet" href="${url}">\n`;
    } else {
      scripts += `    <script src="${url}"></script>\n`;
    }
  });

  if (storyPackages && storyPackages.length > 0) {
    storyPackages.forEach(pkg => {
      if (pkg.inlineMode && pkg.content) {
        if (pkg.fileType === 'css') {
          styles += `    <style>\n/* Package: ${pkg.name}@${pkg.version} */\n${pkg.content}\n    </style>\n`;
        } else {
          scripts += `    <script>\n/* Package: ${pkg.name}@${pkg.version} */\n${pkg.content}\n    </script>\n`;
        }
      } else if (!pkg.inlineMode && pkg.url) {
        if (pkg.fileType === 'css') {
          styles += `    <link rel="stylesheet" href="${pkg.url}">\n`;
        } else {
          scripts += `    <script src="${pkg.url}"></script>\n`;
        }
      }
    });
  }

  return { styles, scripts };
}
