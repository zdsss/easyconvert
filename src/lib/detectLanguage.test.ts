import { describe, it, expect } from 'vitest';
import { detectLanguage } from './detectLanguage';

describe('detectLanguage', () => {
  it('detects Chinese', () => {
    const text = '姓名：张三\n工作经历：腾讯科技有限公司\n职位：高级工程师\n技能：JavaScript TypeScript React';
    expect(detectLanguage(text)).toBe('zh');
  });

  it('detects English', () => {
    const text = 'John Smith\nSoftware Engineer at Google\nExperience: 5 years in web development\nSkills: JavaScript, TypeScript, React, Node.js';
    expect(detectLanguage(text)).toBe('en');
  });

  it('detects Japanese', () => {
    const text = '山田太郎\n職務経歴書\n株式会社トヨタ勤務\nエンジニア職　5年間の経験あり';
    expect(detectLanguage(text)).toBe('ja');
  });

  it('returns zh for mixed Chinese-English (Chinese dominant)', () => {
    const text = '张三 John\n工作经历 Work Experience\n腾讯 Tencent\n技能 Skills: JavaScript';
    expect(detectLanguage(text)).toBe('zh');
  });

  it('returns unknown for empty text', () => {
    expect(detectLanguage('')).toBe('unknown');
  });
});
