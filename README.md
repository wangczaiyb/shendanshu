# 🎄 Christmas Light Garden · 3D 实体小物件互动圣诞树

> 专为节日打造的沉浸式 3D 圣诞树互动体验产品。圣诞树完全由**12 种真实的圣诞主题 3D 小物件**（金铃铛、礼盒、拐杖糖、彩球、金星、雪花、姜饼人、圣诞袜、松果、相框等）螺旋汇聚而成。支持通过**摄像头隔空手势**或**移动端/桌面触控**实现圣诞树聚合、近景漫步特写、3D 空间星空散开、实体挂件与记忆照片聚焦放大查看。

---

## ✨ 核心特性

- **🎄 纯正 3D 实体物件构建**：摆脱抽象粒子点云，整棵树由金色铜铃铛（带可动撞锤）、红丝绒礼盒（可开盖）、红白拐杖糖、琉璃彩球、五角金星、水晶雪花、肉桂姜饼人、羊毛圣诞袜、林间松果等 700+ 精致 3D 实体模型构成。
- **🌌 六大场景核心状态**：
  1. `ASSEMBLING`（魔法汇聚）：各挂件从四周飞入螺旋聚合为完整圣诞树。
  2. `TREE_IDLE`（树形驻留）：圣诞树缓慢自转，伴随自然微风呼吸。
  3. `SHOWCASE_ZOOM`（漫步特写）：镜头近距推进并 360° 环绕，特写展现挂件细节。
  4. `EXPLODED`（浪漫星空）：整树小物件散开进入三维星系场，慢速翻滚，手掌移动控制视角。
  5. `OBJECT_FOCUS`（实体聚焦）：选中挂件或照片飞至前景放大，弹出交互 HUD，触发铃铛摇晃、礼盒开盖、拐杖糖旋转等动作。
  6. `REASSEMBLING`（聚拢归位）：散开元素平滑插值回到各自树体坐标。
- **🖼️ 双模式照片放大查看**：
  - **3D 空间近景特写**：聚焦照片时，相框飞至前景中心（5.2 视距，放大 2.5~3.4 倍），正面正对镜头。
  - **全屏高保真照片灯箱 (`PhotoLightbox`)**：点击“放大查看高清大图”或双击照片即可进入影院级全屏展厅，支持 100%~350% 缩放、拖拽平移漫游、缩略图导航与键盘快捷键。
  - **IndexedDB 本地存储**：照片保存在用户本地浏览器 IndexedDB，保护隐私，持久留存。
- **🖐️ 原生精简隔空手势 (MediaPipe)**：
  - 🖐️ **张开手掌 (`OPEN_PALM`)**：散开成为 3D 浪漫星空（空间移动手掌控制视角旋转）
  - ✊ **握紧拳头 (`FIST`)**：所有元素平滑归位为完整圣诞树
  - 👌 **拇食捏合 (`PINCH`)**：精准拾取射线指向的物件或照片放大聚焦
  - 100% 离线模型，无需连接外网 CDN。
- **🎵 Web Audio 圣诞颂歌引擎**：
  - 基于复调音乐盒与钢片琴（Celesta）程序化合成《平安夜》（Silent Night）循环颂歌，附带温暖低音衬底。
  - 包含音量滑动调节、静音控制、后台标签自动暂挂与平滑恢复。
  - 实体物件专属音效库（铃铛清脆铜响、礼盒开盖音、星芒涟漪）。
- **📱 双端极致适配**：
  - 移动端 `100dvh` 与安全区（Safe-Area Insets）适配，自适应 FOV（树顶星与底座不被裁切）。
  - 支持单指拖动旋转、双指捏合缩放视距（22~78 距离）、轻触拾取、双击全屏。

---

## 🛠️ 技术路线

- **前端框架**：React 18 + TypeScript + Vite 5
- **3D 渲染引擎**：Three.js (WebGL 2, HDR Tone Mapping, PMREM, UnrealBloomPass)
- **手势计算机视觉**：@mediapipe/tasks-vision（内置离线 Task 模型）
- **音频系统**：Web Audio API 程序化合成
- **持久化存储**：IndexedDB（原生异步封装）
- **UI 图标**：Lucide React

---

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 本地开发调试
```bash
npm run dev
```

### 3. 生产打包
```bash
npm run build
```

### 4. 预览生产环境
```bash
npm run preview
```

打开浏览器访问 `http://localhost:4173/`，输入默认体验密码 **`2025`** 或 **`GARDEN`** 即可进入。

---

## ⌨️ 快捷键指南

| 按键 | 功能 |
| :--- | :--- |
| `Space` (空格) | 切换 散开星空 (`EXPLODED`) / 聚拢圣诞树 (`TREE_IDLE`) |
| `A` | 触发 魔法汇聚动画 (`ASSEMBLING`) |
| `Z` | 切换 近景漫步特写 (`SHOWCASE_ZOOM`) |
| `←` / `→` | 切换 上一个 / 下一个聚焦物件或回忆照片 |
| `Esc` | 退出聚焦特写 / 关闭照片大图灯箱 |
| `H` | 隐藏 / 显示全部操作界面 |
| `+` / `-` | 灯箱模式下放大 / 缩小照片 |
| `0` | 灯箱模式下恢复 100% 比例 |

---

## ☁️ 一键部署到 Render (Render.com)

本项目已内置 [`render.yaml`](./render.yaml) 自动化配置，可免费托管在 Render 静态站点上：

### 方式 1：通过 Blueprint 自动部署（推荐）
1. 登录 [Render Dashboard](https://dashboard.render.com/)。
2. 点击 **Blueprints** -> **New Blueprint Instance**。
3. 连接 GitHub 仓库 `wangczaiyb/shendanshu`，Render 将自动读取配置完成构建与发布。

### 方式 2：手动创建 Static Site
1. 在 Render Dashboard 点击右上角 **New +** -> **Static Site**。
2. 搜索并选择 `wangczaiyb/shendanshu` 仓库。
3. 填写以下基础配置：
   - **Name**：`shendanshu`（或自定义名称）
   - **Branch**：`main`
   - **Build Command**：`npm install && npm run build`
   - **Publish Directory**：`dist`
4. 点击 **Create Static Site**，等待构建完成后即可通过提供的 `https://*.onrender.com` 域名访问。

---

## 📄 开源许可证

本项目基于 MIT 许可证开源。
