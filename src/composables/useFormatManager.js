import { ref, unref } from 'vue';
import { showToast } from 'vant';

export function useFormatManager(dbInterface) {
  const availableFormats = ref([]);
  const currentFormatData = ref(null);

  const formatLoaders = import.meta.glob('/src/assets/story-formats/*/format.js', { query: 'raw' });
  const iconModules = import.meta.glob('/src/assets/story-formats/*/icon.svg', { query: 'url', eager: true });

  const scanFormats = async () => {
    console.log("--- 阿波开始查户口了喵 ---");
    console.log("扫描到的文件路径列表:", Object.keys(formatLoaders));
    
    const formats = [];
    
    try {
      // 1. 扫描系统格式
      const paths = Object.keys(formatLoaders);
      if (paths.length === 0) {
        console.error("警告：阿波在 /src/assets/story-formats/ 下一件衣服都没找到喵！路径对吗波？");
      }

      for (const path of paths) {
        const parts = path.split('/');
        const folderName = parts[parts.length - 2]; 
        const [name, version] = folderName.split('-');
        formats.push({
          id: folderName,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          version: version || 'unknown',
          isCustom: false,
          iconUrl: iconModules[`/src/assets/story-formats/${folderName}/icon.svg`]?.default || ''
        });
      }

      // 2. 尝试读取数据库
      const di = unref(dbInterface);
      if (di && typeof di.getAll === 'function') {
        console.log("发现数据库接口，准备读取自定义格式...");
        try {
          const customs = await di.getAll('custom_formats');
          if (customs && customs.length > 0) {
            customs.forEach(c => {
              formats.push({
                id: c.id,
                name: c.name,
                version: c.version,
                isCustom: true,
                iconUrl: ''
              });
            });
          }
        } catch (dbErr) {
          console.error("数据库读取失败，可能是仓库还没建立喵:", dbErr);
        }
      }

      // 最后赋值
      availableFormats.value = formats;
      console.log("最终扫描结果:", formats);

    } catch (globalErr) {
      console.error("扫描过程发生致命错误喵！", globalErr);
      alert("致命错误: " + globalErr.message);
    }
  };

  const uploadFormat = async (file) => {
    try {
      const rawCode = await file.text();
      const match = rawCode.match(/storyFormat\(([\s\S]*)\);?/);
      if (!match) throw new Error('无效的故事格式文件喵');

      const data = JSON.parse(match[1]);
      const formatId = `custom-${data.name.toLowerCase()}-${data.version}`;
      
      const di = unref(dbInterface);
      if (di && di.putItem) {
        await di.putItem('custom_formats', {
          id: formatId,
          name: data.name,
          version: data.version,
          raw: rawCode
        });
        showToast('上传成功喵！');
        await scanFormats();
      } else {
        throw new Error("数据库未就绪喵");
      }
    } catch (err) {
      console.error("上传出错:", err);
      alert("上传失败: " + err.message);
    }
  };

  const activateFormat = async (formatName, formatVersion) => {
    const id = `${formatName.toLowerCase()}-${formatVersion}`;
    const di = unref(dbInterface);
    if (di && di.getAll) {
      const customs = await di.getAll('custom_formats');
      const found = customs.find(c => c.id === `custom-${id}`);
      if (found) {
        const m = found.raw.match(/storyFormat\(([\s\S]*)\);?/);
        return m ? JSON.parse(m[1]) : null;
      }
    }
    const path = `/src/assets/story-formats/${id}/format.js`;
    if (formatLoaders[path]) {
      const module = await formatLoaders[path]();
      const m = module.default.match(/storyFormat\(([\s\S]*)\);?/);
      return m ? JSON.parse(m[1]) : null;
    }
    return null;
  };
  
    const getRawCode = async (id) => {
      const path = `/src/assets/story-formats/${id}/format.js`;
      if (formatLoaders[path]) {
        const module = await formatLoaders[path]();
        return module.default;
      }
      return null;
    };

  return { availableFormats, currentFormatData, scanFormats, uploadFormat, activateFormat, getRawCode };
}
