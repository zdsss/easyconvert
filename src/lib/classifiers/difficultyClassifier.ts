import { ResumeClassification } from '../parsingStrategy';
import { DIFFICULTY_THRESHOLDS, MODULE_COUNT_THRESHOLDS } from '../constants';

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
  if (count <= MODULE_COUNT_THRESHOLDS.SIMPLE) return 'basic';
  if (count <= MODULE_COUNT_THRESHOLDS.STANDARD) return 'complete';
  return 'rich';
}

function identifyScenario(text: string): 'fresh' | 'tech' | 'executive' | 'general' {
  const workKeywords = ['工作经历', '工作经验', '任职经历'];
  const internKeywords = ['实习', '实习生'];
  const hasWork = workKeywords.some((k) => text.includes(k));
  const hasIntern = internKeywords.some((k) => text.includes(k));

  if (!hasWork || (hasWork && hasIntern && !text.substring(0, 500).includes('公司'))) {
    return 'fresh';
  }

  const techSkills = [
    'Python',
    'Java',
    'JavaScript',
    'Go',
    'C++',
    'Docker',
    'Kubernetes',
    'MySQL',
    'Redis',
    'React',
    'Vue',
    'Spring',
    'Django',
  ];
  const skillCount = techSkills.filter((skill) => text.includes(skill)).length;
  const projectCount = (text.match(/项目/g) || []).length;

  if (skillCount >= 5 && projectCount >= 2) return 'tech';

  const workSections = (text.match(/(公司|集团|企业).*?(职位|岗位|总监|经理|主管|VP|CEO|CTO|COO)/g) || []).length;
  if (workSections >= 5) return 'executive';

  return 'general';
}
