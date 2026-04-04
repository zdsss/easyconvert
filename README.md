# EasyConvert

基于 LLM 的简历解析平台。上传 PDF/DOCX 简历，自动提取结构化数据（个人信息、教育、工作经历、技能等），支持批量处理、准确率评测、多租户 API。

## 快速开始

### 环境要求

- Node.js >= 16
- Python >= 3.8（辅助脚本）
- PostgreSQL（可选，不配置则使用内存存储）

### 安装与启动

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 LLM API Key（支持 Qwen / DeepSeek / Claude / OpenAI）

# 启动前端（Vite dev server）
npm run dev

# 启动后端（另一个终端）
npm run server

# 生产构建
npm run build && npm run preview
```

### 环境变量

```bash
# .env（前端）
VITE_LLM_PROVIDER=qwen          # qwen / deepseek / claude / openai
VITE_QWEN_API_KEY=your_key
VITE_DEEPSEEK_API_KEY=your_key

# server/.env（后端，可选）
PORT=3001
DATABASE_URL=postgresql://postgres@localhost:5432/easyconvert_eval
```

不配置 `DATABASE_URL` 时后端自动使用内存存储，适合开发调试。

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind + Zustand)           │
│  14 pages: 解析 / 批量 / 监控 / 评测 / API管理 / 飞轮   │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│  Backend (Express.js)                                    │
│  认证 → 限流 → 路由 → 处理器 → LLM → 缓存 → DB         │
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

| 模块 | 页面 | 说明 |
|------|------|------|
| 单文件解析 | `/parse` | 上传简历，实时查看解析阶段和结构化结果 |
| 批量处理 | `/parse/batch` | 多文件并发处理，自适应并发控制 |
| 监控面板 | `/parse/monitor` | 成功率、缓存命中率、延迟、成本追踪 |
| 解析历史 | `/parse/history` | 历史记录查询和管理 |
| 评测系统 | `/evaluation/*` | 创建评测任务，对比 ground-truth，计算字段级准确率 |
| API 管理 | `/api/*` | API Key 管理、用量统计、Swagger 文档 |
| 多租户 | `/tenants` | 租户隔离和管理 |
| 数据飞轮 | `/data-flywheel` | 低置信度样本筛选，主动学习闭环 |
| 提示词实验室 | `/prompt-lab` | 弱字段分析，提示词 A/B 实验 |

## 项目结构

```
easyconvert/
├── src/                            # 前端源码
│   ├── components/                 # UI 组件（Sidebar, Icon, Toast, Drawer 等）
│   ├── pages/                      # 14 个页面组件
│   ├── lib/
│   │   ├── core/                   # resumeProcessor 解析编排器
│   │   ├── classifiers/            # 难度分类器（basic + advanced 5维加权）
│   │   ├── parsers/                # 文件解析器（PDF, DOCX, Text, Markdown）
│   │   ├── prompts/                # 提示词引擎 + 模板
│   │   ├── validation/             # Zod schema + 验证引擎
│   │   ├── monitoring/             # 性能监控 + 成本追踪
│   │   ├── export/                 # DOCX 导出 + 用量报表
│   │   ├── store/                  # Zustand 状态管理（7 个 store）
│   │   ├── api/                    # 后端 API 调用封装
│   │   ├── extractWithLLM.ts       # LLM 调用核心（重试/超时/熔断）
│   │   ├── cache.ts                # IndexedDB 缓存（SHA-256, 30天 TTL）
│   │   ├── batchProcessor.ts       # 批量处理管道
│   │   ├── parsingStrategy.ts      # 9 格策略矩阵
│   │   └── types.ts                # 核心类型定义
│   └── locales/                    # i18n（中文/英文）
│
├── server/                         # 后端源码
│   ├── routes/                     # 10 个 API 路由模块
│   ├── lib/                        # 后端业务逻辑
│   │   └── llm/                    # LLM 适配器（Claude/OpenAI/DeepSeek/Qwen）
│   ├── db/                         # PostgreSQL + 9 个迁移文件
│   ├── middleware/                  # auth / rateLimit / requestLogger
│   ├── __tests__/                  # 后端测试（10 个文件）
│   └── docs/openapi.yaml           # Swagger 定义
│
├── scripts/                        # Python 辅助脚本
├── test-resumes/                   # 测试简历样本
├── docs/                           # 设计文档
└── .github/workflows/              # CI 配置
```

## 后端 API

### 外部 API（需 API Key 认证）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/parse` | POST | 同步解析单份简历 |
| `/api/v1/parse/async` | POST | 异步解析，返回 jobId |
| `/api/v1/parse/batch` | POST | 批量异步解析 |
| `/api/v1/parse/:jobId` | GET | 查询异步任务状态 |

### 内部 API

评测（`/api/evaluations`）、标注（`/api/annotations`）、解析历史（`/api/parse-history`）、API Key 管理（`/api/keys`）、用量（`/api/usage`）、租户（`/api/tenants`）、数据飞轮（`/api/data-flywheel`）、提示词实验（`/api/prompt-experiments`）。

完整定义见 `server/docs/openapi.yaml`，启动后访问 `/api/docs` 查看 Swagger UI。

## 测试

```bash
# 运行全部测试（26 个文件，128 个用例）
npm test

# 带覆盖率
npm run test:coverage

# 端到端快速验证（需启动服务）
python scripts/test_quick_validation.py
```

## 辅助脚本

| 脚本 | 功能 |
|------|------|
| `scripts/cli.py` | 统一 CLI 入口 |
| `scripts/reclassify_by_parsing_difficulty.py` | 按解析难度重新分类简历 |
| `scripts/select_stratified_test_set.py` | 分层抽样选择测试集 |
| `scripts/evaluate_classifier.py` | 分类器准确率评估 |
| `scripts/evaluate_accuracy.py` | 字段级准确率评估 |
| `scripts/generate_test_resumes.py` | 生成测试简历 DOCX |
| `scripts/generate_edge_cases.py` | 生成边缘情况测试简历 |
| `scripts/test_quick_validation.py` | 快速验证测试 |

## 文档索引

| 文档 | 说明 |
|------|------|
| [架构路线图](docs/plans/2026-04-02-architecture-roadmap-design.md) | 当前架构方向和演进计划 |
| [迭代总设计](docs/plans/2026-04-03-iteration-v2-design.md) | Phase 分阶段策略总纲 |
| [解析难度分类指南](docs/plans/parsing-difficulty-classification-guide.md) | 5 维难度分类方案 |
| [UI/UX 设计方案](docs/plans/glm-easyconvert-uiux.md) | Design Tokens、色彩、间距规范 |
| [评测系统文档](docs/evaluation-system.md) | 评测系统安装和使用 |
| [标注规范](docs/annotation-guide.md) | 简历标注流程参考 |
| [LLM 模型对比](docs/llm-comparison-resume-parsing.md) | Claude/GPT/国产模型对比 |

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**: Express.js + PostgreSQL + tsx
- **LLM**: Qwen / DeepSeek / Claude / OpenAI（适配器模式）
- **解析**: pdfjs-dist, mammoth
- **验证**: Zod
- **测试**: Vitest（128 tests across 26 files）
- **i18n**: 中文 / English
