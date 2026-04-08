import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BatchProgress from '../BatchProgress';
import { useBatchStore } from '@lib/store/batchStore';

function createMockFile(name: string): File {
  return new File(['content'], name, { type: 'application/pdf' });
}

describe('BatchProgress', () => {
  beforeEach(() => {
    useBatchStore.getState().reset();
  });

  it('renders overall progress bar', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf'), createMockFile('b.pdf')]);
    render(<BatchProgress />);
    expect(screen.getByText('总进度: 0/2')).toBeDefined();
  });

  it('shows file names in the list', () => {
    useBatchStore.getState().setFiles([createMockFile('resume1.pdf'), createMockFile('resume2.pdf')]);
    render(<BatchProgress />);
    expect(screen.getByText('resume1.pdf')).toBeDefined();
    expect(screen.getByText('resume2.pdf')).toBeDefined();
  });

  it('shows concurrency info', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf')]);
    useBatchStore.getState().updateConcurrency(2, 3);
    render(<BatchProgress />);
    expect(screen.getByText('并发: 2 处理中 / 3 等待中')).toBeDefined();
  });

  it('shows completed status for finished files', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf')]);
    useBatchStore.getState().setFileStatus('a.pdf', 'completed');
    render(<BatchProgress />);
    expect(screen.getByText('总进度: 1/1')).toBeDefined();
  });

  it('shows error message for failed files', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf')]);
    useBatchStore.getState().setFileStatus('a.pdf', 'failed', false, 'Timeout error');
    render(<BatchProgress />);
    expect(screen.getByText('Timeout error')).toBeDefined();
  });
});
