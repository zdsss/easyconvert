// Re-export shared types (single source of truth lives in shared/types.ts)
export {
  type Resume,
  type StructureType,
  type DetailLevel,
  type ContentClassification,
  type CacheData,
  type ParsingStrategy,
  type ResumeClassification,
  type StageName,
  type ValidationResult,
  TimeoutError,
  ValidationError,
} from '@shared/types';

// Import for local use in frontend-only types below
import type { Resume } from '@shared/types';

// ---------------------------------------------------------------------------
// Frontend-only types (not shared with server)
// ---------------------------------------------------------------------------

export interface EvaluationConfig {
  enableFieldLevel: boolean;
  enableClassification: boolean;
  enableProcessTrace: boolean;
  accuracyMethod: 'exact' | 'partial' | 'semantic';
}

export interface TaskResponse {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  description?: string;
  type?: string;
  config?: EvaluationConfig;
  stats?: {
    totalFiles: number;
    processedFiles: number;
    successCount: number;
    failureCount: number;
  };
  updatedAt?: string;
}

export interface EvaluationMetrics {
  accuracy: number;
  completeness: number;
  structureScore: number;
  fieldMetrics?: Record<string, number>;
}

export interface EvaluationResult {
  id: string;
  taskId?: string;
  fileName: string;
  fileHash: string;
  parsedResume: Resume;
  annotation?: Resume | null;
  classification?: {
    difficulty?: 'easy' | 'standard' | 'hard';
    completeness?: 'basic' | 'complete' | 'rich';
    scenario?: 'fresh' | 'tech' | 'executive' | 'general';
    structure?: 'simple' | 'standard' | 'complete';
    detail?: 'brief' | 'normal' | 'detailed';
    modules?: string[];
    category?: string;
  };
  processTrace?: { stages: Array<{ name: string; status: string; duration?: number; error?: string }>; totalDuration: number };
  metrics: EvaluationMetrics;
  processingTime: number;
  fromCache: boolean;
  createdAt?: Date | string;
  error?: string;
}
