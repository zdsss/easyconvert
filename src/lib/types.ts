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

export interface TaskResponse {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  description?: string;
  type?: string;
  config?: Record<string, unknown>;
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
}

export interface EvaluationResult {
  id: string;
  taskId?: string;
  fileName: string;
  fileHash: string;
  parsedResume: Resume;
  annotation?: Resume | null;
  classification?: {
    difficulty: 'easy' | 'standard' | 'hard';
    completeness: 'basic' | 'complete' | 'rich';
    scenario: 'fresh' | 'tech' | 'executive' | 'general';
  };
  processTrace?: any;
  metrics: EvaluationMetrics;
  processingTime: number;
  fromCache: boolean;
  createdAt?: Date | string;
  error?: string;
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
