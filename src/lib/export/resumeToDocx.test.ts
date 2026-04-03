import { describe, it, expect } from 'vitest';
import { Document } from 'docx';
import { buildSimpleDoc } from './templates/simple';
import { buildProfessionalDoc } from './templates/professional';
import type { Resume } from '../types';

const mockResume: Resume = {
  basics: { name: '张三', email: 'test@test.com', phone: '13800138000', title: '工程师', location: '北京' },
  work: [{ company: 'ABC公司', position: '高级工程师', startDate: '2020-01', endDate: '2024-01' }],
  education: [{ institution: '北京大学', degree: '本科', major: '计算机', startDate: '2016-09', endDate: '2020-06' }],
  skills: ['TypeScript', 'React', 'Node.js'],
};

const emptyResume: Resume = {
  basics: { name: '', email: '', phone: '' },
  work: [],
  education: [],
};

describe('resumeToDocx template builders', () => {
  it('buildSimpleDoc returns a Document instance', () => {
    const doc = buildSimpleDoc(mockResume);
    expect(doc).toBeDefined();
    expect(doc).toBeInstanceOf(Document);
  });

  it('buildProfessionalDoc returns a Document instance', () => {
    const doc = buildProfessionalDoc(mockResume);
    expect(doc).toBeDefined();
    expect(doc).toBeInstanceOf(Document);
  });

  it('buildSimpleDoc handles empty resume without throwing', () => {
    expect(() => buildSimpleDoc(emptyResume)).not.toThrow();
    const doc = buildSimpleDoc(emptyResume);
    expect(doc).toBeInstanceOf(Document);
  });

  it('buildProfessionalDoc handles empty resume without throwing', () => {
    expect(() => buildProfessionalDoc(emptyResume)).not.toThrow();
    const doc = buildProfessionalDoc(emptyResume);
    expect(doc).toBeInstanceOf(Document);
  });
});
