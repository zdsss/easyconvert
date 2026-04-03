# EasyConvert 第二轮迭代设计文档

> 版本: v1.0 | 日期: 2026-04-03 | 状态: 已批准

## 1. 背景与现状

### 1.1 项目概述
EasyConvert 是基于 LLM 的简历解析系统，支持多格式简历智能提取、评测、API 服务。

### 1.2 当前实现状态

**已落地功能：**
- 后端 Express 全套：7 个路由文件、3 个中间件（认证/限流/日志）、6 个 DB migration
- 多 LLM Provider 支持：Qwen、DeepSeek、Claude、OpenAI
- 前端 36 个组件、8 个页面、7 个 Zustand Store
- 解析引擎：9 策略矩阵 + 双层分类 + IndexedDB 缓存 + 3 级验证
- API 管理：密钥生成/吊销、滑动窗口限流、多租户、用量统计
- 数据库：PostgreSQL + 内存 DB 双模式

**健康状况摸底：**
- 构建：TypeScript 编译通过，Vite build 成功（1.8MB chunk 警告）
- 测试：16 个测试文件，9 个完整，7 个残缺（仅测错误路径）
- 双 DB：内存实现覆盖所有路由操作，但未经系统性验证
- 配置：server/tsconfig 路径别名与前端不一致（非阻塞）

### 1.3 现有测试缺口

| 测试文件 | 状态 | 缺失 |
|---------|------|------|
| parsePdf.test.ts | 残缺 | 缺正常解析 happy path |
| parseDocx.test.ts | 残缺 | 缺正常解析 happy path |
| cache.test.ts | 残缺 | 缺缓存命中/写入成功场景 |
| extractWithLLM.test.ts | 部分 | 缺完整提取流程 |
| batchProcessor.integration.test.ts | 残缺 | 仅 1 个场景 |
| logger.test.ts | 残缺 | 仅基础测试 |
| server/parse.test.ts | 残缺 | 仅验证路由存在 |

## 2. 迭代策略

**方案：严格分阶段（方案 A）**

```
第 1-2 周: 稳定化 + 测试
第 3-4 周: 功能补全 + 体验优化
第 5-6 周: 新能力扩展
```

每个阶段有明确的交付标准，前一阶段不达标不进入下一阶段。

## 3. 第一阶段：稳定化 + 测试（第 1-2 周）

**目标：所有现有功能可验证、可信赖，双 DB 模式全部跑通**

### 3.1 修复与补全现有测试（第 1 周前半）

修复 7 个残缺测试文件，补全 happy path：

- `parsePdf.test.ts` — 补正常 PDF 解析流程（文本提取、页面处理）
- `parseDocx.test.ts` — 补正常 DOCX 解析流程（段落提取、格式处理）
- `cache.test.ts` — 补缓存命中/写入成功/过期清理场景
- `extractWithLLM.test.ts` — 补完整提取流程 + 错误分类验证
- `batchProcessor.integration.test.ts` — 补多文件批量场景（全成功/部分失败/全失败）
- `logger.test.ts` — 补日志级别过滤和格式化验证
- `server/parse.test.ts` — 从"路由存在"升级到"端点行为验证"

### 3.2 后端 API 集成测试（第 1 周后半）

使用 supertest 为 7 个路由文件编写集成测试：

| 路由 | 测试范围 |
|------|---------|
| evaluations | CRUD 全流程、分页、状态过滤 |
| annotations | 单条上传、批量上传、关联验证 |
| reports | 报告生成、趋势查询、分布统计、错误分析、成本报告 |
| keys | 密钥生成/列表/软删除、权限验证 |
| usage | 用量统计、概览数据、时间窗口 |
| parse | 同步解析、异步提交/查询、批量处理 |
| parseHistory | 历史记录 CRUD、搜索/分页 |

每个测试同时覆盖内存 DB 和 PostgreSQL 模式（通过环境变量切换）。

### 3.3 前端组件测试（第 2 周前半）

使用 React Testing Library 编写关键组件测试：

**组件测试：**
- `FileUpload` — 文件选择、拖拽上传、格式校验、大小限制
- `ParseResultTabs` — Tab 切换、数据渲染、空状态
- `AnnotationEditor` — 字段编辑、保存、验证反馈
- `Dashboard` — 指标卡渲染、数据加载状态
- `ProgressTracker` — 阶段进度展示、状态切换

**Store 测试：**
- `parseStore` — 解析状态流转、阶段追踪
- `evaluationStore` — 任务 CRUD、结果管理
- `monitoringStore` — 指标更新、成本计算

### 3.4 端到端流程测试（第 2 周后半）

核心业务流程 E2E 验证：

1. **解析流程**：上传 PDF → 解析 → 结果展示 → 再次上传相同文件 → 缓存命中
2. **批量流程**：批量上传 → 进度追踪 → 全部完成/部分失败处理
3. **评测流程**：创建评测任务 → 上传标注 → 运行评测 → 生成报告
4. **API 流程**：创建密钥 → Bearer 认证调用 → 限流触发 → 429 响应

双 DB 模式各跑一遍。

### 3.5 基础设施修复

- 路由级代码分割解决 1.8MB chunk 警告（React.lazy + Suspense）
- 统一 server/tsconfig.json 路径别名与根 tsconfig 一致
- 确保 `npm run build` + `npm run test` 零警告零失败

### 交付标准

- [ ] 所有 16+ 测试文件全部通过
- [ ] 7 个路由的集成测试覆盖率 > 80%
- [ ] 关键前端组件测试通过
- [ ] 4 条 E2E 流程双 DB 模式全部通过
- [ ] `npm run build` 零警告
- [ ] `npm run test` 零失败

## 4. 第二阶段：功能补全 + 体验优化（第 3-4 周）

**目标：所有已有页面和组件达到可用状态，UI/UX 打磨到位**

### 4.1 评测系统完善（第 3 周前半）

- `ComparisonView` — 解析结果 vs 标注的对比视图，字段级 diff 高亮
- `AccuracyHeatmap` — 按字段维度的准确率热力图（Recharts）
- `TrendChart` — 跨任务准确率趋势折线图
- `DistributionChart` — 分类分布饼图/柱状图
- `ReportView` 页面 — 完整报告展示 + 导出（PDF/JSON）

### 4.2 批量处理体验（第 3 周后半）

- `BatchPage` — 批量上传进度条、错误恢复、单文件重试
- `ProcessTimeline` — 单文件 11 阶段处理时间线可视化
- `ParseHistoryPage` — 历史记录搜索/筛选/分页/批量删除
- `ParseHistoryDrawer` — 侧边栏快速预览历史记录详情

### 4.3 核心解析体验（第 4 周前半）

- `ParsePage` — 解析结果多 Tab 展示（原始文本/结构化/JSON/验证）
- `AnnotationEditor` — 标注编辑器完善（字段级编辑、实时验证、diff 对比）
- `SearchModal` — 全局搜索（简历、评测任务、历史记录）
- `FilePreviewCard` — 文件预览卡片（PDF 缩略图、文件元信息）

### 4.4 API 管理与监控（第 4 周后半）

- `ApiOverview` — API 总览仪表盘（活跃密钥数、请求量、限流状态）
- `ApiKeys` — 密钥生命周期管理（创建/吊销/过期提醒/权限范围）
- `ApiUsage` — 用量图表（按天/按端点/延迟分布 P50/P95/P99）
- `MonitorPage` — 实时监控（成本追踪、性能指标、缓存命中率、错误率）

### 交付标准

- [ ] 每个功能模块自带单元/集成测试
- [ ] 所有页面可交互、数据与后端联通
- [ ] 响应式布局适配（桌面/平板/移动端）
- [ ] 暗色模式全部页面适配
- [ ] 无控制台错误和警告

## 5. 第三阶段：新能力扩展（第 5-6 周）

**目标：扩展系统能力边界，TDD 驱动开发**

### 5.1 更多文件格式（第 5 周前半）

- 图片简历 OCR 支持（Tesseract.js 或云端 OCR API）
- 扫描版 PDF 识别（pdf.js 文本检测 + OCR fallback）
- 纯文本 / Markdown 简历解析
- 文件格式自动检测与解析器路由

**技术方案：**
- 扩展 `parsers/registry.ts` 注册新解析器
- OCR 结果接入现有 LLM 提取管道
- 分类系统新增 `image` / `scanned` 类型

### 5.2 简历模板导出（第 5 周后半）

- 解析结果 → Word 模板导出（docx-templates 库）
- 解析结果 → PDF 模板导出（react-pdf 或 puppeteer）
- 3-5 套预设模板（简约/专业/创意/学术/技术）
- 模板预览 + 自定义字段映射界面

### 5.3 AI 辅助标注（第 6 周前半）

- LLM 预标注：解析结果自动生成标注初稿，减少人工工作量
- 置信度标记：低置信度字段高亮提示人工审核
- 主动学习：基于人工修正反馈优化提示词策略
- 标注质量评分：自动检测标注一致性和完整度

### 5.4 多语言支持（第 6 周后半）

- 英文简历解析（提示词适配 + 字段映射）
- 日文简历解析（履歴書/職務経歴書格式处理）
- 语言自动检测（基于文本特征 + LLM 辅助）
- 多语言 UI 国际化（i18next 框架接入）

### 5.5 附加能力（贯穿第 5-6 周）

- OpenAPI/Swagger 文档自动生成（swagger-jsdoc + swagger-ui-express）
- Webhook 通知（异步解析完成回调，支持自定义 URL）
- 简历质量评分（完整度/规范度/竞争力多维评分）
- 简历去重检测（基于关键字段的相似度计算）

### 交付标准

- [ ] 每个新能力 TDD 驱动，先写测试再实现
- [ ] 独立测试套件，覆盖率 > 80%
- [ ] API 文档自动生成并可访问
- [ ] 新能力不影响现有功能（回归测试通过）

## 6. 技术决策

| 决策项 | 选择 | 理由 |
|-------|------|------|
| 测试框架 | Vitest + React Testing Library + supertest | 已有基础，统一技术栈 |
| E2E 测试 | Vitest 集成测试模式 | 轻量，不引入 Playwright 复杂度 |
| 代码分割 | React.lazy + Suspense | 原生方案，无额外依赖 |
| OCR | Tesseract.js（前端）/ 云端 API（后端） | 前端轻量场景用 Tesseract，后端批量用云端 |
| 模板导出 | docx-templates + react-pdf | 社区成熟，维护活跃 |
| 国际化 | i18next + react-i18next | 生态最完善 |
| API 文档 | swagger-jsdoc + swagger-ui-express | Express 生态标配 |

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 内存 DB 与 PG 行为不一致 | 测试通过但生产失败 | 关键路径双模式测试 |
| OCR 精度不足 | 图片简历解析质量差 | 多 OCR 引擎对比 + LLM 后处理修正 |
| 1.8MB chunk 影响首屏 | 用户体验差 | 路由级代码分割 + 预加载 |
| 多语言提示词适配 | 非中文简历准确率低 | 分语言测试集 + 独立提示词模板 |
| 第三方库兼容性 | 构建失败 | 锁定版本 + CI 验证 |

## 8. 里程碑

| 里程碑 | 时间 | 交付物 |
|-------|------|-------|
| M1: 测试全绿 | 第 1 周末 | 现有测试修复 + API 集成测试 |
| M2: 双模式稳定 | 第 2 周末 | 前端测试 + E2E + 基础设施修复 |
| M3: 评测+批量完善 | 第 3 周末 | 评测系统 + 批量处理功能完整 |
| M4: 全功能可用 | 第 4 周末 | 核心解析 + API 管理 + 监控完善 |
| M5: 格式+导出 | 第 5 周末 | OCR 支持 + 模板导出 |
| M6: AI标注+多语言 | 第 6 周末 | AI 辅助标注 + 多语言 + 附加能力 |
