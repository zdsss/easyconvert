# EasyConvert - 简历解析系统

## 项目概述
基于LLM的简历解析系统，支持多种格式简历的智能提取。

## Python 环境
- 使用 conda 环境运行所有 Python 脚本
- 运行命令格式: `conda run -n <env_name> python script.py`

## 项目结构
- `scripts/` - Python 脚本（分类、测试、标注）
- `src/lib/` - TypeScript 核心库（策略、提示词、验证）
- `test-resumes/` - 测试简历数据
- `docs/plans/` - 设计文档

## 当前实现
基于解析难度的三维分类系统：
- 难度: easy/standard/hard
- 完整度: basic/complete/rich
- 场景: fresh/tech/executive/general
