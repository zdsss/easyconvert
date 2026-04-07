# 基于解析难度的简历分类指南

## 分类维度

### 1. 解析难度 (Difficulty)

**Easy（简单）**
- 标准格式（表格式/ATS友好）
- 模块清晰有标题
- 信息规整，日期格式统一
- 无特殊字符

**Standard（标准）**
- 常见格式（双栏/单栏）
- 模块基本清晰
- 少量格式不规范
- 单语言

**Hard（困难）**
- 非标准格式（创意型）
- 模块边界模糊
- 多种日期格式
- 中英混合，特殊字符多

### 2. 内容完整度 (Completeness)

**Basic（基础）**: ≤4个模块
**Complete（完整）**: 5-7个模块
**Rich（丰富）**: ≥8个模块

### 3. 特殊场景 (Scenario)

**Fresh（应届生）**: 无工作经历或仅实习
**Tech（技术岗）**: 技能>5项，项目>2个
**Executive（高管）**: 工作经历>5段
**General（通用）**: 其他

## 使用流程

1. 运行分类脚本: `python scripts/reclassify_by_parsing_difficulty.py`
2. 选择测试集: `python scripts/select_stratified_test_set.py`
3. 通过评测系统执行测试（`/evaluation` 页面）
4. 通过标注系统进行人工标注（`/evaluation/annotations` 页面）
