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

const STRATEGY_MATRIX: Record<string, Record<string, ParsingStrategy>> = {
  easy: {
    basic:    { timeout: 20000, temperature: 0.3, maxRetries: 1, promptType: 'basic',         validationLevel: 'standard' },
    complete: { timeout: 30000, temperature: 0.3, maxRetries: 2, promptType: 'standard',      validationLevel: 'standard' },
    rich:     { timeout: 40000, temperature: 0.4, maxRetries: 2, promptType: 'comprehensive', validationLevel: 'strict'   }
  },
  standard: {
    basic:    { timeout: 30000, temperature: 0.4, maxRetries: 2, promptType: 'standard',      validationLevel: 'standard' },
    complete: { timeout: 45000, temperature: 0.4, maxRetries: 2, promptType: 'comprehensive', validationLevel: 'strict'   },
    rich:     { timeout: 60000, temperature: 0.5, maxRetries: 3, promptType: 'comprehensive', validationLevel: 'strict'   }
  },
  hard: {
    basic:    { timeout: 45000,  temperature: 0.5, maxRetries: 3, promptType: 'comprehensive', validationLevel: 'strict' },
    complete: { timeout: 60000,  temperature: 0.5, maxRetries: 3, promptType: 'comprehensive', validationLevel: 'strict' },
    rich:     { timeout: 90000,  temperature: 0.5, maxRetries: 4, promptType: 'comprehensive', validationLevel: 'strict' }
  }
};

const SCENARIO_ADJUSTMENTS: Record<string, Partial<ParsingStrategy>> = {
  fresh: { temperature: 0.1 },
  tech: { timeout: 5000 },
  executive: { temperature: 0.1 }
};

export function getStrategy(classification: ResumeClassification): ParsingStrategy {
  const base = STRATEGY_MATRIX[classification.difficulty][classification.completeness];
  const adj = SCENARIO_ADJUSTMENTS[classification.scenario] || {};

  return {
    ...base,
    timeout: base.timeout + (adj.timeout || 0),
    temperature: Math.min(1.0, base.temperature + (adj.temperature || 0)),
    maxRetries: adj.maxRetries || base.maxRetries,
    promptType: adj.promptType || base.promptType,
    validationLevel: adj.validationLevel || base.validationLevel,
    scenario: classification.scenario
  };
}
