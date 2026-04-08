import { describe, it, expect, beforeEach } from 'vitest';
import { useEvaluationStore } from '../evaluationStore';
import type { EvaluationTask } from '../evaluationStore';

const mockTask: EvaluationTask = {
  id: '1',
  name: 'Test Task',
  type: 'batch',
  status: 'pending',
  config: {
    enableFieldLevel: true,
    enableClassification: true,
    enableProcessTrace: false,
    accuracyMethod: 'exact',
  },
  stats: { totalFiles: 10, processedFiles: 0, successCount: 0, failureCount: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('evaluationStore', () => {
  beforeEach(() => {
    useEvaluationStore.setState({
      tasks: [],
      currentTask: null,
      results: [],
      viewMode: 'technical',
      isLoading: false,
    });
  });

  it('initializes with empty state', () => {
    const state = useEvaluationStore.getState();
    expect(state.tasks).toEqual([]);
    expect(state.currentTask).toBeNull();
    expect(state.results).toEqual([]);
    expect(state.viewMode).toBe('technical');
    expect(state.isLoading).toBe(false);
  });

  it('setTasks updates task list', () => {
    useEvaluationStore.getState().setTasks([mockTask]);
    expect(useEvaluationStore.getState().tasks).toHaveLength(1);
    expect(useEvaluationStore.getState().tasks[0].name).toBe('Test Task');
  });

  it('setCurrentTask sets and clears current task', () => {
    useEvaluationStore.getState().setCurrentTask(mockTask);
    expect(useEvaluationStore.getState().currentTask?.id).toBe('1');

    useEvaluationStore.getState().setCurrentTask(null);
    expect(useEvaluationStore.getState().currentTask).toBeNull();
  });

  it('setViewMode toggles between technical and client', () => {
    useEvaluationStore.getState().setViewMode('client');
    expect(useEvaluationStore.getState().viewMode).toBe('client');

    useEvaluationStore.getState().setViewMode('technical');
    expect(useEvaluationStore.getState().viewMode).toBe('technical');
  });

  it('setLoading toggles loading state', () => {
    useEvaluationStore.getState().setLoading(true);
    expect(useEvaluationStore.getState().isLoading).toBe(true);
  });
});
