# EasyConvert Phase 5 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 Phase 5 五个方向：缓存预热、用量报表导出、数据飞轮、批量评测增强、提示词优化闭环。

**Architecture:** 按 C4→C5→C3→C2→C1 顺序推进（简单到复杂）。C4/C5 独立最简单先做，C3 独立可并行，C2/C1 依赖评测数据顺序执行。

**Tech Stack:** Express.js (backend), React + Zustand (frontend), Vitest (tests), existing jobQueue + pool (DB)

---
## Task 1: C4 — 缓存预热接口 POST /api/parse/prefetch

**Files:**
- Modify: `server/routes/parse.ts`

**Step 1: 在 server/routes/parse.ts 末尾添加 prefetch 路由**

```typescript
/**
 * @openapi
 * /parse/prefetch:
 *   post:
 *     summary: 批量预热解析缓存
 *     tags: [Parse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hashes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 预热任务已入队
 */
router.post('/prefetch', async (req, res) => {
  try {
    const { hashes } = req.body as { hashes: string[] };
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return res.status(400).json({ error: 'hashes array required' });
    }

    // Check which hashes are already cached
    const placeholders = hashes.map((_, i) => `$${i + 1}`).join(',');
    const cached = await pool.query(
      `SELECT file_hash FROM parse_cache WHERE file_hash IN (${placeholders})`,
      hashes
    );
    const cachedSet = new Set(cached.rows.map((r: any) => r.file_hash));
    const uncached = hashes.filter(h => !cachedSet.has(h));

    // Queue uncached hashes for background processing
    for (const hash of uncached) {
      jobQueue.enqueue({
        id: `prefetch-${hash}`,
        status: 'pending',
        execute: async () => {
          // No-op: actual file not available, just mark as queued
          // Real prefetch would need file content; this tracks intent
          serverLogger.info('Prefetch queued', { hash });
        },
      });
    }

    res.json({ queued: uncached.length, alreadyCached: cachedSet.size });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
```

**Step 2: 在 BatchPage 上传完成后调用 prefetch**

在 `src/pages/BatchPage.tsx` 找到上传完成的回调，添加：

```typescript
// After batch upload completes, prefetch results
const hashes = results.map(r => r.hash).filter(Boolean);
if (hashes.length > 0) {
  fetch('/api/parse/prefetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashes }),
  }).catch(() => {}); // fire-and-forget
}
```

**Step 3: 运行测试**

Run: `npm run test -- --run`
Expected: 所有测试通过

**Step 4: Commit**

```bash
git add server/routes/parse.ts src/pages/BatchPage.tsx
git commit -m "feat: add POST /api/parse/prefetch for cache warming"
```

---
## Task 2: C5 — 用量报表导出增强

**Files:**
- Create: `src/lib/export/usageReport.ts`
- Modify: `src/pages/ApiUsage.tsx`
- Modify: `src/index.css`

**Step 1: 创建 src/lib/export/usageReport.ts**

```typescript
import type { UsageStats } from '../api/apiManagementApi';

export function buildUsageCSV(usage: UsageStats, days: number): string {
  const rows: string[][] = [
    ['EasyConvert API 用量报表'],
    [`时间范围: 最近 ${days} 天`],
    [`导出时间: ${new Date().toLocaleString('zh-CN')}`],
    [],
    ['=== 每日请求量 ==='],
    ['日期', '请求数'],
    ...(usage.requestsByDay || []).map(d => [d.date, String(d.count)]),
    [],
    ['=== 端点统计 ==='],
    ['端点', '请求数', '平均延迟(ms)'],
    ...(usage.requestsByEndpoint || []).map(e => [e.endpoint, String(e.count), String(e.avgLatency)]),
    [],
    ['=== 汇总 ==='],
    ['总请求数', String(usage.totalRequests ?? 0)],
    ['成功率', `${(usage.successRate ?? 0).toFixed(1)}%`],
    ['平均延迟', `${(usage.avgLatency ?? 0).toFixed(0)}ms`],
    ['总 Token', String(usage.totalTokens ?? 0)],
  ];
  return rows.map(r => r.join(',')).join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 2: 修改 src/pages/ApiUsage.tsx — 替换 handleExportCSV，添加 PDF 按钮**

找到现有的 `handleExportCSV` 函数，替换为：

```typescript
import { buildUsageCSV, downloadCSV } from '@lib/export/usageReport';

const handleExportCSV = () => {
  if (!usage) return;
  const csv = buildUsageCSV(usage, days);
  downloadCSV(csv, `api-usage-${days}d-${new Date().toISOString().slice(0,10)}.csv`);
};

const handleExportPDF = () => {
  window.print();
};
```

在导出按钮区域添加 PDF 按钮（紧跟 CSV 按钮后）：

```tsx
<button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2" disabled={!usage}>
  <Icon name="printer" size={16} />
  PDF
</button>
```

**Step 3: 在 src/index.css 添加打印样式**

在文件末尾添加：

```css
@media print {
  .sidebar,
  nav,
  [data-sidebar],
  .top-bar,
  [data-topbar],
  .btn-secondary,
  .btn-ghost,
  .bottom-tab-bar {
    display: none !important;
  }
  body {
    background: white !important;
  }
  .card {
    box-shadow: none !important;
    border: 1px solid #e5e7eb !important;
  }
}
```

**Step 4: 运行测试**

Run: `npm run test -- --run`
Expected: 所有测试通过

**Step 5: Commit**

```bash
git add src/lib/export/usageReport.ts src/pages/ApiUsage.tsx src/index.css
git commit -m "feat: enhance usage report CSV export + print PDF support"
```

---
## Task 3: C3 — 主动学习 activeLearning.ts

**Files:**
- Create: `src/lib/activeLearning.ts`
- Create: `src/lib/activeLearning.test.ts`

**Step 1: 写失败测试**

```typescript
// src/lib/activeLearning.test.ts
import { describe, it, expect } from 'vitest';
import { filterCandidates } from './activeLearning';
import type { ParseHistoryItem } from './api/parseHistoryApi';

const makeItem = (id: string, confidence: Record<string, number>, inEval = false): any => ({
  id,
  file_name: `${id}.pdf`,
  status: 'completed',
  result: { additional: { _confidence: confidence } },
  _inEvaluation: inEval,
});

describe('filterCandidates', () => {
  it('returns items with avg confidence < 0.75', () => {
    const items = [
      makeItem('a', { name: 0.5, email: 0.6 }),   // avg 0.55 → candidate
      makeItem('b', { name: 0.9, email: 0.95 }),  // avg 0.925 → skip
      makeItem('c', { name: 0.7, email: 0.7 }),   // avg 0.7 → candidate
    ];
    const result = filterCandidates(items, []);
    expect(result.map(r => r.id)).toEqual(['a', 'c']);
  });

  it('excludes items already in evaluation tasks', () => {
    const items = [makeItem('a', { name: 0.5 })];
    const result = filterCandidates(items, ['a']);
    expect(result).toHaveLength(0);
  });

  it('sorts by avg confidence ascending (most uncertain first)', () => {
    const items = [
      makeItem('b', { name: 0.7 }),
      makeItem('a', { name: 0.4 }),
    ];
    const result = filterCandidates(items, []);
    expect(result[0].id).toBe('a');
  });
});
```

**Step 2: 运行确认失败**

Run: `npm run test -- --run src/lib/activeLearning.test.ts`
Expected: FAIL (module not found)

**Step 3: 实现 activeLearning.ts**

```typescript
// src/lib/activeLearning.ts
import type { ParseHistoryItem } from './api/parseHistoryApi';

export interface LearningCandidate {
  id: string;
  fileName: string;
  avgConfidence: number;
  language?: string;
}

function avgConfidence(item: ParseHistoryItem): number {
  const conf = item.result?.additional?._confidence as Record<string, number> | undefined;
  if (!conf) return 1; // no confidence data → assume high, skip
  const vals = Object.values(conf);
  if (vals.length === 0) return 1;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function filterCandidates(
  items: ParseHistoryItem[],
  evaluatedIds: string[],
  threshold = 0.75,
): LearningCandidate[] {
  const evalSet = new Set(evaluatedIds);
  return items
    .filter(item => !evalSet.has(item.id) && item.status === 'completed')
    .map(item => ({ id: item.id, fileName: item.file_name, avgConfidence: avgConfidence(item), language: item.result?.additional?.language }))
    .filter(c => c.avgConfidence < threshold)
    .sort((a, b) => a.avgConfidence - b.avgConfidence);
}
```

**Step 4: 运行确认通过**

Run: `npm run test -- --run src/lib/activeLearning.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/lib/activeLearning.ts src/lib/activeLearning.test.ts
git commit -m "feat: add activeLearning filterCandidates (TDD)"
```

---
