import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock API calls to prevent network requests
vi.mock('@lib/api/parseHistoryApi', () => ({
  parseHistoryApi: {
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    get: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('@lib/api/evaluationApi', () => ({
  evaluationApi: {
    getTasks: vi.fn().mockResolvedValue([]),
    getTask: vi.fn().mockResolvedValue(null),
    createTask: vi.fn(),
    getResults: vi.fn().mockResolvedValue([]),
    saveResult: vi.fn(),
    saveAnnotation: vi.fn(),
    retryFailed: vi.fn(),
  },
}));

vi.mock('@lib/api/apiManagementApi', () => ({
  apiManagementApi: {
    getKeys: vi.fn().mockResolvedValue([]),
    createKey: vi.fn(),
    deleteKey: vi.fn(),
    getUsageStats: vi.fn().mockResolvedValue({ daily: [], summary: {} }),
    getApiOverview: vi.fn().mockResolvedValue({ totalKeys: 0, totalRequests: 0, activeKeys: 0 }),
  },
}));

vi.mock('@lib/core/resumeProcessor', () => ({
  processResume: vi.fn(),
}));

vi.mock('@lib/batchProcessor', () => ({
  processBatch: vi.fn(),
  exportErrors: vi.fn(),
  BatchResult: {},
}));

vi.mock('@lib/classifiers/classifier', () => ({
  classifyFile: vi.fn().mockResolvedValue({ type: 'standard', confidence: 0.9 }),
}));

vi.mock('@lib/metrics', () => ({
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
  getMetrics: vi.fn().mockReturnValue({
    totalRequests: 0, successCount: 0, failureCount: 0, cacheHits: 0,
    avgProcessingTime: 0, successRate: 0, cacheHitRate: 0,
  }),
}));

vi.mock('@lib/cacheAnalyzer', () => ({
  cacheAnalyzer: {
    getStats: vi.fn().mockReturnValue({ hits: 0, misses: 0, totalRequests: 0, hitRate: 0, avgHitTime: 0, avgMissTime: 0 }),
  },
}));

vi.mock('@lib/monitoring/performance', () => ({
  performanceMonitor: {
    getMetrics: vi.fn().mockReturnValue({ p50: 0, p95: 0, p99: 0, count: 0 }),
  },
}));

vi.mock('@lib/cache', () => ({
  hashFile: vi.fn().mockResolvedValue('mock-hash'),
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn(),
}));

vi.mock('@lib/evaluationProcessor', () => ({
  processWithEvaluation: vi.fn(),
}));

vi.mock('@lib/export/reportExporter', () => ({
  generateReport: vi.fn(),
  exportToCSV: vi.fn(),
  exportReportToPdf: vi.fn(),
}));

vi.mock('@lib/monitoring/cost', () => ({
  costTracker: {
    getStats: vi.fn().mockReturnValue({
      calls: 0, tokens: 0, inputTokens: 0, outputTokens: 0,
      inputCost: 0, outputCost: 0, estimatedCost: 0, model: 'qwen-plus',
    }),
  },
}));

vi.mock('@shared/prompts', () => ({
  getPrompt: vi.fn().mockReturnValue('mock prompt'),
}));

vi.mock('@lib/metricsCalculator', () => ({
  analyzeWeakFields: vi.fn().mockReturnValue([]),
  aggregateFieldMetrics: vi.fn().mockReturnValue({}),
}));

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  Legend: () => <div />,
}));

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

function renderWithParams(Page: React.ComponentType, route: string, path: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={<Page />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Page smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch globally for pages that call fetch directly
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });
  });

  // --- Existing tests ---

  it('ParsePage renders without crashing', async () => {
    const { default: ParsePage } = await import('../ParsePage');
    const { container } = renderWithRouter(<ParsePage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('BatchPage renders without crashing', async () => {
    const { default: BatchPage } = await import('../BatchPage');
    const { container } = renderWithRouter(<BatchPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('ParseHistoryPage renders without crashing', async () => {
    const { default: ParseHistoryPage } = await import('../ParseHistoryPage');
    const { container } = renderWithRouter(<ParseHistoryPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  // --- New tests ---

  it('ApiKeys renders without crashing', async () => {
    const { default: ApiKeys } = await import('../ApiKeys');
    const { container } = renderWithRouter(<ApiKeys />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('ApiOverview renders without crashing', async () => {
    const { default: ApiOverview } = await import('../ApiOverview');
    const { container } = renderWithRouter(<ApiOverview />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('ApiUsage renders without crashing', async () => {
    const { default: ApiUsage } = await import('../ApiUsage');
    const { container } = renderWithRouter(<ApiUsage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('DataFlywheel renders without crashing', async () => {
    const { default: DataFlywheel } = await import('../DataFlywheel');
    const { container } = renderWithRouter(<DataFlywheel />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('EvaluationList renders without crashing', async () => {
    const { default: EvaluationList } = await import('../EvaluationList');
    const { container } = renderWithRouter(<EvaluationList />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('EvaluationNew renders without crashing', async () => {
    const { default: EvaluationNew } = await import('../EvaluationNew');
    const { container } = renderWithRouter(<EvaluationNew />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('EvaluationDetail renders without crashing', async () => {
    const { default: EvaluationDetail } = await import('../EvaluationDetail');
    renderWithParams(EvaluationDetail, '/evaluation/test-id', '/evaluation/:id');
    // Just verify no crash — component will show loading/empty state
  });

  it('MonitorPage renders without crashing', async () => {
    const { default: MonitorPage } = await import('../MonitorPage');
    const { container } = renderWithRouter(<MonitorPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('PromptLabPage renders without crashing', async () => {
    const { default: PromptLabPage } = await import('../PromptLabPage');
    const { container } = renderWithRouter(<PromptLabPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('ReportView renders without crashing', async () => {
    const { default: ReportView } = await import('../ReportView');
    renderWithParams(ReportView, '/evaluation/test-id/report', '/evaluation/:id/report');
    // Just verify no crash
  });

  it('TenantPage renders without crashing', async () => {
    const { default: TenantPage } = await import('../TenantPage');
    const { container } = renderWithRouter(<TenantPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
