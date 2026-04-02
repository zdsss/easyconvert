import type { Resume } from './types';

export interface FieldMetric {
  accuracy: number;
  matchType: 'exact' | 'partial' | 'semantic' | 'missing' | 'incorrect';
  expected?: any;
  actual?: any;
  similarity?: number;
}

export interface EvaluationMetrics {
  overall: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  fieldLevel?: Record<string, FieldMetric>;
  byClassification?: {
    difficulty: Record<string, number>;
    completeness: Record<string, number>;
    scenario: Record<string, number>;
  };
  completeness: {
    score: number;
    missingFields: string[];
    extraFields: string[];
  };
}

function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function getAllFieldPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = [];

  for (const key in obj) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getAllFieldPaths(value, path));
    } else {
      paths.push(path);
    }
  }

  return paths;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const distance = levenshteinDistance(String(a), String(b));
  const maxLen = Math.max(String(a).length, String(b).length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export function calculateFieldLevelAccuracy(
  expected: Resume,
  actual: Resume,
  method: 'exact' | 'partial' = 'exact'
): Record<string, FieldMetric> {
  const results: Record<string, FieldMetric> = {};
  const paths = getAllFieldPaths(expected);

  for (const path of paths) {
    const expectedValue = getValueByPath(expected, path);
    const actualValue = getValueByPath(actual, path);

    let matchType: FieldMetric['matchType'];
    let similarity = 0;

    if (!actualValue) {
      matchType = 'missing';
    } else if (method === 'exact') {
      matchType = JSON.stringify(expectedValue) === JSON.stringify(actualValue) ? 'exact' : 'incorrect';
      similarity = matchType === 'exact' ? 1 : 0;
    } else {
      similarity = levenshteinSimilarity(String(expectedValue), String(actualValue));
      matchType = similarity >= 0.8 ? 'partial' : 'incorrect';
    }

    results[path] = {
      accuracy: similarity * 100,
      matchType,
      expected: expectedValue,
      actual: actualValue,
      similarity
    };
  }

  return results;
}

export function calculateOverallAccuracy(
  expected: Resume,
  actual: Resume,
  method: 'exact' | 'partial' = 'exact'
): EvaluationMetrics['overall'] {
  const fieldMetrics = calculateFieldLevelAccuracy(expected, actual, method);
  const values = Object.values(fieldMetrics);

  const totalFields = values.length;
  const matchedFields = values.filter(m => m.matchType === 'exact' || m.matchType === 'partial').length;
  const accuracy = totalFields > 0 ? (matchedFields / totalFields) * 100 : 0;

  const truePositives = values.filter(m => m.matchType === 'exact' || m.matchType === 'partial').length;
  const falsePositives = values.filter(m => m.matchType === 'incorrect').length;
  const falseNegatives = values.filter(m => m.matchType === 'missing').length;

  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return {
    accuracy,
    precision: precision * 100,
    recall: recall * 100,
    f1Score: f1Score * 100
  };
}

export function calculateCompleteness(expected: Resume, actual: Resume) {
  const expectedPaths = getAllFieldPaths(expected);
  const actualPaths = getAllFieldPaths(actual);

  const missingFields = expectedPaths.filter(p => !actualPaths.includes(p));
  const extraFields = actualPaths.filter(p => !expectedPaths.includes(p));

  const score = expectedPaths.length > 0
    ? ((expectedPaths.length - missingFields.length) / expectedPaths.length) * 100
    : 0;

  return { score, missingFields, extraFields };
}

export function calculateMetrics(
  expected: Resume,
  actual: Resume,
  method: 'exact' | 'partial' = 'exact'
): EvaluationMetrics {
  return {
    overall: calculateOverallAccuracy(expected, actual, method),
    fieldLevel: calculateFieldLevelAccuracy(expected, actual, method),
    completeness: calculateCompleteness(expected, actual)
  };
}
