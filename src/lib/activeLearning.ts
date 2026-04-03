export interface LearningCandidate {
  id: string;
  fileName: string;
  avgConfidence: number;
  language?: string;
}

export interface ParseHistoryItem {
  id: string;
  file_name: string;
  result?: {
    additional?: {
      _confidence?: Record<string, number>;
      language?: string;
    };
  };
}

function calcAvgConfidence(confidence: Record<string, number> | undefined): number {
  if (!confidence) return 0;
  const values = Object.values(confidence).filter(v => typeof v === 'number');
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function filterCandidates(
  items: ParseHistoryItem[],
  evaluatedIds: Set<string>,
  threshold = 0.75,
): LearningCandidate[] {
  return items
    .map(item => ({
      id: item.id,
      fileName: item.file_name,
      avgConfidence: calcAvgConfidence(item.result?.additional?._confidence),
      language: item.result?.additional?.language,
    }))
    .filter(c => c.avgConfidence < threshold && !evaluatedIds.has(c.id))
    .sort((a, b) => a.avgConfidence - b.avgConfidence);
}
