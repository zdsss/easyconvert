# EasyConvert 架构强化路线图

**版本**: v1.0
**日期**: 2026-04-02
**状态**: 已批准

---

## 一、背景与目标

### 1.1 现状

EasyConvert 已完成核心解析引擎的构建：

- 双层分类系统（难度 × 完整度 × 场景）
- 9 种差异化解析策略矩阵
- IndexedDB 缓存 + SHA-256 去重
- 三级验证系统（basic/standard/strict）
- 705 份真实简历测试集（97.3% 已分类）
- React 前端应用（完整）
- Express 后端（骨架）
- 评估系统 UI（骨架）

### 1.2 核心痛点

**对外服务能力缺失**：无 REST API、无认证、无限流、无多租户支持，无法对外提供服务。

### 1.3 目标

同时满足两个场景：
1. **内部研究平台**：完整的评估闭环（解析 → 标注 → 准确率分析 → 提示词优化）
2. **对外 SaaS 服务**：REST API + Web 双入口，支持外部系统集成

---

## 二、架构方向

**选择：单体强化（方向 C）**

在现有 Express 单体上完成所有功能，等规模增长后再拆分。理由：
- 当前阶段开发速度优先
- 运维复杂度最低
- 核心解析逻辑已在前端 lib 中，后端主要做 API 网关和持久化

---

## 三、架构现状 vs 目标

```
当前状态                          目标状态
─────────────────────────────────────────────────────
✅ 核心解析引擎（完整）           ✅ 保持不动
✅ 前端 React 应用（完整）        ✅ 保持，补全评估 UI
⚠️  后端 Express（骨架）          → 补全 API 路由 + 认证 + 限流
⚠️  评估系统 UI（骨架）           → 补全评估流程 + 报告展示
❌  对外 REST API（缺失）         → 新增 /api/v1/parse 等接口
❌  认证/API Key 管理（缺失）     → 新增 API Key 生成/验证
❌  多租户支持（缺失）            → 新增租户隔离
❌  LLM 提供商扩展（单一）        → 支持 Claude/OpenAI 等
```

### 核心竞争力（不可动）

- **双层分类 + 9 策略矩阵** — 差异化核心，所有解析路径必须经过
- **IndexedDB 缓存 + SHA-256 去重** — 成本控制关键
- **三级验证系统** — 数据质量保障
- **705 份真实简历测试集** — 评估数据飞轮

---

## 四、后端 API 设计

### 4.1 对外 REST API（新增）

```
POST   /api/v1/parse              # 上传简历文件，返回解析结果（同步）
GET    /api/v1/parse/:jobId       # 查询异步解析状态
POST   /api/v1/parse/batch        # 批量解析（最多 20 个文件）

GET    /api/v1/keys               # 列出 API Keys
POST   /api/v1/keys               # 创建 API Key
DELETE /api/v1/keys/:id           # 删除 API Key
```

### 4.2 认证方案

- API Key 认证：`Authorization: Bearer <key>`
- Key 存储在 PostgreSQL，hash 存储（不明文）
- 每个 Key 绑定租户 ID + 配额限制

### 4.3 限流

- 基于 API Key 的滑动窗口限流（默认 100 req/min）
- 超限返回 429 + `Retry-After` header

### 4.4 评估系统 API（补全现有骨架）

```
现有路由：/api/evaluations, /api/annotations, /api/reports
补全：数据库 schema + 完整 CRUD + 报告生成
```

### 4.5 数据库 Schema（PostgreSQL）

```sql
-- 多租户
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Key 管理
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  quota_per_minute INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- 解析任务（异步支持）
CREATE TABLE parse_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  file_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending/processing/done/failed
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 评估任务（已有，补全）
CREATE TABLE evaluation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES evaluation_tasks(id),
  file_name TEXT NOT NULL,
  file_hash TEXT,
  parsed_resume JSONB,
  annotation JSONB,
  classification JSONB,
  metrics JSONB,
  processing_time INT,
  from_cache BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 五、评估系统 UI 补全

### 5.1 当前状态

`EvaluationList` / `EvaluationDetail` / `EvaluationNew` 页面骨架已存在。

### 5.2 补全内容

**EvaluationNew**：
- 文件批量上传（拖拽）
- 配置项：准确率方法（exact/partial）、是否启用字段级评估、是否启用分类
- 标注文件上传（ground-truth.json）

**EvaluationDetail**：
- 解析结果 vs 标注对比视图（左右分栏）
- 字段级准确率热力图
- 处理流程追踪（11 阶段时间线）
- 分类结果展示（难度/完整度/场景）

**EvaluationList**：
- 任务列表 + 状态 + 进度条
- 报告下载（JSON/CSV）
- 按分类筛选

**ReportView（新增）**：
- 准确率趋势图（跨任务对比）
- 分类分布饼图
- 错误模式分析（哪类简历失败率高）
- 成本追踪（token 用量 + 费用）

---

## 六、LLM 提供商扩展

### 6.1 统一适配器接口

```typescript
interface LLMProvider {
  name: string;
  call(
    prompt: string,
    schema: object,
    strategy: ParsingStrategy
  ): Promise<Resume>;
}
```

### 6.2 支持的提供商

| 提供商 | 状态 | 备注 |
|--------|------|------|
| Qwen (DashScope) | ✅ 已实现 | 支持 json_schema |
| DeepSeek | ✅ 已实现 | json_object 模式 |
| Claude (Anthropic) | ❌ 待实现 | 原始设计主要提供商 |
| OpenAI GPT-4 | ❌ 待实现 | 备选 |

### 6.3 配置方式

```env
VITE_LLM_PROVIDER=qwen          # 前端默认
SERVER_LLM_PROVIDER=claude      # 后端 API 默认（可按租户配置）
```

---

## 七、并行推进路线图

### 两条 Critical Path

```
Week 1-2：后端 API 基础（Critical Path A）
  ├── 数据库 schema 完成（tenants/api_keys/parse_jobs）
  ├── /api/v1/parse 接口实现（同步 + 异步）
  ├── API Key 认证中间件
  └── 基础限流（滑动窗口）

Week 1-2：评估系统 UI（Critical Path B，并行）
  ├── EvaluationNew 页面完成
  ├── EvaluationDetail 对比视图
  ├── 后端评估路由补全（CRUD + 报告）
  └── 数据库 schema（evaluation_tasks/results）

Week 3：集成 + 扩展
  ├── LLM 提供商适配器（Claude/OpenAI）
  ├── 批量解析 API（/api/v1/parse/batch）
  ├── 报告生成和下载（ReportView）
  └── 端到端测试（真实简历 + API 调用）

Week 4：对外就绪
  ├── API 文档（OpenAPI spec）
  ├── Web 应用对外部署配置
  ├── 多租户配额管理 UI
  └── 监控告警（错误率/延迟/成本）
```

### 里程碑验收标准

| 里程碑 | 验收条件 |
|--------|---------|
| Week 2 | POST /api/v1/parse 可用，API Key 认证通过，评估任务可创建 |
| Week 3 | 批量解析可用，评估报告可下载，Claude 提供商可切换 |
| Week 4 | OpenAPI 文档完整，Web 应用可对外访问，监控面板可用 |

---

## 八、技术风险与应对

| 风险 | 概率 | 应对 |
|------|------|------|
| 后端解析与前端解析逻辑重复 | 高 | 将核心 lib 抽取为 Node.js 可用的共享模块 |
| PostgreSQL schema 迁移复杂 | 中 | 使用 db-migrate 或 Drizzle ORM 管理迁移 |
| LLM 提供商 API 差异大 | 中 | 统一适配器接口，差异封装在 provider 实现内 |
| 评估系统 UI 工作量超预期 | 中 | 优先完成核心对比视图，图表后置 |

---

**文档版本**: v1.0
**创建日期**: 2026-04-02
**下一步**: 执行实施计划（writing-plans）
