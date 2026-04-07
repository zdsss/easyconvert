import type { ResumeClassification } from '../types';

interface DifficultyFeatures {
  sectionBoundaryScore: number;
  headerStandardization: number;
  dateFormatConsistency: number;
  layoutComplexity: number;
  languageMixRatio: number;
}

export function classifyDifficultyAdvanced(text: string): ResumeClassification {
  const difficulty = assessParsingDifficultyAdvanced(text);
  const completeness = assessContentCompleteness(text);
  const scenario = identifyScenario(text);

  return { difficulty, completeness, scenario };
}

function assessParsingDifficultyAdvanced(text: string): 'easy' | 'standard' | 'hard' {
  const features = extractFeatures(text);
  const score = calculateDifficultyScore(features);

  if (score <= 35) return 'easy';
  if (score <= 65) return 'standard';
  return 'hard';
}

function extractFeatures(text: string): DifficultyFeatures {
  return {
    sectionBoundaryScore: calculateSectionBoundary(text),
    headerStandardization: calculateHeaderStandardization(text),
    dateFormatConsistency: calculateDateConsistency(text),
    layoutComplexity: calculateLayoutComplexity(text),
    languageMixRatio: calculateLanguageMix(text),
  };
}

function calculateSectionBoundary(text: string): number {
  const standardHeaders = [
    '个人信息', '基本信息', '工作经历', '工作经验', '教育背景',
    '教育经历', '项目经验', '技能', '自我评价'
  ];

  const found = standardHeaders.filter(h => text.includes(h)).length;
  return Math.min(found / 5, 1);
}

function calculateHeaderStandardization(text: string): number {
  const lines = text.split('\n');
  const headerPattern = /^(#{1,3}\s+|【.*?】|[一二三四五六七八九十]+[、．.])/;
  const headerLines = lines.filter(line => headerPattern.test(line.trim())).length;

  return Math.min(headerLines / 8, 1);
}

function calculateDateConsistency(text: string): number {
  const formats = [
    /\d{4}年\d{1,2}月/g,
    /\d{4}[.-]\d{1,2}/g,
    /\d{4}\/\d{1,2}/g,
    /\d{4}\.\d{1,2}/g
  ];

  const counts = formats.map(f => (text.match(f) || []).length);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  const maxCount = Math.max(...counts);
  return maxCount / total;
}

function calculateLayoutComplexity(text: string): number {
  let complexity = 0;

  if (/[│├┤┬┴┼]/.test(text)) complexity += 0.3;
  if (/\t{2,}/.test(text)) complexity += 0.2;

  const lines = text.split('\n');
  const shortLines = lines.filter(l => l.trim().length > 0 && l.trim().length < 20).length;
  if (shortLines / lines.length > 0.4) complexity += 0.3;

  const longParagraphs = lines.filter(l => l.length > 100).length;
  if (longParagraphs > 5) complexity += 0.2;

  return Math.min(complexity, 1);
}

function calculateLanguageMix(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const english = (text.match(/[a-zA-Z]/g) || []).length;

  if (chinese === 0 || english === 0) return 0;

  const ratio = Math.min(chinese, english) / Math.max(chinese, english);
  return ratio > 0.3 ? ratio : 0;
}

function calculateDifficultyScore(features: DifficultyFeatures): number {
  const weights = {
    sectionBoundary: -20,
    headerStandardization: -15,
    dateConsistency: -10,
    layoutComplexity: 25,
    languageMix: 10,
  };

  return 50 +
    features.sectionBoundaryScore * weights.sectionBoundary +
    features.headerStandardization * weights.headerStandardization +
    features.dateFormatConsistency * weights.dateConsistency +
    features.layoutComplexity * weights.layoutComplexity +
    features.languageMixRatio * weights.languageMix;
}

function assessContentCompleteness(text: string): 'basic' | 'complete' | 'rich' {
  const modules = [];

  if (/个人信息|基本信息|姓名|电话|邮箱/.test(text)) modules.push('basics');
  if (/工作经历|工作经验|任职/.test(text)) modules.push('work');
  if (/教育背景|教育经历|学历/.test(text)) modules.push('education');
  if (/技能|专业技能|技术栈/.test(text)) modules.push('skills');
  if (/项目经验|项目经历/.test(text)) modules.push('projects');
  if (/证书|资格证书|认证/.test(text)) modules.push('certificates');
  if (/自我评价|个人评价|简介/.test(text)) modules.push('summary');
  if (/荣誉|奖项|获奖/.test(text)) modules.push('honors');
  if (/语言|外语/.test(text)) modules.push('languages');

  const count = modules.length;
  if (count <= 3) return 'basic';
  if (count <= 6) return 'complete';
  return 'rich';
}

function identifyScenario(text: string): 'fresh' | 'tech' | 'executive' | 'general' {
  const workKeywords = ['工作经历', '工作经验', '任职经历'];
  const internKeywords = ['实习', '实习生'];
  const hasWork = workKeywords.some(k => text.includes(k));
  const hasIntern = internKeywords.some(k => text.includes(k));

  if (!hasWork || (hasWork && hasIntern && !text.substring(0, 500).includes('公司'))) {
    return 'fresh';
  }

  const techSkills = [
    'Python', 'Java', 'JavaScript', 'Go', 'C++', 'Docker',
    'Kubernetes', 'MySQL', 'Redis', 'React', 'Vue', 'Spring', 'Django'
  ];
  const skillCount = techSkills.filter(skill => text.includes(skill)).length;
  const projectCount = (text.match(/项目/g) || []).length;

  if (skillCount >= 5 && projectCount >= 2) return 'tech';

  const workSections = (text.match(/(公司|集团|企业).*?(职位|岗位|总监|经理|主管|VP|CEO|CTO|COO)/g) || []).length;
  if (workSections >= 5) return 'executive';

  return 'general';
}
