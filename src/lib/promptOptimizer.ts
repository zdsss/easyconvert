export interface FieldMetric {
  field: string;
  accuracy: number;
  count: number;
}

export function analyzeWeakFields(
  metrics: FieldMetric[],
  threshold = 0.7,
): FieldMetric[] {
  return metrics
    .filter(m => m.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy);
}
