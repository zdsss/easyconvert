import { create } from 'zustand';
import { StageName } from '../processTracer';

export interface FileProcessState {
  file: File;
  currentStage: StageName | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fromCache: boolean;
  error?: string;
}

interface BatchState {
  files: Map<string, FileProcessState>;
  overall: { current: number; total: number };
  concurrency: { active: number; queued: number };
  setFiles: (files: File[]) => void;
  updateFileStage: (fileName: string, stage: StageName, status: 'processing' | 'completed') => void;
  setFileStatus: (fileName: string, status: 'completed' | 'failed', fromCache?: boolean, error?: string) => void;
  updateConcurrency: (active: number, queued: number) => void;
  reset: () => void;
}

export const useBatchStore = create<BatchState>((set) => ({
  files: new Map(),
  overall: { current: 0, total: 0 },
  concurrency: { active: 0, queued: 0 },

  setFiles: (files) => {
    const fileMap = new Map<string, FileProcessState>();
    files.forEach(file => {
      fileMap.set(file.name, {
        file,
        currentStage: null,
        status: 'pending',
        fromCache: false,
      });
    });
    set({ files: fileMap, overall: { current: 0, total: files.length } });
  },

  updateFileStage: (fileName, stage, status) =>
    set((state) => {
      const fileState = state.files.get(fileName);
      if (!fileState) return state;

      const updated = new Map(state.files);
      updated.set(fileName, {
        ...fileState,
        currentStage: stage,
        status: status === 'processing' ? 'processing' : fileState.status,
      });

      return { files: updated };
    }),

  setFileStatus: (fileName, status, fromCache = false, error) =>
    set((state) => {
      const fileState = state.files.get(fileName);
      if (!fileState) return state;

      const updated = new Map(state.files);
      updated.set(fileName, {
        ...fileState,
        status,
        fromCache,
        error,
      });

      const current = status === 'completed' || status === 'failed'
        ? state.overall.current + 1
        : state.overall.current;

      return {
        files: updated,
        overall: { ...state.overall, current }
      };
    }),

  updateConcurrency: (active, queued) =>
    set({ concurrency: { active, queued } }),

  reset: () =>
    set({
      files: new Map(),
      overall: { current: 0, total: 0 },
      concurrency: { active: 0, queued: 0 }
    }),
}));
