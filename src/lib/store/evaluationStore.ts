import { create } from 'zustand';
import type { EvaluationResult, EvaluationMetrics } from '../types';

export interface EvaluationTask {
  id: string;
  name: string;
  description?: string;
  type: 'single' | 'batch';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: {
    enableFieldLevel: boolean;
    enableClassification: boolean;
    enableProcessTrace: boolean;
    accuracyMethod: 'exact' | 'partial' | 'semantic';
  };
  stats: {
    totalFiles: number;
    processedFiles: number;
    successCount: number;
    failureCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type { EvaluationResult, EvaluationMetrics };

interface EvaluationState {
  tasks: EvaluationTask[];
  currentTask: EvaluationTask | null;
  results: EvaluationResult[];
  viewMode: 'technical' | 'client';
  isLoading: boolean;
  setTasks: (tasks: EvaluationTask[]) => void;
  setCurrentTask: (task: EvaluationTask | null) => void;
  setResults: (results: EvaluationResult[]) => void;
  setViewMode: (mode: 'technical' | 'client') => void;
  setLoading: (loading: boolean) => void;
}

export const useEvaluationStore = create<EvaluationState>((set) => ({
  tasks: [],
  currentTask: null,
  results: [],
  viewMode: 'technical',
  isLoading: false,
  setTasks: (tasks) => set({ tasks }),
  setCurrentTask: (task) => set({ currentTask: task }),
  setResults: (results) => set({ results }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// ---------------------------------------------------------------------------
// Fine-grained selectors — prevent unnecessary re-renders
// ---------------------------------------------------------------------------
export const useTasks = () => useEvaluationStore(s => s.tasks);
export const useCurrentTask = () => useEvaluationStore(s => s.currentTask);
export const useResults = () => useEvaluationStore(s => s.results);
export const useViewMode = () => useEvaluationStore(s => s.viewMode);
export const useEvalLoading = () => useEvaluationStore(s => s.isLoading);
