# Phase 3 新能力扩展 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 扩展 EasyConvert 支持更多文件格式（含扫描版 PDF via Claude Vision）、质量评分、去重检测、Swagger 文档、AI 辅助标注预填充+置信度、以及 Word/PDF 模板导出。

**Architecture:** Batch 1（5.1 格式扩展 + 5.5 轻量增强）与 Batch 2（5.3 AI 标注 + 5.2 模板导出）顺序执行。扫描版 PDF 使用 Claude 原生 PDF document content block，无需 canvas 渲染。质量评分为纯函数，去重在 server/lib/dedup.ts 实现并集成到 resumeProcessor。

**Tech Stack:** pdfjs-dist（已有）、docx（新增）、marked（新增）、swagger-jsdoc + swagger-ui-express（新增）、Claude API document content block

---

## Task 1: 安装新依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装运行时依赖**

Run: `npm install docx marked`
Run: `npm install --save-dev swagger-jsdoc swagger-ui-express @types/swagger-jsdoc @types/swagger-ui-express`

**Step 2: 验证安装**

Run: `node -e "require('docx'); require('marked'); console.log('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add docx, marked, swagger deps for Phase 3"
```

---

## Task 2: parseText.ts + parseMarkdown.ts

**Files:**
- Create: `src/lib/parsers/parseText.ts`
- Create: `src/lib/parsers/parseMarkdown.ts`
- Modify: `src/lib/parsers/registry.ts`

**Step 1: 创建 parseText.ts**

```typescript
// src/lib/parsers/parseText.ts
import type { Parser } from './registry';

export const textParser: Parser = {
  name: 'text',
  extensions: ['.txt'],
  async parse(file: File): Promise<string> {
    return file.text();
  },
};
```

**Step 2: 创建 parseMarkdown.ts**

```typescript
// src/lib/parsers/parseMarkdown.ts
import { marked } from 'marked';
import type { Parser } from './registry';

export const markdownParser: Parser = {
  name: 'markdown',
  extensions: ['.md', '.markdown'],
  async parse(file: File): Promise<string> {
    const raw = await file.text();
    const html = await marked(raw);
    return (html as string).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  },
};
```

**Step 3: 注册到 registry.ts — 在文件末尾添加**

```typescript
import { textParser } from './parseText';
import { markdownParser } from './parseMarkdown';
parserRegistry.register(textParser);
parserRegistry.register(markdownParser);
```

**Step 4: 运行测试**

Run: `npm run test -- --run src/lib/parsers`
Expected: 所有 parser 测试通过

**Step 5: Commit**

```bash
git add src/lib/parsers/parseText.ts src/lib/parsers/parseMarkdown.ts src/lib/parsers/registry.ts
git commit -m "feat: add .txt and .md parsers"
```

---

## Task 3: Claude Vision — 扫描版 PDF 支持

**Files:**
- Modify: `src/lib/extractWithLLM.ts`
- Modify: `src/lib/parsers/parsePdf.ts`
- Modify: `server/lib/extractWithLLM.ts`

**Step 1: 修改 src/lib/extractWithLLM.ts**

Add `pdfBase64?: string` as third parameter to `extractResume`. When provider is claude and pdfBase64 is present, build document content block:

```typescript
export async function extractResume(
  text: string,
  strategy?: ParsingStrategy,
  pdfBase64?: string,
): Promise<Resume>
```

Inside the function, when constructing the user message for Claude:

```typescript
const userContent = pdfBase64
  ? [
      { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: pdfBase64 } },
      { type: 'text' as const, text: prompt },
    ]
  : `${prompt}\n\n${text}`;
```

**Step 2: 在 src/lib/parsers/parsePdf.ts 添加 Vision fallback 导出函数**

```typescript
export async function parsePdfWithVisionFallback(
  file: File,
  strategy?: ParsingStrategy,
): Promise<import('../types').Resume | null> {
  const text = await pdfParser.parse(file);
  if (text.trim().length >= 50) return null;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const { extractResume } = await import('../extractWithLLM');
  return extractResume('', strategy, base64);
}
```

**Step 3: 修改 server/lib/extractWithLLM.ts — 同样添加 pdfBase64 参数**

Same change as Step 1 but for the server-side file. Add `pdfBase64?: string` parameter and build document content block when calling Claude provider.

**Step 4: 运行测试**

Run: `npm run test -- --run`
Expected: 所有测试通过

**Step 5: Commit**

```bash
git add src/lib/extractWithLLM.ts src/lib/parsers/parsePdf.ts server/lib/extractWithLLM.ts
git commit -m "feat: Claude Vision fallback for scanned PDFs"
```

---

## Task 4: 质量评分 qualityScore.ts

**Files:**
- Create: `src/lib/qualityScore.ts`
- Create: `src/lib/qualityScore.test.ts`

**Step 1: 写失败测试**

```typescript
// src/lib/qualityScore.test.ts
import { describe, it, expect } from 'vitest';
import { calcQualityScore } from './qualityScore';

describe('calcQualityScore', () => {
  it('returns 0 for empty resume', () => {
    expect(calcQualityScore({} as any)).toBe(0);
  });

  it('returns 100 for complete resume', () => {
    const resume = {
      basics: { name: 'A', email: 'a@b.com', phone: '123', title: 'Dev' },
      work: [{ company: 'X', position: 'Y', startDate: '2020', endDate: '2023' }],
      education: [{ institution: 'U', degree: 'BS', startDate: '2016', endDate: '2020' }],
      skills: ['JS', 'TS', 'React'],
    };
    expect(calcQualityScore(resume as any)).toBe(100);
  });

  it('partial resume scores proportionally', () => {
    const resume = { basics: { name: 'A', email: 'a@b.com' } };
    const score = calcQualityScore(resume as any);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});
```

**Step 2: 运行确认失败**

Run: `npm run test -- --run src/lib/qualityScore.test.ts`
Expected: FAIL

**Step 3: 实现 qualityScore.ts**

```typescript
// src/lib/qualityScore.ts
import type { Resume } from './types';

const WEIGHTS = { name: 15, email: 10, phone: 10, title: 5, work: 25, education: 20, skills: 15 } as const;

export function calcQualityScore(resume: Resume): number {
  let score = 0;
  if (resume.basics?.name) score += WEIGHTS.name;
  if (resume.basics?.email) score += WEIGHTS.email;
  if (resume.basics?.phone) score += WEIGHTS.phone;
  if (resume.basics?.title) score += WEIGHTS.title;
  if (resume.work?.length) score += WEIGHTS.work;
  if (resume.education?.length) score += WEIGHTS.education;
  if ((resume.skills?.length ?? 0) >= 3) score += WEIGHTS.skills;
  return score;
}
```

**Step 4: 运行确认通过**

Run: `npm run test -- --run src/lib/qualityScore.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/lib/qualityScore.ts src/lib/qualityScore.test.ts
git commit -m "feat: add resume quality scoring (TDD)"
```

---

## Task 5: 去重检测 server/lib/dedup.ts

**Files:**
- Create: `server/lib/dedup.ts`
- Modify: `server/lib/resumeProcessor.ts`
- Modify: `server/types.ts`

**Step 1: 创建 dedup.ts**

```typescript
// server/lib/dedup.ts
import crypto from 'crypto';
import type { Resume } from '../types';

export function hashResume(resume: Resume): string {
  const sorted = JSON.stringify(resume, Object.keys(resume as object).sort());
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

const dedupStore = new Map<string, string>();

export function checkDuplicate(hash: string): string | null {
  return dedupStore.get(hash) ?? null;
}

export function registerResult(hash: string, resultId: string): void {
  dedupStore.set(hash, resultId);
}
```

**Step 2: 在 server/types.ts 的 ServerProcessResult 接口添加字段**

```typescript
duplicate?: boolean;
existingId?: string;
```

**Step 3: 在 server/lib/resumeProcessor.ts 集成去重**

After the resume is extracted (after `llm_extract` stage), add:

```typescript
import { hashResume, checkDuplicate, registerResult } from './dedup';

const resumeHash = hashResume(result.resume);
const existingId = checkDuplicate(resumeHash);
if (existingId) {
  return { ...result, duplicate: true, existingId };
}
registerResult(resumeHash, result.hash);
```

**Step 4: Commit**

```bash
git add server/lib/dedup.ts server/lib/resumeProcessor.ts server/types.ts
git commit -m "feat: add resume dedup detection"
```

---

## Task 6: Swagger 文档

**Files:**
- Create: `server/lib/swagger.ts`
- Modify: `server/index.ts`

**Step 1: 创建 server/lib/swagger.ts**

```typescript
// server/lib/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'EasyConvert API', version: '2.0.0', description: '简历解析系统 API' },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
    },
  },
  apis: ['./server/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

**Step 2: 挂载到 server/index.ts**

Add before existing routes:

```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './lib/swagger';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
```

**Step 3: 在 server/routes/parse.ts 添加 JSDoc 注释**

```typescript
/**
 * @openapi
 * /parse:
 *   post:
 *     summary: 同步解析简历
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 解析成功
 *       400:
 *         description: 缺少文件
 */
```

**Step 4: Commit**

```bash
git add server/lib/swagger.ts server/index.ts server/routes/parse.ts
git commit -m "feat: add Swagger UI at /api/docs"
```

---

## Task 7: extractWithLLM 置信度输出

**Files:**
- Modify: `src/lib/extractWithLLM.ts`

**Step 1: 修改 prompt 要求返回 confidence**

In the prompt template, after the JSON schema description, add:

```
对每个字段，同时返回一个 _confidence 值（0-1），表示提取置信度。
例如 "name_confidence": 0.95
```

**Step 2: 解析返回值中的 confidence 字段**

After parsing the LLM JSON response, extract confidence values into `resume.additional._confidence`:

```typescript
const confidenceMap: Record<string, number> = {};
function extractConfidence(obj: Record<string, unknown>, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith('_confidence') && typeof v === 'number') {
      confidenceMap[prefix + k.replace('_confidence', '')] = v;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      extractConfidence(v as Record<string, unknown>, `${prefix}${k}.`);
    }
  }
}
extractConfidence(parsed as Record<string, unknown>);
if (Object.keys(confidenceMap).length > 0) {
  resume.additional = { ...resume.additional, _confidence: confidenceMap };
}
```

**Step 3: Commit**

```bash
git add src/lib/extractWithLLM.ts
git commit -m "feat: extract per-field confidence from LLM response"
```

---

## Task 8: AnnotationEditor 预填充 + 置信度 badge

**Files:**
- Modify: `src/components/AnnotationEditor.tsx`
- Modify: `src/pages/EvaluationDetail.tsx`

**Step 1: 修改 AnnotationEditor Props 接口**

```typescript
interface Props {
  result: EvaluationResult;
  onSave: (annotation: AnnotationData) => void;
  onCancel: () => void;
  prefillData?: Record<string, any>;
  confidenceData?: Record<string, number>;
}
```

**Step 2: 预填充 useState 初始值**

```typescript
const [formData, setFormData] = useState<AnnotationData>(() => {
  if (prefillData?.basics) return { basics: { ...prefillData.basics } };
  return {};
});
```

**Step 3: 添加 ConfidenceBadge 组件（在文件内部）**

```typescript
function ConfidenceBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const cls = score >= 0.9 ? 'bg-emerald-500' : score >= 0.7 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className={`ml-1 px-1 py-0.5 rounded text-xs text-white font-mono ${cls}`}>
      {(score * 100).toFixed(0)}%
    </span>
  );
}
```

**Step 4: 在字段标签旁渲染 badge**

For each field label (e.g., "姓名"), add:
```typescript
<ConfidenceBadge score={confidenceData?.['basics.name']} />
```

**Step 5: 修改 EvaluationDetail.tsx — 传递 prefillData**

Find where AnnotationEditor or EvaluationResultDrawer is rendered and pass:
```typescript
prefillData={selectedResult?.parsedResume}
confidenceData={selectedResult?.parsedResume?.additional?._confidence}
```

**Step 6: Commit**

```bash
git add src/components/AnnotationEditor.tsx src/pages/EvaluationDetail.tsx
git commit -m "feat: AnnotationEditor prefill + confidence badges"
```

---

## Task 9: Word/PDF 导出

**Files:**
- Create: `src/lib/export/resumeToDocx.ts`
- Create: `src/lib/export/templates/simple.ts`

**Step 1: 创建 simple 模板**

```typescript
// src/lib/export/templates/simple.ts
import { Document, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { Resume } from '../../types';

export function buildSimpleDoc(resume: Resume): Document {
  const children: Paragraph[] = [];

  children.push(new Paragraph({ text: resume.basics?.name ?? '未知', heading: HeadingLevel.HEADING_1 }));

  const contact = [resume.basics?.email, resume.basics?.phone, resume.basics?.location].filter(Boolean).join(' | ');
  if (contact) children.push(new Paragraph({ text: contact }));

  if (resume.work?.length) {
    children.push(new Paragraph({ text: '工作经历', heading: HeadingLevel.HEADING_2 }));
    for (const w of resume.work) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: w.company, bold: true }),
          new TextRun({ text: `  ${w.position}  ${w.startDate}–${w.endDate ?? '至今'}` }),
        ],
      }));
    }
  }

  if (resume.education?.length) {
    children.push(new Paragraph({ text: '教育背景', heading: HeadingLevel.HEADING_2 }));
    for (const e of resume.education) {
      children.push(new Paragraph({ text: `${e.institution}  ${e.degree}  ${e.startDate}–${e.endDate}` }));
    }
  }

  if (resume.skills?.length) {
    children.push(new Paragraph({ text: '技能', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: resume.skills.join('、') }));
  }

  return new Document({ sections: [{ children }] });
}
```

**Step 2: 创建 resumeToDocx.ts**

```typescript
// src/lib/export/resumeToDocx.ts
import { Packer } from 'docx';
import { buildSimpleDoc } from './templates/simple';
import type { Resume } from '../types';

export type ExportTemplate = 'simple';

export async function exportToDocx(resume: Resume, template: ExportTemplate = 'simple'): Promise<void> {
  const doc = buildSimpleDoc(resume);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resume.basics?.name ?? 'resume'}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPdf(): void {
  window.print();
}
```

**Step 3: Commit**

```bash
git add src/lib/export/
git commit -m "feat: Word/PDF export with simple template"
```

---

## Task 10: ExportMenu 组件 + 接入 ParseHistoryPage

**Files:**
- Create: `src/components/ExportMenu.tsx`
- Modify: `src/pages/ParseHistoryPage.tsx`

**Step 1: 创建 ExportMenu.tsx**

```typescript
// src/components/ExportMenu.tsx
import { useState } from 'react';
import Icon from './ui/Icon';
import { exportToDocx, exportToPdf } from '@lib/export/resumeToDocx';
import type { Resume } from '@lib/types';

interface Props { resume: Resume; }

export default function ExportMenu({ resume }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="btn-ghost p-1.5 flex items-center gap-1 text-xs">
        <Icon name="download" size={14} /> 导出
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 min-w-32">
          <button className="w-full px-3 py-2 text-sm text-left hover:bg-surface-secondary flex items-center gap-2"
            onClick={() => { exportToDocx(resume); setOpen(false); }}>
            <Icon name="file-text" size={14} /> Word (.docx)
          </button>
          <button className="w-full px-3 py-2 text-sm text-left hover:bg-surface-secondary flex items-center gap-2"
            onClick={() => { exportToPdf(); setOpen(false); }}>
            <Icon name="printer" size={14} /> PDF（打印）
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 在 ParseHistoryPage 操作列添加 ExportMenu**

In `src/pages/ParseHistoryPage.tsx`, import ExportMenu and add to the actions column:

```typescript
import ExportMenu from '@components/ExportMenu';

// In the table row actions, where item.result exists:
{item.result && <ExportMenu resume={item.result} />}
```

**Step 3: 全量测试**

Run: `npm run test -- --run`
Expected: 所有测试通过

**Step 4: 构建验证**

Run: `npm run build`
Expected: 无 chunk > 500KB 警告

**Step 5: 最终 Commit**

```bash
git add src/components/ExportMenu.tsx src/pages/ParseHistoryPage.tsx
git commit -m "feat: add ExportMenu to ParseHistoryPage"
```

---

## 验收检查清单

- [ ] `.txt` / `.md` 文件可正常解析
- [ ] 扫描版 PDF 通过 Claude Vision 成功提取
- [ ] 所有解析结果包含 qualityScore（0-100）
- [ ] 重复文件返回 duplicate: true
- [ ] /api/docs 可访问 Swagger UI
- [ ] AnnotationEditor 打开时自动预填充
- [ ] 置信度 badge 正确显示颜色
- [ ] Word 导出生成有效 .docx
- [ ] PDF 导出触发打印对话框
- [ ] npm run test -- --run 零失败
- [ ] npm run build 无新增 >500KB chunk
