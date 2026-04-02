export interface ConfidenceFactors {
  extractionQuality: number;
  validationScore: number;
  structureCompleteness: number;
  semanticConsistency: number;
  attempts: number;
}

export function calculateConfidence(factors: ConfidenceFactors): number {
  const confidence =
    0.3 * factors.extractionQuality +
    0.4 * factors.validationScore +
    0.2 * factors.structureCompleteness +
    0.1 * factors.semanticConsistency -
    0.1 * (factors.attempts - 1);

  return Math.max(0, Math.min(100, confidence));
}

export function assessExtractionQuality(data: any): number {
  let score = 0;

  if (data.basics?.name) score += 30;
  if (data.basics?.phone || data.basics?.email) score += 20;
  if (data.work?.length) score += 25;
  if (data.education?.length) score += 25;

  return score;
}

export function assessStructureCompleteness(data: any): number {
  const modules = [
    data.basics,
    data.work?.length,
    data.education?.length,
    data.skills?.length,
    data.projects?.length
  ];

  const present = modules.filter(Boolean).length;
  return (present / modules.length) * 100;
}

export function assessSemanticConsistency(data: any): number {
  let score = 100;

  data.work?.forEach((w: any) => {
    if (w.startDate && w.endDate && w.startDate > w.endDate) score -= 20;
  });

  data.education?.forEach((e: any) => {
    if (e.startDate && e.endDate && e.startDate > e.endDate) score -= 20;
  });

  return Math.max(0, score);
}
