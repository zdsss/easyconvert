# EasyConvert 系统架构设计

**版本**: v1.0
**日期**: 2026-03-30

## 一、系统概述

### 1.1 目标
构建一个Web应用，将各种格式的简历转换为标准化的JSON Resume格式，支持手动编辑和导出。

### 1.2 核心能力
- 解析PDF、DOCX、HTML格式简历
- 提取结构化信息（姓名、联系方式、工作经历等）
- 输出JSON Resume标准格式
- 支持中文字段扩展
- 提供在线编辑功能

---

## 二、技术栈选型

### 2.1 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI库**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand (轻量级)
- **表单处理**: React Hook Form + Zod验证

### 2.2 文件解析库
- **PDF**: pdf.js (Mozilla)
- **DOCX**: mammoth.js
- **HTML**: DOMParser (原生)

### 2.3 后端 (可选)
- **运行时**: Node.js 20+
- **框架**: Express / Hono (轻量)
- **部署**: Vercel Serverless Functions

### 2.4 LLM集成
- **主要**: Claude API (Anthropic)
- **备选**: OpenAI GPT-4
- **本地**: 支持用户自带API Key

---

## 三、系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户浏览器                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │           React前端应用                           │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐ │   │
│  │  │文件上传│  │解析器  │  │编辑器  │  │导出器  │ │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  前端解析 (DOCX/HTML)          │
         │  - mammoth.js                  │
         │  - DOMParser                   │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  LLM API (复杂格式)            │
         │  - PDF解析                     │
         │  - 语义提取                    │
         │  - 结构化输出                  │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  JSON Resume输出               │
         │  - 标准字段                    │
         │  - 中文扩展                    │
         └────────────────────────────────┘
```

### 3.2 模块划分

#### **前端模块**
1. **上传模块** (`/src/components/Upload`)
   - 文件拖拽上传
   - 格式验证
   - 文件预览

2. **解析模块** (`/src/lib/parsers`)
   - PDF解析器
   - DOCX解析器
   - HTML解析器
   - LLM集成

3. **编辑模块** (`/src/components/Editor`)
   - JSON可视化编辑
   - 字段验证
   - 实时预览

4. **导出模块** (`/src/lib/export`)
   - JSON下载
   - 格式验证
   - 模板生成

---

## 四、数据流设计

### 4.1 解析流程

```
用户上传文件
    ↓
文件类型检测
    ↓
┌─────────────┬─────────────┬─────────────┐
│   DOCX      │    HTML     │    PDF      │
│  (前端解析)  │  (前端解析)  │ (LLM解析)   │
└─────────────┴─────────────┴─────────────┘
    ↓             ↓             ↓
提取文本内容
    ↓
LLM语义分析 (统一处理)
    ↓
结构化数据提取
    ↓
JSON Schema验证
    ↓
展示给用户编辑
    ↓
导出JSON Resume
```

### 4.2 数据模型

基于JSON Resume标准，扩展中文字段：

```typescript
interface ResumeData {
  // 标准字段
  basics: {
    name: string;
    label?: string;
    email: string;
    phone: string;
    url?: string;
    summary?: string;
    location?: Location;
  };
  work: WorkExperience[];
  education: Education[];
  skills: Skill[];

  // 中文扩展
  extensions?: {
    cn?: {
      politicalStatus?: string;  // 政治面貌
      hukou?: string;            // 户籍
      maritalStatus?: string;    // 婚姻状况
      nationality?: string;      // 民族
    };
  };
}
```

---

## 五、解析引擎设计

### 5.1 PDF解析策略

**方案**: pdf.js提取文本 + LLM语义理解

```typescript
async function parsePDF(file: File): Promise<string> {
  // 1. 使用pdf.js提取文本
  const pdf = await pdfjsLib.getDocument(file);
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ');
  }

  return fullText;
}
```

### 5.2 DOCX解析策略

**方案**: mammoth.js提取HTML + DOM解析

```typescript
async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value; // HTML字符串
}
```

### 5.3 LLM提示词设计

```typescript
const PARSE_PROMPT = `
你是一个专业的简历解析助手。请从以下文本中提取简历信息，输出JSON格式。

要求：
1. 严格按照JSON Resume标准格式
2. 识别中文特色字段（政治面貌、户籍等）
3. 日期统一为YYYY-MM-DD格式
4. 如果信息缺失，使用null

文本内容：
{resumeText}

请输出JSON：
`;
```

---

## 六、项目结构

```
easyconvert/
├── src/
│   ├── components/          # React组件
│   │   ├── Upload/         # 上传组件
│   │   ├── Editor/         # 编辑器
│   │   └── Preview/        # 预览组件
│   ├── lib/                # 核心库
│   │   ├── parsers/        # 解析器
│   │   │   ├── pdf.ts
│   │   │   ├── docx.ts
│   │   │   └── html.ts
│   │   ├── llm/            # LLM集成
│   │   │   └── claude.ts
│   │   ├── schema/         # 数据模型
│   │   │   └── resume.ts
│   │   └── export/         # 导出功能
│   ├── types/              # TypeScript类型
│   └── App.tsx             # 主应用
├── public/                 # 静态资源
├── docs/                   # 文档
│   ├── research/           # 调研报告
│   └── plans/              # 设计文档
└── package.json
```

---

## 七、MVP实施计划

### 7.1 Phase 1: 基础框架 (Week 1)

**任务**:
1. 初始化React + Vite项目
2. 配置TypeScript和Tailwind CSS
3. 搭建基础页面布局
4. 实现文件上传组件

**交付物**:
- 可运行的Web应用
- 支持文件拖拽上传

### 7.2 Phase 2: 解析引擎 (Week 2-3)

**任务**:
1. 集成pdf.js和mammoth.js
2. 实现DOCX解析
3. 实现PDF文本提取
4. 集成Claude API
5. 设计LLM提示词

**交付物**:
- DOCX → JSON转换
- PDF → JSON转换
- 基础准确率达到70%+

### 7.3 Phase 3: 编辑和导出 (Week 4)

**任务**:
1. 实现JSON编辑器
2. 添加字段验证
3. 实现JSON下载功能
4. 优化用户体验

**交付物**:
- 完整的MVP功能
- 可编辑和导出

### 7.4 Phase 4: 优化迭代 (Week 5-6)

**任务**:
1. 提升解析准确率
2. 添加中文字段支持
3. 性能优化
4. 错误处理完善

**交付物**:
- 准确率提升到85%+
- 完整的错误提示

---

## 八、技术难点与解决方案

### 8.1 PDF复杂布局解析

**难点**: 多栏、表格、图文混排
**方案**:
- 使用pdf.js获取文本位置信息
- LLM理解文本语义关系
- 提供手动调整功能

### 8.2 LLM成本控制

**难点**: API调用成本高
**方案**:
- 前端先做简单解析，减少LLM调用
- 实现结果缓存
- 支持用户自带API Key

### 8.3 隐私安全

**难点**: 简历包含敏感信息
**方案**:
- 纯前端处理（DOCX/HTML）
- LLM调用时明确告知用户
- 不存储任何用户数据

---

## 九、部署方案

### 9.1 推荐部署

**平台**: Vercel
**优势**:
- 免费额度充足
- 自动CI/CD
- 全球CDN加速
- 支持Serverless函数

### 9.2 部署配置

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-03-30
