# EasyConvert

基于 LLM 的简历解析平台。上传 PDF/DOCX 简历，自动提取结构化数据（个人信息、教育、工作经历、技能等），支持批量处理、准确率评测、多租户 API。

## 快速开始

### 环境要求

- Node.js >= 16
- Python >= 3.8（辅助脚本，可选）
- PostgreSQL（可选，不配置则使用内存存储）

### 安装与启动

```bash
npm install

cp .env.example .env
# 编辑 .env，填入 LLM API Key

# 前端（Vite dev server）
npm run dev

# 后端（另一个终端）
npm run server

# 生产构建
npm run build && npm run preview
```

### 环境变量

```bash
# .env
VITE_LLM_PROVIDER=qwen          # qwen / deepseek / claude / openai
VITE_QWEN_API_KEY=your_key
VITE_DEEPSEEK_API_KEY=your_key
VITE_LOG_LEVEL=INFO

# 后端
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easyconvert
DB_USER=postgres
DB_PASSWORD=postgres
```

不配置数据库时后端自动使用内存存储（`server/db/memory.ts`），适合开发调试。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind + Zustand)           │
│  14 pages · 7 stores · IndexedDB 缓存                   │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│  Backend (Express.js + tsx)                              │
│  认证 → 限流 → 路由(10) → 处理器 → LLM → 缓存 → DB     │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     PostgreSQL    LLM Providers    IndexedDB
     (评测/API)   (Qwen/DeepSeek   (前端缓存)
                   Claude/OpenAI)
```

### 解析管线

```
文件上传 → SHA-256 哈希 → 缓存命中? → 文本提取(PDF.js/mammoth)
  → 难度分类(5维特征) → 策略选择(9格矩阵) → LLM 提取(重试+熔断)
  → Zod 验证 → 缓存写入 → UI 展示
```

9 种解析策略基于 `难度(easy/standard/hard) × 完整度(simple/standard/complete)` 矩阵，自动调整超时、温度、重试次数和验证级别。

## 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 单文件解析 | `/parse` | 上传简历，实时查看解析阶段和结构化结果 |
| 批量处理 | `/parse/batch` | 多文件并发，自适应并发控制 |
| 监控面板 | `/parse/monitor` | 成功率、缓存命中率、延迟分位、成本追踪 |
| 解析历史 | `/parse/history` | 历史记录查询和管理 |
| 评测系统 | `/evaluation/*` | 创建评测任务，对比 ground-truth，字段级准确率 |
| API 管理 | `/api/*` | API Key 管理、用量统计、Swagger 文档 |
| 多租户 | `/tenants` | 租户隔离和管理 |
| 数据飞轮 | `/data-flywheel` | 低置信度样本筛选，主动学习闭环 |
| 提示词实验室 | `/prompt-lab` | 弱字段分析，提示词 A/B 实验 |

## 项目结构

```
easyconvert/
├── src/                            # 前端源码
│   ├── components/                 # UI 组件（21 组件 + 10 基础 UI）
│   │   └── ui/                     # 基础 UI（Toast, Drawer, Icon, Skeleton 等）
│   ├── pages/                      # 14 个页面
│   ├── lib/
│   │   ├── core/                   # resumeProcessor 解析编排器
│   │   ├── classifiers/            # 难度分类器（basic + advanced 5维加权）
│   │   ├── parsers/                # 文件解析（PDF, DOCX, Text, Markdown）
│   │   ├── prompts/                # 提示词引擎
│   │   ├── validation/             # Zod schema + 验证引擎
│   │   ├── monitoring/             # 性能监控(p50/p95/p99) + 成本追踪
│   │   ├── export/                 # DOCX 导出 + 用量报表 + PDF 报告
│   │   ├── store/                  # Zustand 状态管理（7 个 store）
│   │   ├── api/                    # 后端 API 调用封装
│   │   ├── extractWithLLM.ts       # LLM 调用核心（重试/超时/熔断）
│   │   ├── cache.ts                # IndexedDB 缓存（SHA-256, 30天 TTL）
│   │   ├── batchProcessor.ts       # 批量处理管道
│   │   ├── parsingStrategy.ts      # 9 格策略矩阵
│   │   └── types.ts                # 核心类型定义
│   └── locales/                    # i18n（zh / en）
│
├── server/                         # 后端源码
│   ├── routes/                     # 10 个 API 路由模块
│   ├── lib/                        # 后端业务逻辑（14 模块）
│   ├── db/                         # PostgreSQL + 9 个迁移 + 内存存储
│   ├── middleware/                  # auth / rateLimit / requestLogger
│   └── __tests__/                  # 后端测试（10 个文件）
│
├── scripts/                        # Python 辅助脚本（3 个）
├── test-resumes/                   # 测试简历（3768 真实 + 18 合成）
├── docs/                           # 参考文档
└── .github/workflows/ci.yml        # CI
```

## 后端 API

### 外部 API（需 API Key 认证 + 限流）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/parse` | POST | 同步解析单份简历 |
| `/api/v1/parse/async` | POST | 异步解析，返回 jobId |
| `/api/v1/parse/batch` | POST | 批量异步解析（最多 20 文件） |
| `/api/v1/parse/:jobId` | GET | 查询异步任务状态 |
| `/api/v1/health` | GET | 健康检查 |

### 内部 API（前端管理页面使用，无需认证）

| 路由前缀 | 说明 |
|----------|------|
| `/api/evaluations` | 评测任务 CRUD |
| `/api/annotations` | 标注管理 |
| `/api/parse-history` | 解析历史 |
| `/api/keys` | API Key 管理 |
| `/api/usage` | 用量统计 |
| `/api/tenants` | 租户管理 |
| `/api/data-flywheel` | 数据飞轮 |
| `/api/prompt-experiments` | 提示词实验 |
| `/api/reports` | 评测报告 |
| `/api/alerts/webhook` | 告警 Webhook 转发 |

完整定义见 `/api/docs`（swagger-jsdoc 自动生成）。

## 测试

```bash
# 全部测试（24 个文件，119 tests）
npm test

# 带覆盖率
npm run test:coverage
```

测试分布：前端 14 个（解析器、分类器、缓存、验证、导出等）+ 后端 10 个（路由、认证、限流、队列等）。

## 辅助脚本

| 脚本 | 功能 |
|------|------|
| `scripts/reclassify_by_parsing_difficulty.py` | 按 5 维特征对简历分类难度 |
| `scripts/select_stratified_test_set.py` | 从分类结果中分层抽样测试集 |
| `scripts/generate_test_resumes.py` | 生成合成测试简历 DOCX |

## 文档

| 文档 | 说明 |
|------|------|
| [解析难度分类指南](docs/plans/parsing-difficulty-classification-guide.md) | 5 维难度分类方案 |
| [评测系统文档](docs/evaluation-system.md) | 评测系统架构和使用 |
| [标注规范](docs/annotation-guide.md) | 简历标注流程参考 |
| [LLM 模型对比](docs/llm-comparison-resume-parsing.md) | Claude/GPT/国产模型对比 |
| [初始调研](docs/research/2026-03-30-resume-converter-research.md) | 市场分析和技术选型 |

## 已知技术债

- 前后端 `extractWithLLM` / `resumeProcessor` / `parsePdf` / `parseDocx` / `logger` 大量重复代码（85-90%），应抽取共享核心模块，各端注入平台差异（env 读取、File vs Buffer、日志格式）
- `server/db/memory.ts` 用字符串匹配模拟 SQL，544 行条件分支，维护成本高，应换 better-sqlite3 或类似方案
- `validators.ts` 中的手动校验函数在生产代码中未使用（仅 Zod 的 `validateWithZod` 被调用），类型定义仍被依赖，应将类型迁至 `types.ts` 后删除冗余校验函数
- 两套成本追踪实现（前端 `monitoring/cost.ts` 有按模型定价表，后端用固定 $0.5/M），且 `reportGenerator.ts` 有第三套估算逻辑
- `resumeSchema` JSON 对象在 `extractWithLLM.ts`（前后端各一份）和 `validation/schemas.ts`（Zod 版）中三处定义，且 Zod 版用 `school` 而 JSON 版用 `institution`，存在字段名不一致
- `server/routes/tenants.ts` 查询 `quota_per_minute` 列，但无迁移创建该列，PostgreSQL 下会运行时报错（内存存储下静默通过）
- `test-resumes/phase3-real-samples/`（3768 文件，~2.5GB）直接 tracked in git，应迁移至 Git LFS 或外部存储

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**: Express.js + PostgreSQL + tsx
- **LLM**: Qwen / DeepSeek / Claude / OpenAI（inline provider config）
- **解析**: pdfjs-dist, mammoth
- **验证**: Zod
- **测试**: Vitest（24 files, 119 tests）
- **i18n**: 中文 / English
