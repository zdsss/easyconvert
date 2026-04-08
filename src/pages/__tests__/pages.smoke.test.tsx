import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
}));

vi.mock('@lib/cache', () => ({
  hashFile: vi.fn().mockResolvedValue('mock-hash'),
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn(),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Page smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});
