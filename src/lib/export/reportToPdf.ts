import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface TrendPoint { date: string; accuracy: number; count: number; }
interface Distribution { difficulty: Record<string, number>; completeness: Record<string, number>; scenario: Record<string, number>; }
interface CostData { totalFiles: number; cachedFiles: number; totalTokens: number; estimatedCost: number; avgTokensPerFile: number; avgProcessingTime: number; }
interface ErrorPattern { field: string; count: number; type: string; }

export interface ReportPdfData {
  trends: TrendPoint[];
  distribution: Distribution | null;
  errors: ErrorPattern[];
  cost: CostData | null;
  fieldAccuracy: Record<string, { accuracy: number; matchType: string }>;
}

export function exportReportToPdf(data: ReportPdfData): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('zh-CN');
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.text(`评测报告 - ${now}`, 14, y);
  y += 14;

  // Summary metrics table
  if (data.cost) {
    doc.setFontSize(13);
    doc.text('成本概览', 14, y);
    y += 4;

    (doc as any).autoTable({
      startY: y,
      head: [['指标', '值']],
      body: [
        ['总文件数', String(data.cost.totalFiles)],
        ['缓存命中', String(data.cost.cachedFiles)],
        ['总 Token', data.cost.totalTokens.toLocaleString()],
        ['预估成本', `¥${data.cost.estimatedCost.toFixed(6)}`],
        ['平均 Token/文件', data.cost.avgTokensPerFile.toLocaleString()],
        ['平均处理时间', `${(data.cost.avgProcessingTime / 1000).toFixed(2)}s`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Field accuracy table
  const fieldEntries = Object.entries(data.fieldAccuracy);
  if (fieldEntries.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.text('字段准确率', 14, y);
    y += 4;

    (doc as any).autoTable({
      startY: y,
      head: [['字段', '准确率', '匹配类型']],
      body: fieldEntries.map(([field, info]) => [
        field,
        `${(info.accuracy * 100).toFixed(1)}%`,
        info.matchType,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Error patterns table
  if (data.errors.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.text('错误模式分析', 14, y);
    y += 4;

    const maxCount = data.errors[0]?.count || 1;
    (doc as any).autoTable({
      startY: y,
      head: [['字段', '缺失次数', '类型', '占比']],
      body: data.errors.map(e => [
        e.field,
        String(e.count),
        e.type,
        `${((e.count / maxCount) * 100).toFixed(0)}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Distribution summary
  if (data.distribution) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.text('分布分析', 14, y);
    y += 4;

    const distSections: [string, Record<string, number>][] = [
      ['难度分布', data.distribution.difficulty],
      ['完整度分布', data.distribution.completeness],
      ['场景分布', data.distribution.scenario],
    ];

    for (const [title, dist] of distSections) {
      if (y > 260) { doc.addPage(); y = 20; }

      (doc as any).autoTable({
        startY: y,
        head: [[title, '数量']],
        body: Object.entries(dist).map(([k, v]) => [k, String(v)]),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 10 },
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Trends summary
  if (data.trends.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.text('趋势数据', 14, y);
    y += 4;

    (doc as any).autoTable({
      startY: y,
      head: [['日期', '准确率', '文件数']],
      body: data.trends.map(t => [
        t.date,
        `${(t.accuracy * 100).toFixed(1)}%`,
        String(t.count),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
    });
  }

  doc.save('evaluation-report.pdf');
}
