import type { ResumeClassification } from '../types';
import { DIFFICULTY_THRESHOLDS } from '../constants';
import { assessContentCompleteness, identifyScenario } from './sharedHelpers';

export function classifyDifficulty(text: string): ResumeClassification {
  const difficulty = assessParsingDifficulty(text);
  const completeness = assessContentCompleteness(text);
  const scenario = identifyScenario(text);

  return { difficulty, completeness, scenario };
}

function assessParsingDifficulty(text: string): 'easy' | 'standard' | 'hard' {
  let score = 0;

  const standardHeaders = [
    '个人信息',
    '基本信息',
    '工作经历',
    '工作经验',
    '教育背景',
    '教育经历',
    '项目经验',
    '技能',
    '自我评价',
  ];
  const headerCount = standardHeaders.filter((h) => text.includes(h)).length;
  if (headerCount >= 4) score -= 2;

  const datePatterns = [/\d{4}[年.-]\d{1,2}/, /\d{4}\/\d{1,2}/, /\d{4}\.\d{1,2}/];
  const dateFormats = datePatterns.filter((p) => p.test(text)).length;
  if (dateFormats > 2) score += 1;

  const specialChars = (text.match(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,;:()（）、，。；：]/g) || []).length;
  if (specialChars > 50) score += 1;

  const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (chineseCount > 0 && englishCount > 0) {
    const ratio = Math.min(chineseCount, englishCount) / Math.max(chineseCount, englishCount);
    if (ratio > 0.3) score += 1;
  }

  const lines = text.split('\n');
  const longParagraphs = lines.filter((line) => line.length > 100).length;
  if (longParagraphs > 5) score += 1;

  if (score <= DIFFICULTY_THRESHOLDS.EASY) return 'easy';
  if (score <= DIFFICULTY_THRESHOLDS.STANDARD) return 'standard';
  return 'hard';
}
