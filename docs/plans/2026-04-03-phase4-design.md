# EasyConvert Phase 4 — 多语言支持 + 对外就绪设计文档

**日期：** 2026-04-03
**状态：** 已批准，待实施

---

## 背景

Phase 3 已完成格式扩展、质量评分、去重、Swagger、AI 标注、模板导出。Phase 4 聚焦两个方向：多语言简历支持（英文优先）和生产就绪能力（OpenAPI 完整化、多租户配额 UI、监控告警、健康检查等）。

---

## Track A — 多语言支持

### A1. 语言检测 detectLanguage.ts

- 文件：`src/lib/detectLanguage.ts`
- 基于字符集分布（CJK 字符占比、平假名/片假名）+ 关键词判断语言
- 返回 `'zh' | 'en' | 'ja' | 'unknown'`
- 无需额外 API，纯本地计算

### A2. 英文简历提示词适配

- 文件：`src/lib/prompts.ts`
- 新增英文版提示词模板（`buildEnglishPrompt`）
- 字段映射调整：日期格式 MM/YYYY、`position` vs `title`、地址格式
- `extractWithLLM.ts` 根据检测语言自动选择提示词

### A3. 日文简历支持

- 文件：`src/lib/prompts.ts`（新增 `buildJapanesePrompt`）
- 履歴書/職務経歴書格式处理
- 字段映射：生年月日 → basics.birthDate、学歴 → education、職歴 → work

### A4. 语言标记写入结果

- 解析结果 `meta.language` 字段记录检测语言
- ParseHistoryPage 和 EvaluationDetail 展示语言 badge（EN / ZH / JA）

---

## Track B — 对外就绪

### B1. OpenAPI 文档完整化

- 为所有 7 个路由文件补全 `@openapi` JSDoc 注释
- 覆盖：请求体 schema、响应体 schema、错误码（400/401/429/500）、安全方案
- 路由：parse、evaluations、annotations、reports、keys、usage、parseHistory

### B2. 多租户配额管理 UI

- 新增页面：`src/pages/TenantPage.tsx`
- 功能：租户列表、配额设置（req/min）、用量进度条、超限状态标记
- 后端：`GET /api/tenants`、`GET /api/tenants/:id`、`PUT /api/tenants/:id/quota`
- 接入 Sidebar 导航

### B3. 监控告警

- 在 `MonitorPage` 新增告警规则配置面板
- 规则类型：错误率 > X%、P95 延迟 > Xms、日成本 > ¥X
- 触发时：前端 toast 通知（已有 toast 机制）+ 可选 webhook 推送
- 后端：`POST /api/alerts/webhook`（转发告警到外部 URL）
- 告警规则持久化到 localStorage（无需 DB）

### B4. 生产就绪基础设施

**健康检查端点**
- `GET /api/health` → `{ status, db, memory, version, uptime }`
- 检查 DB 连接（ping query）、内存用量（process.memoryUsage）

**速率限制响应头**
- 现有限流中间件补充响应头：`X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`

**请求 ID 追踪**
- 中间件注入 `X-Request-ID`（UUID v4，若请求已有则透传）
- 贯穿日志链路（logger 自动附加 requestId）

**优雅关闭**
- `SIGTERM` / `SIGINT` 信号处理
- 停止接受新连接，等待进行中请求完成（最多 10s），再退出

---

## 执行顺序

**并行推进：**
- Track A：A1 → A2 → A3 → A4
- Track B：B4（基础设施）→ B1（OpenAPI）→ B2（租户 UI）→ B3（告警）

B4 优先因为它是其他 B 系列的基础（请求 ID 贯穿日志）。

---

## 验收标准

- [ ] 英文简历解析返回正确结构化结果
- [ ] 日文简历解析返回正确结构化结果
- [ ] 语言检测准确率 > 95%（中/英/日）
- [ ] 解析结果包含 `meta.language` 字段
- [ ] `/api/docs` 覆盖所有 7 个路由的完整 schema
- [ ] TenantPage 可查看/修改租户配额
- [ ] 告警规则触发时显示 toast
- [ ] `GET /api/health` 返回正确状态
- [ ] 限流响应包含 `X-RateLimit-*` 头
- [ ] 每个请求日志包含 `requestId`
- [ ] `npm run test -- --run` 零失败
- [ ] `npm run build` 无 >500KB chunk
