# 基于内容结构的测试 Workflow

## 概述

基于简历解析后的内容结构进行分类测试，确保 EasyConvert 能正确处理不同模块组合和详细程度的简历。

## 内容分类体系

### 分类维度

**模块完整度 (Structure)**
- `simple`: ≤3个模块（基础简历）
- `standard`: 4-5个模块（标准简历）
- `complete`: ≥6个模块（完整简历）

**内容详细度 (Detail)**
- `brief`: <50行（简洁型）
- `normal`: 50-150行（标准型）
- `detailed`: >150行（详细型）

**分类标签**: `{structure}-{detail}`

### 检测模块
- personal: 个人信息
- education: 教育背景
- work: 工作经历
- project: 项目经验
- skills: 技能
- cert: 证书
- eval: 自我评价

## Workflow 架构

```
测试入口
  ├─ 快速验证 (9类 × 1份 = 9份)
  ├─ 分类测试 (9类 × 5份 = 45份)
  ├─ 模块测试 (针对特定模块组合)
  └─ 回归测试 (固定测试集)
```

## 1. 快速验证层

**目标**: 5分钟内验证基本功能

**测试集**: 每类1份，共9份

| 分类 | 测试重点 |
|------|---------|
| simple-brief | 基础解析能力 |
| simple-normal | 基础模块识别 |
| simple-detailed | 简单结构长内容 |
| standard-brief | 标准结构简洁内容 |
| standard-normal | 最常见场景 |
| standard-detailed | 标准结构详细描述 |
| complete-brief | 多模块简洁型 |
| complete-normal | 完整简历标准型 |
| complete-detailed | 复杂完整简历 |

**验证节点**:
- ✓ 解析成功率 ≥ 90%
- ✓ 模块识别准确率 ≥ 80%
- ✓ 平均处理时间 < 3秒

**实现**:
```bash
python scripts/test_content_quick.py
```

## 2. 分类测试层

**目标**: 30分钟内完成全面测试

**测试集**: 每类5份，共45份

**验证节点**:
- ✓ 整体成功率 ≥ 95%
- ✓ 各类别成功率 ≥ 90%
- ✓ 模块提取准确率 ≥ 85%
- ✓ 字段完整性 ≥ 90%

## 3. 模块组合测试

**目标**: 验证特定模块组合的处理

**测试场景**:
- 仅个人信息+教育背景
- 包含项目经验但无工作经历
- 包含证书和技能评分
- 包含自我评价的简历

**验证节点**:
- ✓ 正确识别所有模块
- ✓ 模块边界清晰
- ✓ 无模块遗漏

## 4. 回归测试

**测试集**: 固定30份代表性简历

**验证节点**:
- ✓ 与基准版本对比无退化
- ✓ 已修复bug不复现

## 实施步骤

### 步骤1: 启动服务
```bash
npm run dev
```

### 步骤2: 采样分析
```bash
python scripts/analyze_resume_content.py
```

### 步骤3: 批量分类
```bash
python scripts/classify_by_content.py
```

### 步骤4: 选择测试集
```bash
python scripts/select_content_test_set.py
```

### 步骤5: 运行测试
```bash
python scripts/test_content_quick.py
```
