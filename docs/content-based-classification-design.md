# 基于内容结构的简历分类方案

## 分类维度

### 1. 模块完整度 (Structure)
- **simple**: 3个或更少模块（如：个人信息+教育+技能）
- **standard**: 4-5个模块（典型简历结构）
- **complete**: 6个或更多模块（包含证书、自我评价等）

### 2. 内容详细度 (Detail)
- **brief**: <50行（简洁型）
- **normal**: 50-150行（标准型）
- **detailed**: >150行（详细型）

### 3. 检测的模块类型
- personal: 个人信息/基本信息
- education: 教育背景
- work: 工作经历
- project: 项目经验
- skills: 技能
- cert: 证书
- eval: 自我评价

## 分类标签格式
`{structure}-{detail}`

示例:
- `simple-brief`: 简单简历，内容简洁
- `standard-normal`: 标准简历，内容适中
- `complete-detailed`: 完整简历，内容详细

## 实施步骤

### 步骤1: 采样分析（已完成脚本）
```bash
# 启动 EasyConvert 服务
npm run dev

# 运行采样分析
python scripts/analyze_resume_content.py
```

### 步骤2: 批量分类
```bash
python scripts/classify_by_content.py
```

### 步骤3: 选择测试集
基于分类结果，从每个类别选择代表性样本

### 步骤4: 更新测试工作流
根据内容分类设计针对性测试用例

## 测试指导意义

不同类别的测试重点:

- **simple-brief**: 测试基础解析能力
- **standard-normal**: 测试常规场景
- **complete-detailed**: 测试复杂内容处理
