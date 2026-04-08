import type { ContentClassification, StructureType, DetailLevel } from '../types';

export type { ContentClassification, StructureType, DetailLevel };

const MODULES = [
  'basicInfo',
  'contact',
  'education',
  'workExperience',
  'projects',
  'skills',
  'certifications',
  'languages',
  'awards',
  'publications',
  'interests',
];

export function classifyContent(data: Record<string, unknown>, text: string): ContentClassification {
  const modules = MODULES.filter(
    (m) => data[m] && (Array.isArray(data[m]) ? data[m].length > 0 : Object.keys(data[m]).length > 0)
  );

  const structure: StructureType = modules.length <= 3 ? 'simple' : modules.length <= 5 ? 'standard' : 'complete';

  const lines = text.split('\n').length;
  const detail: DetailLevel = lines < 50 ? 'brief' : lines <= 150 ? 'normal' : 'detailed';

  return {
    structure,
    detail,
    modules,
    category: `${structure}-${detail}`,
  };
}
