import { create } from 'zustand';
import { Resume } from '../types';
import { FileClassification } from '../classifiers/classifier';
import { ContentClassification } from '@shared/classifiers/contentClassifier';
import { ValidationResult } from '../validators';
import { StageName, StageStatus } from '../processTracer';

interface StageInfo {
  status: StageStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

interface ProcessState {
  currentStage: StageName | null;
  stages: Record<StageName, StageInfo>;
}

interface State {
  resume: Resume | null;
  setResume: (resume: Resume) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  fileClassification: FileClassification | null;
  setFileClassification: (classification: FileClassification) => void;
  contentClassification: ContentClassification | null;
  setContentClassification: (classification: ContentClassification) => void;
  cacheHit: boolean;
  setCacheHit: (hit: boolean) => void;
  validationResult: ValidationResult | null;
  setValidationResult: (result: ValidationResult) => void;
  processState: ProcessState;
  updateStage: (stage: StageName, status: StageStatus) => void;
  resetProcess: () => void;
}

const initialStages: Record<StageName, StageInfo> = {
  file_upload: { status: 'pending' },
  file_parse: { status: 'pending' },
  difficulty_classify: { status: 'pending' },
  strategy_select: { status: 'pending' },
  llm_extract: { status: 'pending' },
  content_classify: { status: 'pending' },
  validation: { status: 'pending' },
  cache_store: { status: 'pending' },
};

export const useStore = create<State>((set) => ({
  resume: null,
  setResume: (resume) => set({ resume }),
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  fileClassification: null,
  setFileClassification: (classification) => set({ fileClassification: classification }),
  contentClassification: null,
  setContentClassification: (classification) => set({ contentClassification: classification }),
  cacheHit: false,
  setCacheHit: (hit) => set({ cacheHit: hit }),
  validationResult: null,
  setValidationResult: (result) => set({ validationResult: result }),
  processState: {
    currentStage: null,
    stages: { ...initialStages },
  },
  updateStage: (stage, status) =>
    set((state) => {
      const now = Date.now();
      const stageInfo = state.processState.stages[stage];
      const updated: StageInfo = { ...stageInfo, status };

      if (status === 'processing') {
        updated.startTime = now;
      } else if (status === 'completed' || status === 'failed') {
        updated.endTime = now;
        if (updated.startTime) {
          updated.duration = now - updated.startTime;
        }
      }

      return {
        processState: {
          currentStage: status === 'processing' ? stage : state.processState.currentStage,
          stages: { ...state.processState.stages, [stage]: updated },
        },
      };
    }),
  resetProcess: () =>
    set({
      processState: {
        currentStage: null,
        stages: { ...initialStages },
      },
    }),
}));
