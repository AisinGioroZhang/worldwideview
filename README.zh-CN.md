# WorldWideView 中文说明

WorldWideView 是一个基于 CesiumJS 3D 地球引擎构建的实时地理空间情报平台。它通过插件化架构接入航空、海事、卫星、冲突事件、网络攻击、GPS 干扰、野火等多种全球数据源，并将这些高频、动态、异构的数据流渲染为可交互的三维可视化图层。

这个项目的目标不是单纯“展示地图”，而是建立一套面向实时态势感知的地球引擎：从数据接入、转换、调度、缓存、渲染到 UI 交互，形成一条可扩展、可维护、可持续演进的完整链路。

## 项目介绍

WorldWideView 面向以下场景：

- 实时全球态势感知与可视分析
- 航空、海事、卫星等动态目标监控
- 冲突事件、制裁、基础设施等情报图层叠加
- 多数据源统一接入、统一渲染、统一交互
- 基于插件的行业专题地图或专用监控平台开发

项目的核心思想有四个：

- 插件优先：每一种数据能力都被抽象成插件，核心引擎本身不绑定特定业务数据源。
- 高性能渲染：优先使用 Cesium Primitive 管线而不是高层 Entity API，以支持高密度、实时更新的数据图层。
- 事件驱动：围绕 DataBus、Store 和渲染管线构建响应式数据流，降低耦合度。
- 单体前端加多包工作区：主应用、数据引擎、插件 SDK 与各类插件通过 pnpm workspace 统一组织。

## 核心能力

- 基于 Next.js 16 App Router 的三维地球应用框架
- 基于 CesiumJS 和 Resium 的高保真三维地球渲染
- 基于 Zustand 的多切片状态管理
- 面向实时数据流的插件注册、生命周期管理与图层控制
- 支持静态 GeoJSON、代理 API 和独立微服务三类插件模式
- 面向大规模点位和图标对象的批量渲染与性能优化
- 支持本地部署、云部署和演示版三种运行 edition
- 内置认证、数据库、环境配置、分析埋点与测试体系

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端框架 | Next.js 16、React 19、TypeScript 5 |
| 三维地球 | CesiumJS、Resium |
| 状态管理 | Zustand |
| 数据与事件 | 自定义 DataBus、轮询管理、缓存层 |
| 插件系统 | pnpm workspace + 自定义 Plugin SDK |
| 数据库 | Prisma + SQLite |
| 身份认证 | NextAuth v5 beta |
| 测试 | Vitest、Testing Library、jsdom |
| 部署 | Docker、standalone 输出 |

## 架构概览

整个项目可以理解为四层：

1. 数据接入层：插件从远程 API、GeoJSON 文件或独立后端获取数据。
2. 数据处理层：插件把原始数据映射为统一实体结构，经由 DataBus 和 Store 分发。
3. 渲染层：Cesium Primitive 集合负责批量绘制点、图标、标签和模型。
4. 交互层：UI 面板、过滤器、时间线、图层控制和信息卡片负责用户操作与展示。

典型数据流如下：

```text
远程数据源 / 静态数据 / 微服务
        ↓
      插件层
        ↓
  DataBus / Store
        ↓
GlobeView / EntityRenderer
        ↓
 Cesium 3D Globe
        ↓
  用户交互与分析
```

其中最关键的设计点在于：

- 插件只负责获取和映射数据，不直接耦合 UI。
- 引擎通过统一接口管理插件生命周期，降低新图层接入成本。
- 渲染层使用 Primitive 批处理机制，适合大量实时对象。
- UI 与数据流通过状态层解耦，便于扩展和维护。

## 插件体系

WorldWideView 的所有数据图层都通过插件接入。插件通常分为三类：

- 静态插件：从 public 目录中的 GeoJSON 或静态数据文件读取。
- 代理插件：通过 Next.js API 路由代理外部接口，解决鉴权、限流或跨域问题。
- 微服务插件：由独立 backend 提供数据处理或持久化能力，适合更复杂的数据链路。

当前仓库已经包含多类插件，例如：

- 航空、军机、海事、卫星、监视卫星
- 冲突事件、冲突区域、民间骚乱、网络攻击
- 野火、地震、GPS 干扰、国际制裁
- 机场、海港、灯塔、核设施、太空港、火山、海底电缆等

这意味着该项目既可以作为一个完整应用运行，也可以作为开发定制化情报地球平台的基础框架使用。

## 目录结构

```text
worldwideview/
├── docs/                  # 项目文档
├── packages/              # 数据引擎、插件 SDK、业务插件包
├── prisma/                # Prisma schema 与迁移文件
├── public/                # 静态资源、Cesium 资源、GeoJSON 数据
├── scripts/               # 安装、构建、资源复制等脚本
├── src/
│   ├── app/               # Next.js App Router 页面与 API
│   ├── components/        # UI 组件
│   ├── core/              # 核心引擎：globe、data、plugins、state
│   ├── lib/               # 服务端工具、认证、数据库与通用库
│   ├── plugins/           # 应用内插件注册与装配逻辑
│   ├── styles/            # 全局与 HUD 样式
│   └── types/             # 类型定义
└── package.json           # 根脚本与工作区依赖入口
```

## 快速开始

### 环境要求

- Node.js 18.17 及以上，建议使用 Node.js 20+
- pnpm 8 及以上
- 支持 WebGL 的现代浏览器，如 Chrome、Edge、Firefox

### 安装步骤

```bash
git clone https://github.com/silvertakana/worldwideview.git
cd worldwideview
pnpm install
pnpm run setup
pnpm run dev:all
```

启动后访问 [http://localhost:3000](http://localhost:3000)。

说明：

- `pnpm install` 安装整个 monorepo 的依赖。
- `pnpm run setup` 会生成 `.env.local` 并写入 `AUTH_SECRET`。
- `pnpm run dev:all` 会同时启动主应用和 `wwv-data-engine` 开发服务。

## 常用命令

```bash
pnpm run setup           # 初始化本地环境文件
pnpm run dev             # 启动 Next.js 开发服务
pnpm run dev:all         # 启动主应用 + 数据引擎
pnpm run build           # 生产构建
pnpm run start           # 启动生产环境服务
pnpm run test            # 运行测试
pnpm run start:backends  # 启动后端数据引擎
pnpm run clean:backends  # 清理后端数据库
pnpm run db:reset        # 重置 Prisma 数据库
```

## 环境变量

首次开发至少需要准备以下配置：

- `DATABASE_URL`：数据库连接，默认可使用 SQLite 本地文件
- `AUTH_SECRET`：认证签名密钥
- `NEXT_PUBLIC_WWV_EDITION`：运行版本，可选 `local`、`cloud`、`demo`

可选增强配置包括：

- `NEXT_PUBLIC_CESIUM_ION_TOKEN`
- `NEXT_PUBLIC_BING_MAPS_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `OPENSKY_CREDENTIALS`
- `WWV_BRIDGE_TOKEN`
- `WWV_DEMO_ADMIN_SECRET`
- `IRANWARLIVE_BACKEND_URL`

建议：

- 将敏感信息放在 `.env.local`
- 将非敏感默认配置放在 `.env`
- 不要把 `.env.local` 提交到版本库

## 开发与维护建议

- 新增数据图层时，优先判断应实现为静态插件、代理插件还是微服务插件。
- 涉及三维渲染性能时，优先沿用现有 Primitive 渲染模式，不要轻易退回高层 Entity API。
- 若新增插件包，需要同步更新工作区配置、路径别名以及必要的转译配置。
- 本项目采用 pnpm workspace 管理多包，请始终在仓库根目录执行依赖安装与统一脚本。

## 文档导航

- [docs/SETUP.md](docs/SETUP.md)：安装与本地开发说明
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：系统架构与渲染管线说明
- [docs/PLUGIN_GUIDE.md](docs/PLUGIN_GUIDE.md)：插件系统与扩展方式
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md)：内部接口与核心模块说明
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md)：应用使用说明
- [docs/index.md](docs/index.md)：文档索引

## 适合谁使用

如果你符合以下任一情况，这个项目会比较适合：

- 你需要一个可二次开发的实时三维地球可视化底座。
- 你正在构建航空、海事、卫星、灾害、地缘事件等专题态势平台。
- 你希望通过插件方式快速扩展新的情报图层，而不破坏核心架构。
- 你需要一个同时覆盖前端渲染、数据管线、认证和部署能力的完整工程模板。

## 许可与使用说明

项目中的部分数据源、图标或外部素材可能受到各自上游来源的使用条款约束。将本项目用于生产环境或对外发布时，建议逐项核查相关数据、媒体素材和第三方服务的授权条件与合规要求。
