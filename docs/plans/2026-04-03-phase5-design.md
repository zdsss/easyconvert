# EasyConvert Phase 5 — 智能优化与数据飞轮设计文档

**日期：** 2026-04-03
**状态：** 已批准，待实施

---

## 背景

Phase 1-4 已完成核心解析引擎、评测系统、API 服务、多语言支持、生产就绪基础设施。Phase 5 聚焦系统的自我优化能力：通过数据飞轮驱动提示词持续改进，增强批量评测能力，并补全用量报表和缓存预热。

---

## C1. 提示词优化闭环

### 目标
基于标注数据自动分析低准确率字段，生成优化建议，支持 A/B 测试新旧提示词效果。

### 架构
- `src/lib/promptOptimizer.ts` — 纯函数，分析 `fieldMetrics` 数组，找出准确率 < 0.7 的字段，生成针对性提示词补丁建议
- `src/pages/PromptLabPage.tsx` — 提示词实验室页面
  - 字段准确率分布表（按准确率升序排列）
  - 当前提示词展示（只读）
  - AI 生成的优化建议（调用 LLM 分析低准确率字段）
  - A/B 测试：选择两个评测任务对比字段级准确率差异
- 后端：`GET /api/prompt-experiments`、`POST /api/prompt-experiments`（存储实验记录到内存/DB）

### 数据流
```
评测结果 fieldMetrics → promptOptimizer 分析 → 低准确率字段列表
→ LLM 生成优化建议 → 用户确认 → 新提示词写入 prompts.ts
→ 新评测任务 → 对比准确率 → 选优
```

---

## C2. 批量评测增强

### 目标
支持 100+ 文件评测、断点续传、跨版本任务结果对比。

### 架构
- 评测任务分批处理：每批 20 个文件，失败的文件可单独重试（不影响其他文件）
- `EvaluationList` 新增"对比任务"功能：勾选两个任务 → 展示字段级准确率差异表（delta 列）
- 进度持久化：`evaluation_tasks.stats` JSONB 字段记录已完成/失败文件数，刷新页面不丢失
- `src/components/EvaluationCompareModal.tsx` — 跨任务对比弹窗

### 关键变更
- `server/routes/evaluations.ts`：新增 `POST /:id/retry-failed`（重试失败文件）
- `src/pages/EvaluationList.tsx`：多选 checkbox + "对比选中" 按钮
- `src/lib/store/evaluationStore.ts`：支持分页加载结果

---

## C3. 数据飞轮

### 目标
从解析历史中挖掘高价值标注候选，主动学习，自动扩充测试集。

### 架构
- `src/lib/activeLearning.ts` — 从 parseHistory 中筛选候选：
  - 置信度平均 < 0.75（`additional._confidence` 各字段均值）
  - 尚未加入任何评测任务
  - 按置信度升序排列（最不确定的优先）
- `src/pages/DataFlywheel.tsx` — 数据飞轮页面
  - 候选列表（文件名、语言、质量分、平均置信度）
  - 批量勾选 → "加入评测任务" 按钮
  - 测试集统计面板（总量、语言分布、难度分布饼图）
- 后端：`GET /api/data-flywheel/candidates`（从 parse_history 查询低置信度记录）

---

## C4. 解析结果缓存预热

### 目标
批量上传时后台异步预解析并缓存，下次访问秒出结果。

### 架构
- `POST /api/parse/prefetch` — 接收文件 hash 列表，检查哪些不在缓存中，将未缓存的加入 jobQueue 异步处理
- 前端：`BatchPage` 上传完成后，自动调用 prefetch 接口
- 响应：`{ queued: N, alreadyCached: M }` — 告知用户有多少文件已在缓存

### 实现
- 复用现有 `jobQueue` 和 `resumeProcessor`
- 新增 `server/routes/parse.ts` 中的 `POST /prefetch` 路由

---

## C5. 用量报表导出

### 目标
ApiUsage 页面支持导出 CSV 报表和打印 PDF，覆盖 7/14/30 天时间窗口。

### 架构
- `src/pages/ApiUsage.tsx` 新增导出按钮组：
  - "导出 CSV"：已有基础实现，扩展为包含延迟分布数据
  - "导出 PDF"：`window.print()` + `@media print` CSS 隐藏非报表元素
- `src/lib/export/usageReport.ts` — 生成完整 CSV（按天请求量、端点统计、延迟分布、Token 用量）
- 打印样式：`src/index.css` 新增 `@media print` 规则，隐藏 Sidebar/TopBar，展示完整报表

---

## 执行顺序

**并行推进：**
- C1（提示词优化）→ C2（批量评测增强）：依赖评测数据，顺序执行
- C3（数据飞轮）：独立，可并行
- C4（缓存预热）：独立，最简单，先做
- C5（用量报表）：独立，最简单，先做

**推荐顺序：** C4 → C5 → C3 → C2 → C1

---

## 验收标准

- [ ] `promptOptimizer` 能从 fieldMetrics 中识别低准确率字段
- [ ] PromptLabPage 展示字段准确率分布 + A/B 对比
- [ ] 评测任务支持失败文件单独重试
- [ ] EvaluationList 支持两个任务对比
- [ ] DataFlywheel 候选列表按置信度排序
- [ ] 候选文件可一键加入评测任务
- [ ] `POST /api/parse/prefetch` 返回 queued/alreadyCached 统计
- [ ] ApiUsage 导出 CSV 包含完整数据
- [ ] ApiUsage 打印 PDF 隐藏导航栏
- [ ] `npm run test -- --run` 零失败
- [ ] `npm run build` 无 >500KB chunk
