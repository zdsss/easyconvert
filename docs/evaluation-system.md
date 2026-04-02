# 运营评测系统

## 功能概述

基于 EasyConvert 简历解析系统的运营评测模块，支持：

- 批量评测任务管理
- 处理流程追踪（8个阶段）
- 多维度指标计算（整体准确率、字段级准确率、分类分析）
- 人工标注对比
- 技术报告生成

## 架构

**前端**: React + React Router + Zustand + Tailwind CSS
**后端**: Node.js + Express + PostgreSQL

## 安装

```bash
# 安装依赖
npm install

# 配置数据库
cp server/.env.example server/.env
# 编辑 server/.env 填入数据库配置

# 初始化数据库
psql -U postgres -d easyconvert -f server/db/schema.sql
```

## 运行

```bash
# 启动前端
npm run dev

# 启动后端（新终端）
npm run server
```

## 使用流程

1. 访问 http://localhost:5173/evaluation
2. 点击"新建评测"创建任务
3. 上传简历文件进行批量评测
4. 查看评测结果和指标
5. 可选：上传标注数据进行准确率对比

## 评测指标

- **整体准确率**: 所有字段综合准确率
- **精确率/召回率/F1**: 标准评测指标
- **字段级准确率**: 每个字段的匹配情况
- **完整度评分**: 字段完整性分析
- **处理流程追踪**: 8个阶段的耗时和状态

## 文件结构

```
server/
  ├── db/schema.sql          # 数据库表结构
  ├── routes/                # API 路由
  └── index.ts               # 服务器入口

src/
  ├── lib/
  │   ├── evaluationStore.ts      # 状态管理
  │   ├── evaluationProcessor.ts  # 评测处理器
  │   ├── metricsCalculator.ts    # 指标计算
  │   ├── processTracer.ts        # 流程追踪
  │   └── api/evaluationApi.ts    # API 封装
  └── pages/
      ├── EvaluationList.tsx      # 任务列表
      ├── EvaluationDetail.tsx    # 任务详情
      └── EvaluationNew.tsx       # 新建任务
```
