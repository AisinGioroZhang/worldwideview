# WorldWideView 海量数据优化说明

本文总结项目中已实现的海量数据优化策略，覆盖前端渲染、数据传输、缓存与数据引擎侧。

## 1. 前端渲染侧优化

### 1.1 使用 Primitive 渲染替代 Entity API
- 使用 PointPrimitiveCollection、BillboardCollection、LabelCollection、PolylineCollection 管线，减少高层封装开销。
- 相关实现：src/core/globe/EntityRenderer.ts、src/core/globe/primitiveOps.ts。

### 1.2 大数据分块渲染，避免主线程长阻塞
- 当可见实体超过 500 时走 chunked 渲染分支。
- ChunkedProcessor 以分片方式处理，每片处理后让出一帧，显著降低卡顿。
- 相关实现：src/core/globe/hooks/useEntityRendering.ts、src/core/globe/ChunkedProcessor.ts、src/core/globe/EntityRenderer.ts。

### 1.3 requestRenderMode 按需重绘
- 开启 requestRenderMode，只在有变化时 requestRender，避免持续满帧重绘。
- 相关实现：src/core/globe/hooks/useViewerInitialization.ts。

### 1.4 动静分桶 + 稀疏静态更新
- 动态目标每帧更新，静态目标按帧间隔执行地平线裁剪检查。
- 减少了对大量静态点位的重复计算。
- 相关实现：src/core/globe/AnimationLoop.ts。

### 1.5 手动地平线裁剪
- 使用数学方式判断地平线遮挡，快速隐藏不可见对象。
- 相比依赖复杂深度链路，CPU 成本更可控。
- 相关实现：src/core/globe/AnimationLoop.ts。

### 1.6 聚类与蜘蛛化的稳定策略
- 相机高度变化达到阈值才触发重聚类，避免频繁抖动重算。
- 带重建冷却和粘性保护，降低高频缩放时开销。
- 相关实现：src/core/globe/hooks/useEntityRendering.ts、src/core/globe/StackManager.ts。

### 1.7 3D 模型 LOD 提升
- 仅近距离实体提升为 3D 模型，远处保留 billboard/point。
- 并发模型数量有上限，保护 GPU。
- 相关实现：src/core/globe/hooks/useModelRendering.ts。

### 1.8 缓存与零碎分配优化
- 颜色缓存、scratch 对象复用、稳定数组缓存，减少频繁 GC。
- 渲染配置结果缓存，避免重复执行 renderEntity 生成对象。
- 相关实现：src/core/globe/renderCaches.ts、src/core/globe/renderOptionsCache.ts。

### 1.9 Label 生命周期优化
- hover/selected 才显示 label，隐藏优先不删除，避免反复触发底层缓冲重建。
- 相关实现：src/core/globe/AnimationLoop.ts、src/core/globe/EntityRenderer.ts。

## 2. 前端数据编排与状态更新优化

### 2.1 WebSocket 订阅化拉流
- 仅对启用图层订阅，按插件维度收流。
- 减少无关数据处理和状态更新。
- 相关实现：src/components/layout/DataBusSubscriber.tsx、src/core/data/WsClient.ts。

### 2.2 reconnect 后自动重订阅
- 连接恢复后自动恢复 activeSubscriptions，降低断线期间数据漂移。
- 相关实现：src/core/data/WsClient.ts。

### 2.3 状态更新异步化防爆栈
- dataUpdated 到 store 写入使用 setTimeout(0) 延后一个 tick。
- 避免大规模同步更新触发 React 深度更新异常。
- 相关实现：src/components/layout/DataBusSubscriber.tsx。

### 2.4 启用图层时先读缓存
- 先读内存/持久缓存再等实时流，提升首屏可见速度。
- 相关实现：src/core/plugins/PluginManager.ts、src/core/data/CacheLayer.ts。

## 3. 缓存与持久层优化

### 3.1 前端双层缓存
- 内存 Map + IndexedDB 双层缓存，支持 TTL 失效。
- 相关实现：src/core/data/CacheLayer.ts。

### 3.2 后端快照写入节流 + 压缩
- WebSocket 广播实时发送，但 Redis 快照写入按窗口节流。
- 快照 gzip 压缩后落 Redis，降低带宽和存储成本。
- 相关实现：packages/wwv-data-engine/src/redis.ts。

### 3.3 订阅时立即下发最新快照
- 新订阅连接立刻推送最近快照，减少等待下个轮询周期。
- 相关实现：packages/wwv-data-engine/src/websocket.ts。

## 4. 数据引擎侧优化

### 4.1 Poller 缓冲区只保留最新批次
- 抓取结果先入 messageBuffer，flush 时仅使用最新批次并清空旧队列。
- 在高频更新下可避免积压导致的延迟扩散。
- 相关实现：packages/wwv-data-engine/src/seeders/aviation.ts。

### 4.2 批量事务写入历史表
- 写历史数据使用事务批量提交，减少 DB 事务开销。
- 相关实现：packages/wwv-data-engine/src/seeders/aviation.ts。

### 4.3 凭证轮转与限流保护
- 根据剩余额度动态轮换 OpenSky 凭证，降低单凭证耗尽风险。
- 相关实现：packages/wwv-data-engine/src/seeders/aviation.ts。

## 5. 现有机制下的压测建议

- 前端压测：优先测试 point/billboard 模式，再测试 model 模式，观察 FPS 与内存。
- 分层压测：先验证单图层 10k、50k、100k，再叠加多图层看状态更新成本。
- 网络压测：观察 WS 订阅数增加时的广播吞吐与重连恢复时间。
- 缓存压测：观察 Redis 节流窗口内的实时广播与快照一致性。

## 6. 结论

项目已经在渲染、数据链路、缓存和引擎写入四个层面做了系统性的“海量数据优化”。
核心思路是：
- 前端按需渲染与分块更新。
- 数据按订阅精确分发。
- 缓存读写分层与节流压缩。
- 后端优先最新数据与批处理落库。

这套组合可在高实体量场景下显著降低卡顿、掉帧和延迟堆积风险。
