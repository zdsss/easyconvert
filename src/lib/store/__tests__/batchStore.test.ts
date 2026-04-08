import { describe, it, expect, beforeEach } from 'vitest';
import { useBatchStore } from '../batchStore';

function createMockFile(name: string): File {
  return new File(['content'], name, { type: 'application/pdf' });
}

describe('batchStore', () => {
  beforeEach(() => {
    useBatchStore.getState().reset();
  });

  it('initializes with empty state', () => {
    const state = useBatchStore.getState();
    expect(state.files.size).toBe(0);
    expect(state.overall).toEqual({ current: 0, total: 0 });
    expect(state.concurrency).toEqual({ active: 0, queued: 0 });
  });

  it('setFiles populates file map and sets total', () => {
    const files = [createMockFile('a.pdf'), createMockFile('b.pdf')];
    useBatchStore.getState().setFiles(files);
    const state = useBatchStore.getState();
    expect(state.files.size).toBe(2);
    expect(state.overall.total).toBe(2);
    expect(state.overall.current).toBe(0);
    expect(state.files.get('a.pdf')?.status).toBe('pending');
  });

  it('updateFileStage sets stage and processing status', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf')]);
    useBatchStore.getState().updateFileStage('a.pdf', 'llm_extract', 'processing');
    const file = useBatchStore.getState().files.get('a.pdf');
    expect(file?.currentStage).toBe('llm_extract');
    expect(file?.status).toBe('processing');
  });

  it('updateFileStage ignores unknown files', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf')]);
    useBatchStore.getState().updateFileStage('unknown.pdf', 'file_upload', 'processing');
    expect(useBatchStore.getState().files.size).toBe(1);
  });

  it('setFileStatus marks completed and increments current', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf'), createMockFile('b.pdf')]);
    useBatchStore.getState().setFileStatus('a.pdf', 'completed', true);
    const state = useBatchStore.getState();
    expect(state.files.get('a.pdf')?.status).toBe('completed');
    expect(state.files.get('a.pdf')?.fromCache).toBe(true);
    expect(state.overall.current).toBe(1);
  });

  it('setFileStatus marks failed with error', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf')]);
    useBatchStore.getState().setFileStatus('a.pdf', 'failed', false, 'Timeout');
    const file = useBatchStore.getState().files.get('a.pdf');
    expect(file?.status).toBe('failed');
    expect(file?.error).toBe('Timeout');
    expect(useBatchStore.getState().overall.current).toBe(1);
  });

  it('updateConcurrency sets active and queued', () => {
    useBatchStore.getState().updateConcurrency(3, 5);
    expect(useBatchStore.getState().concurrency).toEqual({ active: 3, queued: 5 });
  });

  it('reset clears all state', () => {
    useBatchStore.getState().setFiles([createMockFile('a.pdf')]);
    useBatchStore.getState().setFileStatus('a.pdf', 'completed');
    useBatchStore.getState().reset();
    const state = useBatchStore.getState();
    expect(state.files.size).toBe(0);
    expect(state.overall).toEqual({ current: 0, total: 0 });
  });
});
