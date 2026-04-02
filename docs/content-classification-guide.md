# 基于内容结构的简历分类 - 使用指南

## 概述

本方案基于 EasyConvert 解析后的简历内容结构进行分类，而非文件属性。

## 快速开始

### 1. 启动 EasyConvert 服务
```bash
npm run dev
```

### 2. 运行完整流程
```bash
# 采样分析（15份简历）
python scripts/analyze_resume_content.py

# 批量分类（所有简历）
python scripts/classify_by_content.py

# 选择测试集
python scripts/select_content_test_set.py

# 运行快速测试
python scripts/test_content_quick.py
```

## 分类体系

### 模块完整度
- **simple**: ≤3个模块
- **standard**: 4-5个模块
- **complete**: ≥6个模块

### 内容详细度
- **brief**: <50行
- **normal**: 50-150行
- **detailed**: >150行

### 分类标签
格式: `{structure}-{detail}`

示例: `standard-normal` = 标准结构 + 适中内容

## 脚本说明

| 脚本 | 功能 | 输出 |
|------|------|------|
| analyze_resume_content.py | 采样分析15份简历 | content-structure-analysis.json |
| classify_by_content.py | 批量分类所有简历 | content-based-classification.json |
| select_content_test_set.py | 选择测试集 | content-based-test-set.json |
| test_content_quick.py | 快速验证测试 | quick-test-results.json |

## 测试策略

### 快速验证（5分钟）
每类1份，共9份

### 分类测试（30分钟）
每类5份，共45份

### 回归测试
固定30份代表性样本

## 与旧方案对比

| 维度 | 旧方案 | 新方案 |
|------|--------|--------|
| 分类依据 | 文件大小、图片数 | 内容模块、详细度 |
| 测试指导 | 间接 | 直接 |
| 可解释性 | 低 | 高 |

## 注意事项

1. 必须先启动 EasyConvert 服务
2. 分类依赖实际解析结果
3. API 调用有延迟，批量处理需时间
4. 确保 .env 配置正确
