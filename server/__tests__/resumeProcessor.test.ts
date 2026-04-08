import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../lib/parsePdf', () => ({
  parsePdf: vi.fn().mockResolvedValue('张三\n电话：13800138000\n邮箱：zhangsan@example.com\n工作经历\n某公司 软件工程师 2020-01 至今'),
}));
vi.mock('../lib/parseDocx', () => ({
  parseDocx: vi.fn().mockResolvedValue('李四\n电话：13900139000\n邮箱：lisi@example.com'),
}));
vi.mock('../lib/extractWithLLM', () => ({
  extractResume: vi.fn().mockResolvedValue({
    basics: { name: '张三', email: 'zhangsan@example.com', phone: '13800138000' },
    work: [{ company: '某公司', position: '软件工程师', startDate: '2020-01', endDate: '至今' }],
    education: [],
  }),
}));
vi.mock('../lib/cache', () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
}));

import { processResume } from '../lib/resumeProcessor';
import type { ServerFileInput } from '../lib/types';

describe('Server resumeProcessor', () => {
  it('should process a PDF file through the full pipeline', async () => {
    const file: ServerFileInput = {
      buffer: Buffer.from('fake pdf content'),
      name: 'test.pdf',
      size: 1024,
      mimeType: 'application/pdf',
    };

    const result = await processResume(file);

    expect(result.resume).toBeDefined();
    expect(result.resume.basics.name).toBe('张三');
    expect(result.fromCache).toBe(false);
    expect(result.hash).toBeDefined();
    expect(result.hash.length).toBe(64); // SHA-256 hex
  });

  it('should process a DOCX file', async () => {
    const file: ServerFileInput = {
      buffer: Buffer.from('fake docx content'),
      name: 'test.docx',
      size: 2048,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    const result = await processResume(file);
    expect(result.resume).toBeDefined();
    expect(result.fromCache).toBe(false);
  });

  it('should return cached result when available', async () => {
    const { getCached } = await import('../lib/cache');
    (getCached as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      resume: {
        basics: { name: '缓存用户', email: 'cached@test.com', phone: '123' },
        work: [],
        education: [],
      },
      contentClass: { structure: 'simple', detail: 'brief', modules: [], category: 'general' },
      timestamp: Date.now(),
    });

    const file: ServerFileInput = {
      buffer: Buffer.from('cached content'),
      name: 'cached.pdf',
      size: 512,
      mimeType: 'application/pdf',
    };

    const result = await processResume(file);
    expect(result.fromCache).toBe(true);
    expect(result.resume.basics.name).toBe('缓存用户');
  });

  it('should track stage completion', async () => {
    const stages: string[] = [];
    const file: ServerFileInput = {
      buffer: Buffer.from('stage tracking test'),
      name: 'stages.pdf',
      size: 256,
      mimeType: 'application/pdf',
    };

    await processResume(file, {
      onStageComplete: (stage) => stages.push(stage),
    });

    expect(stages).toContain('file_upload');
    expect(stages).toContain('file_parse');
    expect(stages).toContain('difficulty_classify');
    expect(stages).toContain('strategy_select');
    expect(stages).toContain('llm_extract');
  });
});
