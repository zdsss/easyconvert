import { promptEngine } from './prompts/promptEngine';

export type PromptType = 'basic' | 'standard' | 'comprehensive';
export type Scenario = 'fresh' | 'tech' | 'executive' | 'general';

export function getPrompt(
  type: PromptType,
  scenario: Scenario = 'general',
  schema?: string,
  language: 'zh' | 'en' | 'ja' = 'zh',
): string {
  const langInstructions: Record<string, string> = {
    en: `\nIMPORTANT: This is an English resume. Extract all fields in their original English form. Date formats may be MM/YYYY or Month YYYY. Job titles use English conventions.`,
    ja: `\n重要：これは日本語の履歴書/職務経歴書です。生年月日、学歴、職歴の形式に従って抽出してください。日本の日付形式（YYYY年MM月）に対応してください。`,
    zh: '',
  };

  const basePrompt = promptEngine.buildPrompt(type, scenario, schema);
  return basePrompt + (langInstructions[language] || '');
}
