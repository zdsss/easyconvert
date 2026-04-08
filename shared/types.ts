// ---------------------------------------------------------------------------
// Shared types — the single source of truth for types used by both frontend
// and server.  src/lib/types.ts re-exports these for backward compatibility.
//
// Resume type is derived from the Zod schema in shared/validation/schemas.ts.
// ---------------------------------------------------------------------------

import type { ResumeData } from './validation/schemas';

export type Resume = ResumeData;

export type StructureType = 'simple' | 'standard' | 'complete';
export type DetailLevel = 'brief' | 'normal' | 'detailed';

export interface ContentClassification {
  structure: StructureType;
  detail: DetailLevel;
  modules: string[];
  category: string;
}

export interface CacheData {
  resume: Resume;
  contentClass?: ContentClassification;
  timestamp: number;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// --- Parsing strategy types ---

export interface ParsingStrategy {
  timeout: number;
  temperature: number;
  maxRetries: number;
  promptType: 'basic' | 'standard' | 'comprehensive';
  validationLevel: 'basic' | 'standard' | 'strict';
  scenario?: 'fresh' | 'tech' | 'executive' | 'general';
}

export interface ResumeClassification {
  difficulty: 'easy' | 'standard' | 'hard';
  completeness: 'basic' | 'complete' | 'rich';
  scenario: 'fresh' | 'tech' | 'executive' | 'general';
}

// --- Process tracer types ---

export type StageName =
  | 'file_upload'
  | 'file_parse'
  | 'difficulty_classify'
  | 'strategy_select'
  | 'llm_extract'
  | 'content_classify'
  | 'validation'
  | 'cache_store';

export type StageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessStage {
  name: StageName;
  status: StageStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessTrace {
  stages: ProcessStage[];
  totalDuration: number;
}

// --- Validation types ---

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number;
}
