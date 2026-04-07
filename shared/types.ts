// ---------------------------------------------------------------------------
// Shared types — the single source of truth for types used by both frontend
// and server.  src/lib/types.ts re-exports these for backward compatibility.
// ---------------------------------------------------------------------------

export interface Resume {
  basics: {
    name: string;
    email: string;
    phone: string;
    title?: string;
    location?: string;
  };
  work: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    responsibilities?: string[];
    achievements?: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    major?: string;
    startDate: string;
    endDate: string;
    courses?: string[];
    honors?: string[];
    gpa?: string;
  }>;
  skills?: string[];
  certificates?: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  projects?: Array<{
    name: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    achievements?: string[];
  }>;
  summary?: string;
  additional?: Record<string, any>;
}

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

// --- Validation types ---

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number;
}
