# EasyConvert - 简历解析工具

一个基于 Web 的简历解析工具，支持 PDF、Word 等格式的简历文件解析为结构化数据。

## 项目状态

### 核心功能完成情况
- ✅ 双层分类系统（文件属性 + 内容结构）
- ✅ 9种差异化解析策略
- ✅ 完整的缓存机制（IndexedDB + SHA-256）
- ✅ 三级验证系统（basic/standard/strict）
- ✅ 批量处理能力（并发控制 + 速率限制）
- ✅ 性能指标追踪
- ✅ 错误处理和重试机制
- 🔄 完整测试套件开发中

### 简历数据集
- **总数**: 705份真实简历
- **成功分类**: 686份 (97.3%)
- **数据来源**: 真实招聘场景
- **文件大小**: 10KB - 23MB（平均633KB，中位数126KB）

### 分类完成情况

#### 基于文件属性的分类（已完成）
- 文件大小：5个类别（tiny/small/medium/large/xlarge）
- 复杂度：3个类别（simple/standard/complex）
- 图片密度：4个类别（no/low/multi/high）
- 识别出51种分类组合

#### 基于内容结构的分类（已完成）
- 模块完整度：3个类别（simple/standard/complete）
- 内容详细度：3个类别（brief/normal/detailed）
- 9种核心分类组合

## 快速开始

### 环境要求
- Node.js >= 16
- Python >= 3.8
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd easyconvert

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的参数
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm run preview
```

## 核心特性

### 智能双层分类系统
- **解析前预判**: 基于文件大小、复杂度、图片密度快速分类
- **解析后优化**: 基于内容模块数和详细度精准匹配策略
- **自动适配**: 9种分类组合自动选择最优处理方案

### 差异化解析策略
- **资源优化**: 简单简历5秒处理，复杂简历20秒深度解析
- **温度控制**: 0.3-0.7动态调整，平衡准确性和创造性
- **智能重试**: 1-3次重试，可重试错误自动恢复

### 高可靠性设计
- **缓存机制**: SHA-256哈希 + IndexedDB，7天有效期
- **三级验证**: basic/standard/strict分级验证
- **容错处理**: 缓存失败、验证失败不阻断主流程
- **并发控制**: 限制2个并发，防止API限流

### 运行测试

```bash
# 快速验证测试（9份简历，约5分钟）
python scripts/test_content_quick.py

# 批量测试
python scripts/batch_test.py

# 快速验证测试（基于文件属性）
python scripts/test_quick_validation.py
```

## 简历数据集说明

### 数据来源
真实招聘场景中收集的简历样本，涵盖多种行业和职位。

### 分类体系

#### 1. 基于文件属性分类

**文件大小分类**
- tiny (<60KB): 167份 (24.3%)
- small (60-150KB): 198份 (28.9%)
- medium (150-500KB): 185份 (27.0%)
- large (500KB-2MB): 102份 (14.9%)
- xlarge (>2MB): 34份 (5.0%)

**复杂度分类**
- simple: 261份 (38.0%)
- standard: 348份 (50.7%)
- complex: 77份 (11.2%)

**图片密度分类**
- no (无图): 15份 (2.2%)
- low (1-2张): 429份 (62.5%)
- multi (3-10张): 210份 (30.6%)
- high (>10张): 32份 (4.7%)

#### 2. 基于内容结构分类

**模块完整度**
- simple: ≤3个模块（基本信息为主）
- standard: 4-5个模块（标准简历结构）
- complete: ≥6个模块（内容丰富）

**内容详细度**
- brief: <50行（简洁型）
- normal: 50-150行（标准型）
- detailed: >150行（详细型）

**分类标签格式**: `{structure}-{detail}`
例如: `standard-normal` = 标准结构 + 适中内容

### 数据统计

**最常见的分类组合（Top 5）**
1. small-standard-low: 77份
2. tiny-simple-low: 67份
3. medium-standard-low: 59份
4. tiny-standard-low: 56份
5. small-simple-low: 56份

**关键洞察**
- 80%的简历在500KB以下，适合快速处理
- 62.5%的简历使用1-2张图片（通常是头像和logo）
- 标准型简历占50.7%，是最常见类型
- 仅11.2%为复杂型，大多数简历结构清晰

## 简历解析 Workflow

### 完整处理流程

```
文件上传 → 哈希计算 → 缓存检查 → 文本提取 → 内容分类 → 策略选择
  → LLM解析 → 最终分类 → 验证 → 缓存存储 → 指标记录 → UI展示
```

### 11个处理阶段

1. **文件哈希**: SHA-256唯一标识
2. **缓存检查**: IndexedDB查询，7天有效
3. **文件属性分类**: 大小/复杂度/图片密度
4. **文本提取**: PDF.js/mammoth
5. **内容结构分类**: 模块数/行数分析
6. **策略选择**: 9种策略自动匹配
7. **LLM解析**: 带超时和重试
8. **最终内容分类**: 解析结果再分类
9. **三级验证**: basic/standard/strict
10. **缓存存储**: 仅存储有效数据
11. **指标记录**: 成功率/缓存命中率

### 差异化处理策略

| 分类 | 超时 | 温度 | 重试 | 验证 |
|------|------|------|------|------|
| simple-brief | 5s | 0.3 | 1 | basic |
| standard-normal | 10s | 0.5 | 2 | standard |
| complete-detailed | 20s | 0.7 | 3 | strict |

详细设计请参考: [简历解析 Workflow 设计文档](docs/plans/2026-03-31-resume-parsing-workflow-design.md)

## 系统架构

### 核心模块

| 模块 | 文件 | 功能 |
|------|------|------|
| 文件属性分类 | `src/lib/classifier.ts` | 大小/复杂度/图片分类 |
| 内容结构分类 | `src/lib/contentClassifier.ts` | 模块数/详细度分类 |
| 策略配置 | `src/lib/parsingStrategy.ts` | 9种策略配置 |
| 批量处理 | `src/lib/batchProcessor.ts` | 批量处理管道 |
| LLM集成 | `src/lib/extractWithLLM.ts` | LLM调用+错误处理 |
| 缓存系统 | `src/lib/cache.ts` | IndexedDB缓存 |
| 验证系统 | `src/lib/validators.ts` | 三级验证 |
| 并发控制 | `src/lib/concurrency.ts` | p-limit并发 |
| 性能指标 | `src/lib/metrics.ts` | 指标追踪 |

### 数据流

```
File → Hash → Cache? → Extract → Classify → Strategy → LLM → Validate → Cache → UI
```


## 测试流程

### 测试层级

1. **快速验证** (5分钟)
   - 每类1份，共9份
   - 验证基本功能
   - 适合开发过程中快速验证

2. **分类测试** (30分钟)
   - 每类5份，共45份
   - 覆盖所有分类
   - 适合功能测试

3. **压力测试** (2小时)
   - 100份随机样本
   - 测试并发和性能
   - 适合性能测试

4. **回归测试**
   - 固定30份代表性样本
   - 每次发布前执行
   - 确保功能稳定

### 验证节点

- ✅ 解析完整性验证
- ✅ 数据准确性验证
- ✅ 格式规范性验证
- ✅ 性能指标验证

### 运行测试

```bash
# 1. 启动服务
npm run dev

# 2. 运行内容分类（如未执行）
python scripts/classify_by_content.py

# 3. 选择测试集
python scripts/select_content_test_set.py

# 4. 执行快速测试
python scripts/test_content_quick.py
```

## 项目结构

```
easyconvert/
├── docs/                           # 文档目录
│   ├── resume-parsing-workflow.md  # 解析流程设计
│   ├── resume-classification-scheme.md
│   ├── resume-classification-statistics.md
│   ├── content-classification-guide.md
│   └── ...
├── scripts/                        # 工具脚本
│   ├── classify_by_content.py      # 内容分类工具
│   ├── classify_resumes.py         # 文件属性分类工具
│   ├── select_content_test_set.py  # 测试集选择
│   ├── test_content_quick.py       # 快速验证测试
│   └── ...
├── src/                            # 源代码
├── test-resumes/                   # 测试简历数据集
├── .env                            # 环境配置
└── package.json
```

## 工具脚本说明

| 脚本 | 功能 | 输出 |
|------|------|------|
| classify_resumes.py | 基于文件属性批量分类 | resume-classification-results.json |
| classify_by_content.py | 基于内容结构批量分类 | content-based-classification.json |
| select_test_set.py | 选择测试集（文件属性） | test-set.json |
| select_content_test_set.py | 选择测试集（内容结构） | content-based-test-set.json |
| test_quick_validation.py | 快速验证测试（文件属性） | quick-test-results.json |
| test_content_quick.py | 快速验证测试（内容结构） | quick-test-results.json |
| batch_test.py | 批量测试工具 | - |

## 开发指南

### 添加新的解析模块

1. 在 `src/` 目录下创建模块文件
2. 实现解析逻辑
3. 添加单元测试
4. 更新文档

### 添加新的测试用例

1. 将简历文件放入 `test-resumes/` 目录
2. 运行分类脚本更新分类索引
3. 运行测试验证

### 性能优化建议

- 使用缓存避免重复解析
- 按分类控制并发数
- 实施超时和降级策略
- 监控关键性能指标

## 文档索引

### 设计文档
- [简历解析 Workflow 设计（最新）](docs/plans/2026-03-31-resume-parsing-workflow-design.md)
- [简历解析 Workflow](docs/resume-parsing-workflow.md)
- [简历分类方案](docs/resume-classification-scheme.md)
- [内容分类指南](docs/content-classification-guide.md)

### 统计和测试
- [分类统计结果](docs/resume-classification-statistics.md)
- [测试 Workflow](docs/resume-test-workflow.md)
- [项目总结](docs/project-summary.md)

## 技术栈

- **前端**: Vite + TypeScript + Tailwind CSS
- **解析**: pdf-parse, mammoth
- **测试**: Python 3.8+
- **工具**: Node.js, npm

## 贡献指南

欢迎提交 Issue 和 Pull Request。

## 许可证

[添加许可证信息]

## 联系方式

[添加联系方式]
