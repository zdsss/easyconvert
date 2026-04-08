import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../parseStore';

describe('parseStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStore.getState().resetProcess();
    useStore.setState({ resume: null, isLoading: false, cacheHit: false, validationResult: null });
  });

  it('initializes with null resume and all stages pending', () => {
    const state = useStore.getState();
    expect(state.resume).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.processState.currentStage).toBeNull();
    expect(state.processState.stages.file_upload.status).toBe('pending');
    expect(state.processState.stages.llm_extract.status).toBe('pending');
  });

  it('setResume updates resume', () => {
    const resume = { basics: { name: 'Test', email: 'a@b.com', phone: '123' }, work: [], education: [] };
    useStore.getState().setResume(resume);
    expect(useStore.getState().resume).toEqual(resume);
  });

  it('setLoading toggles loading state', () => {
    useStore.getState().setLoading(true);
    expect(useStore.getState().isLoading).toBe(true);
    useStore.getState().setLoading(false);
    expect(useStore.getState().isLoading).toBe(false);
  });

  it('updateStage sets processing with startTime and currentStage', () => {
    useStore.getState().updateStage('file_upload', 'processing');
    const state = useStore.getState();
    expect(state.processState.currentStage).toBe('file_upload');
    expect(state.processState.stages.file_upload.status).toBe('processing');
    expect(state.processState.stages.file_upload.startTime).toBeDefined();
  });

  it('updateStage sets completed with duration', () => {
    useStore.getState().updateStage('file_upload', 'processing');
    useStore.getState().updateStage('file_upload', 'completed');
    const stage = useStore.getState().processState.stages.file_upload;
    expect(stage.status).toBe('completed');
    expect(stage.endTime).toBeDefined();
    expect(stage.duration).toBeDefined();
  });

  it('updateStage sets failed with duration', () => {
    useStore.getState().updateStage('llm_extract', 'processing');
    useStore.getState().updateStage('llm_extract', 'failed');
    const stage = useStore.getState().processState.stages.llm_extract;
    expect(stage.status).toBe('failed');
    expect(stage.endTime).toBeDefined();
  });

  it('resetProcess restores all stages to pending', () => {
    useStore.getState().updateStage('file_upload', 'completed');
    useStore.getState().updateStage('file_parse', 'processing');
    useStore.getState().resetProcess();
    const state = useStore.getState();
    expect(state.processState.currentStage).toBeNull();
    expect(state.processState.stages.file_upload.status).toBe('pending');
    expect(state.processState.stages.file_parse.status).toBe('pending');
  });

  it('setCacheHit updates cache hit state', () => {
    useStore.getState().setCacheHit(true);
    expect(useStore.getState().cacheHit).toBe(true);
  });

  it('setValidationResult updates validation', () => {
    const result = { isValid: true, errors: [], warnings: [], completeness: 100 };
    useStore.getState().setValidationResult(result);
    expect(useStore.getState().validationResult).toEqual(result);
  });
});
