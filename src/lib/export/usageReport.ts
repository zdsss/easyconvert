interface UsageData {
  requestsByDay?: Array<{ date: string; count: number }>;
  requestsByEndpoint?: Array<{ endpoint: string; count: number; avgLatency: number }>;
  totalRequests?: number;
  successRate?: number;
  avgLatency?: number;
  totalTokens?: number;
}

export function buildUsageCSV(usage: UsageData, days: number): string {
  const lines: string[] = [];

  lines.push('用量统计报表');
  lines.push(`时间范围,最近 ${days} 天`);
  lines.push('');

  // Daily requests
  lines.push('日期,请求数');
  if (usage.requestsByDay?.length) {
    for (const d of usage.requestsByDay) {
      lines.push(`${d.date},${d.count}`);
    }
  }
  lines.push('');

  // Endpoint stats
  lines.push('端点,请求数,平均延迟(ms)');
  if (usage.requestsByEndpoint?.length) {
    for (const e of usage.requestsByEndpoint) {
      lines.push(`${e.endpoint},${e.count},${e.avgLatency}`);
    }
  }
  lines.push('');

  // Summary
  lines.push('汇总指标,值');
  lines.push(`总请求数,${usage.totalRequests ?? 0}`);
  lines.push(`成功率,${(usage.successRate ?? 0).toFixed(1)}%`);
  lines.push(`平均延迟,${(usage.avgLatency ?? 0).toFixed(0)}ms`);
  lines.push(`总 Token,${usage.totalTokens ?? 0}`);

  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
