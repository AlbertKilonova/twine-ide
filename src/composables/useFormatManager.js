import { ref } from 'vue';

export function useFormatManager() {
  const availableFormats = ref([]);
  const currentFormatData = ref(null); // 存储当前正在使用的衣服数据

  // 扫描还是用 eager: false，这次阿波不直接读内容，只拿导入函数
  // 这样初始化时就不会卡顿啦！
  const formatLoaders = import.meta.glob('/src/assets/story-formats/*/format.js', { 
    query: 'raw'
  });
  
  const iconModules = import.meta.glob('/src/assets/story-formats/*/icon.svg', { 
    query: 'url', 
    eager: true 
  });

  // 初始化列表（只拿名字和 ID，不读几兆的大代码）
  const scanFormats = () => {
    const formats = [];
    for (const path in formatLoaders) {
      const folderName = path.split('/')[4];
      const [name, version] = folderName.split('-');
      formats.push({
        id: folderName,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        version: version || 'unknown',
        iconUrl: iconModules[`/src/assets/story-formats/${folderName}/icon.svg`]?.default || ''
      });
    }
    availableFormats.value = formats;
  };

  // --- 核心：根据故事需求加载特定的衣服 ---
  const activateFormat = async (formatName, formatVersion) => {
    // 1. 拼出文件夹名字
    const id = `${formatName.toLowerCase()}-${formatVersion}`;
    const path = `/src/assets/story-formats/${id}/format.js`;
    
    if (!formatLoaders[path]) {
      console.error(`波波，找不到名为 ${id} 的衣服喵 xwx`);
      return null;
    }

    try {
      // 2. 动态加载这个文件的 raw 内容
      const module = await formatLoaders[path]();
      const rawCode = module.default;

      // 3. 解析并存入 currentFormatData
      const match = rawCode.match(/storyFormat\(([\s\S]*)\);?/);
      if (match) {
        currentFormatData.value = JSON.parse(match[1]);
        console.log(`衣服换好了！现在穿的是：${formatName} ${formatVersion} 喵！`);
        return currentFormatData.value;
      }
    } catch (err) {
      console.error("衣服穿的时候撕破了 xwx", err);
    }
    return null;
  };

  return { availableFormats, currentFormatData, scanFormats, activateFormat };
}
