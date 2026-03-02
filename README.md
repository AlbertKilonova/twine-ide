# Twide

一个为 Twee 格式设计的现代、轻量级、且支持多端的交互式小说编辑器喵！(๑•̀ω•́)ノ

---

## 项目特色 (Features)

* **多端覆盖**：支持 Web (PWA) 访问喵，也可通过 Capacitor 打包为 Android APK 运行喵。
* **本地存储**：基于 IndexedDB 构建，无需联网，数据全在自己的设备里喵。
* **Twee 标准支持**：兼容 StoryData、StoryTitle 以及各种 Passage 格式喵。
* **编译预览**：集成黑星老大的 `tweers-core` (WASM)，支持在应用内直接编译预览你的故事效果喵。
* **可视化视图**：提供关系图谱视图，一眼看清故事的分支逻辑喵。
* **灵活导出**：支持导出为单个 `.twee` 文件或打包成 `.zip` 资源包喵。
* **故事格式管理**：可以自行上传自定义的 Twine 故事格式（Story Formats）喵！

## 技术栈 (Tech Stack)

* **核心框架**: Vue 3 (Composition API)
* **构建工具**: Vite 7.3
* **UI 组件库**: Vant UI 4.9
* **数据存储**: IndexedDB (使用 `idb` 库)
* **跨平台方案**: Capacitor 8.1
* **编译引擎**: tweers-core (Local WASM)



## 快速开始 (Getting Started)

### 1. 环境准备
确保你的电脑已经安装了 Node.js (建议 v20+) 和 Android SDK（如果你要打 APK 的话）。

### 2. 本地开发
```bash
# 克隆仓库喵
git clone https://github.com/AlbertKilonova/twine-ide.git

# 安装依赖喵
npm install

# 启动开发服务器喵
npm run dev
```

### 3. 编译打包
```bash
# 构建 Web 版本喵 (生成 dist 文件夹)
npm run build

# 同步到 Android 工程喵
npm run cap:sync

# 打开 Android Studio 进行调试喵！
npm run cap:open
```

## APK 打包与签名说明

本项目通过 GitHub Actions 自动构建带签名的 APK。

1.  **准备 Keystore**: 使用项目根目录下的 `android-sign.sh` 脚本生成。
2.  **配置 Secrets**: 在 GitHub 仓库设置中添加：
    * `KEYSTORE_BASE64`: 脚本生成的 base64 字符串
    * `KEYSTORE_PASSWORD`: 你的密钥库密码
    * `KEY_ALIAS`: 别名（默认为 `twine-ide`）
    * `KEY_PASSWORD`: 密钥密码
3.  **触发构建**: 推送以 `v*` 开头的 Tag，Actions 会自动起飞帮你打包并发布 Release 喵！

## 项目结构 (Project Structure)

```text
├── android/             # Capacitor Android 工程喵
├── src/
│   ├── assets/          # 静态资源 (含故事格式)
│   ├── components/      # Vue 组件 (编辑器各模块)
│   ├── composables/     # 核心逻辑 (持久化、文件操作等)
│   ├── db/              # IndexedDB 初始化配置
│   └── utils/           # Twee 转义与解析工具
├── tweers-core/         # 本地编译引擎模块
├── vite.config.js       # Vite 与 PWA 配置
└── package.json         # 依赖与脚本定义
```

## 注意事项 (Notes)

> [!IMPORTANT]
> **关于存储安全**：本编辑器使用浏览器本地存储。由于 iOS 系统的 WebKit 机制可能会在空间不足时清理 IndexedDB，请 iOS 用户务必**频繁导出备份**你的作品喵！xwx

## 开源协议

本项目采用 [MIT License](LICENSE) 协议。

## 可能会加进来的功能 ()

### 语法高亮
* [ ] **SugarCube语法高亮**：SugarCube 语法高亮完善喵。
* [ ] **Harlowe语法高亮**：Harlowe 语法高亮完善喵。
* [ ] **自定义高亮支持**：可以自己写高亮喵。

### 编辑器功能增强
* [ ] **搜索替换**：支持在所有段落中快速查找并替换关键字喵。
* [ ] **撤回重做**：支持后悔了喵。
* [ ] **自动补全**：代码补全喵！
* [ ] **从当前片段开始测试**：还原Twine2喵。
* [x] **静态资源管理**：直接把静态资源存在indexedDB里喵，到时候引用只需要@{资源名}就好了喵！（方便呢）
* [x] **构建**：构建最终HTML喵！
* [x] **单文件构建**：把你的静态资源全都转化成base64喵！
* [x] **测试**：Debug喵！
* [ ] **第三方宏管理**：统一管理你导入的第三方宏喵！不需要全都塞到StoryScript里了喵！
* [x] **脚本注入功能**：直接在最终产物里注入脚本喵，不用受限于故事格式啦。
* [ ] **......**：阿巴阿巴

---
**Made with ❤️ by AlbertKilonova & Raven-Book BlackStar & Gemini**
