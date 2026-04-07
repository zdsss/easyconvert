import type { Resume, StageName } from './types';

export type { Resume, StageName };

// ---------------------------------------------------------------------------
// Adapter interface — each environment (frontend / server) provides its own
// ---------------------------------------------------------------------------
export interface PipelineAdapter {
  hashFile(): Promise<string> | string;
  getCached(hash: string): Promise<{ resume: Resume; contentClass?: any } | null>;
  setCache(hash: string, data: { resume: Resume; contentClass?: any; timestamp: number }): Promise<void>;
  parseText(fileName: string): Promise<string>;
  extractResume(text: string, strategy: any): Promise<Resume>;
  classifyResume(text: string): any;
  getStrategy(classification: any): any;
  classifyContent(resume: Resume, text: string): any;
  validateWithZod(resume: Resume, level: 'basic' | 'standard' | 'strict'): any;
  runWithLimit<T>(fn: () => Promise<T>): Promise<T>;
  // Optional hooks
  onCacheHit?(cacheTime: number): void;
  onCacheMiss?(cacheTime: number): void;
  onComplete?(time: number, fromCache: boolean): void;
  onResumeExtracted?(resume: Resume): { duplicate: boolean; existingId?: string } | null;
  log?(level: string, msg: string, meta?: any): void;
}

export interface PipelineOptions {
  enableCache?: boolean;
  enableClassification?: boolean;
  enableValidation?: boolean;
  onStageComplete?: (stage: StageName, data?: any) => void;
}

export interface PipelineResult {
  resume: Resume;
  classification?: any;
  difficultyClass?: string;
  fromCache: boolean;
  hash: string;
  validation?: any;
  attempts?: number;
  finalStrategy?: string;
  duplicate?: boolean;
  existingId?: string;
}

// ---------------------------------------------------------------------------
// Core pipeline — called by both frontend and server adapters
// ---------------------------------------------------------------------------
export async function runPipeline(
  adapter: PipelineAdapter,
  fileName: string,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const { enableCache = true, enableClassification = true, enableValidation = true, onStageComplete } = options;

  const startTime = Date.now();
  onStageComplete?.('file_upload');

  // Stage 1: Hash
  const hash = await adapter.hashFile();
  adapter.log?.('debug', 'File hash computed', { hash, fileName });

  // Stage 2: Cache check
  if (enableCache) {
    const cacheStart = Date.now();
    const cached = await adapter.getCached(hash);
    const cacheTime = Date.now() - cacheStart;

    if (cached) {
      adapter.onCacheHit?.(cacheTime);
      adapter.log?.('debug', 'Cache lookup', { result: 'HIT', hash, time: cacheTime });
      onStageComplete?.('file_parse');
      onStageComplete?.('difficulty_classify');
      onStageComplete?.('strategy_select');
      onStageComplete?.('llm_extract');
      onStageComplete?.('content_classify');
      onStageComplete?.('validation');
      onStageComplete?.('cache_store');
      adapter.onComplete?.(Date.now() - startTime, true);
      return {
        resume: cached.resume,
        classification: cached.contentClass,
        fromCache: true,
        hash,
      };
    }
    adapter.onCacheMiss?.(cacheTime);
    adapter.log?.('debug', 'Cache lookup', { result: 'MISS', hash, time: cacheTime });
  }

  // Stage 3: Parse file
  onStageComplete?.('file_parse');
  const text = await adapter.parseText(fileName);

  // Stage 4: Classify difficulty
  onStageComplete?.('difficulty_classify');
  const difficultyClass = adapter.classifyResume(text);

  // Stage 5: Select strategy
  onStageComplete?.('strategy_select');
  const strategy = adapter.getStrategy(difficultyClass);

  // Stage 6: Extract with LLM
  onStageComplete?.('llm_extract');
  const resume = await adapter.runWithLimit(() => adapter.extractResume(text, strategy));

  // Optional: Dedup check (server only)
  if (adapter.onResumeExtracted) {
    const dedup = adapter.onResumeExtracted(resume);
    if (dedup?.duplicate) {
      return { resume, fromCache: false, hash, duplicate: true, existingId: dedup.existingId };
    }
  }

  // Stage 7: Classify content
  let classification;
  if (enableClassification) {
    onStageComplete?.('content_classify');
    classification = adapter.classifyContent(resume, text);
  }

  // Stage 8: Validate
  let validation;
  if (enableValidation) {
    onStageComplete?.('validation');
    validation = adapter.validateWithZod(resume, strategy.validationLevel);
  }

  // Stage 9: Cache store
  if (enableCache && (!enableValidation || validation?.isValid)) {
    onStageComplete?.('cache_store');
    await adapter.setCache(hash, { resume, contentClass: classification, timestamp: Date.now() });
  }

  adapter.onComplete?.(Date.now() - startTime, false);
  adapter.log?.('info', 'Resume processed', {
    fileName,
    hash,
    difficulty: difficultyClass.difficulty,
    time: Date.now() - startTime,
  });

  return {
    resume,
    classification,
    difficultyClass: difficultyClass.difficulty,
    fromCache: false,
    hash,
    validation,
  };
}
