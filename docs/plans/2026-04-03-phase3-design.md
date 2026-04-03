# EasyConvert Phase 3 — 新能力扩展设计文档

**日期：** 2026-04-03
**状态：** 已批准，待实施

---

## 背景

Phase 1+2 已完成：后端 7 路由、前端 11 页面、73 个测试全部通过、Vite 分包无 >500KB chunk。Phase 3 在现有管道上叠加四个方向的新能力，不重构核心流程。

---

## 执行批次

**Batch 1（并行）：** 5.1 格式扩展 + 5.5 轻量增强
**Batch 2（并行）：** 5.3 AI 辅助标注 + 5.2 模板导出

---

## 5.1 格式扩展

### 新增解析器

- `src/lib/parsers/parseText.ts` — 读取 `.txt` 文件内容，直接送 LLM 提取
- `src/lib/parsers/parseMarkdown.ts` — 用 `marked` 将 `.md` 转纯文本，再送 LLM

### 扫描版 PDF（Claude Vision）

**检测逻辑：** `pdfjs-dist` 提取文本 < 50 字符 → 判定为扫描版 PDF

**处理流程：**
1. 用 `pdfjs-dist` 将每页 render 到 OffscreenCanvas（或普通 canvas）
2. `canvas.toDataURL('image/png')` → base64 字符串
3. 构造 Claude `image` content block 数组
4. 发送给 Claude，prompt 要求直接返回结构化简历 JSON
5. 跳过中间文本提取步骤，直接得到结构化结果

**代码变更：**
- `src/lib/extractWithLLM.ts`：新增 `imageBlocks?: ImageBlock[]` 参数，当存在时将图片插入 messages
- `src/lib/parsers/parsePdf.ts`：检测扫描版后调用 Vision 路径
- `src/lib/parserRegistry.ts`：注册 `.txt` / `.md` 入口

### Token 成本说明

扫描版 PDF 每页约消耗 1000-2000 input tokens（图片），比纯文本高 3-5 倍，在 MonitorPage 成本追踪中可见。

---

## 5.5 轻量增强

### 质量评分（Quality Score）

解析完成后计算 `qualityScore`（0-100），附在 parse 结果的 `meta` 字段：

| 字段 | 权重 |
|------|------|
| basics.name | 15 |
| basics.email | 10 |
| basics.phone | 10 |
| basics.title | 5 |
| work（≥1条） | 25 |
| education（≥1条） | 20 |
| skills（≥3项） | 15 |

实现位置：`src/lib/qualityScore.ts`（纯函数，无副作用）

### 去重检测（Dedup）

- 对 normalized resume JSON（排序 key、去空格）做 SHA-256
- 写入 DB `parse_cache` 表的 `content_hash` 列（已有 hash 字段）
- 重复时返回 `{ duplicate: true, existingId, result: cachedResult }`，不重新调用 LLM
- 实现位置：`server/lib/dedup.ts`

### Swagger 文档

- 依赖：`swagger-jsdoc` + `swagger-ui-express`
- 挂载：`GET /api/docs` → Swagger UI，`GET /api/docs.json` → OpenAPI JSON
- 覆盖现有 7 个路由的 JSDoc 注释
- 实现位置：`server/lib/swagger.ts` + `server/index.ts` 挂载

---

## 5.3 AI 辅助标注

### 预填充

`AnnotationEditor` 打开时，若 `evaluationResult.parsed` 存在，自动将解析结果填入标注表单（当前是空表单）。用户可在预填充基础上修改，减少重复录入。

### 置信度标记

- Claude 提取 prompt 新增要求：每个字段附带 `_confidence`（0-1）
- 存入 `fieldMetrics[field].confidence`
- UI：字段标签旁显示置信度 badge
  - ≥0.9：绿色（高置信）
  - 0.7-0.9：黄色（中置信，建议核查）
  - <0.7：红色（低置信，需人工确认）

**变更文件：**
- `src/lib/extractWithLLM.ts`：prompt 模板加 confidence 要求
- `src/components/AnnotationEditor.tsx`：接收 `prefillData` + `confidenceData` props
- `src/pages/EvaluationDetail.tsx`：传递 parsed result 给 AnnotationEditor

---

## 5.2 模板导出

### 依赖

`docx`（纯 JS，无需 puppeteer/服务端）

### 模板

| 模板 | 布局 | 特点 |
|------|------|------|
| `simple` | 单栏 | 纯文字，最大兼容性 |
| `professional` | 双栏 | 左侧基本信息，右侧经历，带分隔线 |

### 导出方式

- **Word (.docx)**：前端用 `docx` 库生成 blob，`URL.createObjectURL` 触发下载
- **PDF**：`window.print()` + `@media print` CSS（无服务端依赖）

### 入口

- `ParseHistoryPage` 结果行：操作列添加"导出"下拉（Word / PDF）
- `EvaluationDetail` 结果行：同上

**新增文件：**
- `src/lib/export/resumeToDocx.ts` — Word 生成逻辑
- `src/lib/export/templates/simple.ts` — simple 模板定义
- `src/lib/export/templates/professional.ts` — professional 模板定义
- `src/components/ExportMenu.tsx` — 导出下拉菜单组件

---

## 验收标准

- [ ] `.txt` / `.md` 文件可正常解析，返回结构化简历 JSON
- [ ] 扫描版 PDF（无文本层）通过 Claude Vision 成功提取
- [ ] 所有解析结果包含 `qualityScore` 字段（0-100）
- [ ] 重复文件返回 `duplicate: true` 而非重新调用 LLM
- [ ] `/api/docs` 可访问 Swagger UI
- [ ] AnnotationEditor 打开时自动预填充解析结果
- [ ] 置信度 badge 在字段旁正确显示颜色
- [ ] Word 导出生成有效 `.docx` 文件
- [ ] PDF 导出触发打印对话框
- [ ] `npm run test` 零失败
- [ ] `npm run build` 无新增 >500KB chunk
