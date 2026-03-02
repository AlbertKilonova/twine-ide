// 资源拦截器：拦截所有对 assets/* 的请求并映射到 Blob URL
// 此脚本会被注入到构建的 HTML 中，在故事运行时生效

(function() {
  if (!window.__ASSET_MAP__) {
    console.warn('[Asset Interceptor] __ASSET_MAP__ not found');
    return;
  }

  const assetMap = window.__ASSET_MAP__;
  console.log('[Asset Interceptor] Asset Map:', assetMap);
  
  // 辅助函数：检查 URL 是否为 assets/ 路径
  const isAssetUrl = (url) => {
    if (!url) return false;
    const urlStr = url.toString();
    return urlStr.includes('assets/') || urlStr.startsWith('assets/');
  };
  
  // 辅助函数：从 URL 中提取文件名
  const extractFileName = (url) => {
    const urlStr = url.toString();
    const match = urlStr.match(/assets\/(.+?)(?:[?#]|$)/);
    return match ? match[1] : null;
  };
  
  // 辅助函数：获取映射的 Blob URL
  const getMappedUrl = (fileName) => {
    return assetMap[fileName] || null;
  };

  // 处理单个元素的 assets/ 路径
  const processElement = (el) => {
    if (!el || !el.getAttribute) return;
    ['src', 'href'].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && isAssetUrl(val)) {
        const fileName = extractFileName(val);
        const mappedUrl = getMappedUrl(fileName);
        console.log('[Asset Interceptor] Processing:', {
          tag: el.tagName,
          attr,
          original: val,
          fileName,
          mappedUrl
        });
        if (mappedUrl) {
          el.setAttribute(attr, mappedUrl);
        }
      }
    });
  };

  // 初始化：扫描已有元素 + 监听新增元素
  const init = () => {
    // 扫描所有已存在的媒体元素
    document.querySelectorAll('img,audio,video,source,a,link').forEach(processElement);
    
    // 监听后续动态添加的元素
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            processElement(node);
            if (node.querySelectorAll) {
              node.querySelectorAll('img,audio,video,source,a,link').forEach(processElement);
            }
          }
        });
      });
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
    console.log('[Asset Interceptor] Initialized with', Object.keys(assetMap).length, 'assets');
  };

  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
