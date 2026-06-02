# 楚汉 (Chuhan)

跨平台中国象棋 GUI，对 [ccbridge-arena](https://github.com/maksimKorzh/ccbridge-arena) 的重构版本。

UI 设计与交互模式参考 [En Croissant](https://github.com/franciscoBSalgueiro/en-croissant)。

## 技术栈

| 层级 | 技术 |
|------|------|
| **桌面壳** | Tauri v2 (Rust 后端) |
| **前端框架** | React 19 + TypeScript 5 |
| **构建工具** | Vite 8 |
| **UI 组件库** | Mantine v7 |
| **状态管理** | Zustand (游戏树) + Jotai (全局 UI) |
| **面板布局** | react-mosaic-component |
| **标签拖拽** | @hello-pangea/dnd |
| **图表** | Recharts |
| **棋盘渲染** | xiangqiboardjs |
| **内置引擎** | Wukong (JavaScript) |

## 功能

- 查看/编辑 UBB 格式棋谱
- 与引擎对弈（支持 UCI/UCCI 协议）
- 引擎 vs 引擎对弈
- 棋谱注释与变例管理
- 内置 Wukong 引擎

## 开发环境要求

- [Rust](https://www.rust-lang.org/) (>= 1.77)
- [Node.js](https://nodejs.org/) (>= 20)
- [Tauri CLI](https://tauri.app/start/prerequisites/)

```bash
npm install -g @tauri-apps/cli
```

## 运行开发服务器

```bash
# 安装依赖
npm install

# 启动 Tauri 开发模式
npm run tauri dev
```

## 构建生产版本

```bash
# 构建前端 + Rust 后端
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`。

## 项目结构

```
├── src/                    # React 前端源码
│   ├── components/
│   │   ├── boards/         # 棋盘相关组件
│   │   │   ├── Board.tsx       # 象棋棋盘
│   │   │   ├── EvalBar.tsx     # 评估条
│   │   │   └── BoardAnalysis.tsx # 分析面板容器
│   │   ├── panels/         # 侧边面板
│   │   │   └── analysis/
│   │   │       └── AnalysisPanel.tsx # 引擎分析面板
│   │   ├── tabs/           # 标签页系统
│   │   │   ├── TabHeader.tsx   # 可拖拽标签栏
│   │   │   └── BoardsPage.tsx  # 棋盘页面
│   │   ├── layout/         # 布局组件
│   │   │   ├── SideBar.tsx     # 左侧导航栏
│   │   │   ├── TopBar.tsx      # 顶部标题栏
│   │   │   └── MosaicLayout.tsx # 可调整面板布局
│   │   ├── common/         # 通用组件
│   │   │   └── EvalChart.tsx   # 评估走势图
│   │   ├── MoveList.tsx    # 着法列表
│   │   ├── EnginePanel.tsx # 引擎面板
│   │   ├── CommentBox.tsx  # 注释框
│   │   └── GameInfo.tsx    # 对局信息
│   ├── state/
│   │   ├── treeStore.ts    # Zustand 游戏树状态管理
│   │   └── uiStore.ts      # Jotai 全局 UI 状态
│   ├── hooks/
│   │   ├── useEngine.ts    # Tauri 引擎通信 Hook
│   │   └── useSound.ts     # 声音播放 Hook
│   ├── utils/
│   │   └── ubbParser.ts    # UBB 棋谱解析器
│   ├── types/
│   │   └── xiangqi.ts      # 核心类型定义
│   └── App.tsx             # 根组件
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── main.rs         # 入口
│   │   └── engine.rs       # 引擎进程管理
│   └── capabilities/       # 权限配置
├── public/libs/            # 第三方库（xiangqiboardjs, wukong）
├── sample_games/           # 示例棋谱
└── legacy/                 # 旧版 ccbridge-arena 代码
```

## 许可证

MIT
